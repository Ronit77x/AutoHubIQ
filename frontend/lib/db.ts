
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient, type QueryResultRow, type QueryResult } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env.local");
}

const globalForPostgres = globalThis as unknown as {
  restrictedPostgresPool?: Pool;
  restrictedPostgresUrl?: string;
};
const rawPool =
  (globalForPostgres.restrictedPostgresUrl === connectionString ? globalForPostgres.restrictedPostgresPool : undefined) ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.restrictedPostgresPool = rawPool;
  globalForPostgres.restrictedPostgresUrl = connectionString;
}

const requestIdentity = new AsyncLocalStorage<{ userId: string | null }>();
const checkedClients = new WeakSet<PoolClient>();

// Each server-side operation starts anonymous. Identity is set only after a signed
// session has been verified, never from a request body/header/user-supplied role.
export function withDatabaseContext<A extends unknown[], R>(handler: (...args: A) => Promise<R>) {
  return (...args: A): Promise<R> => requestIdentity.run({ userId: null }, () => handler(...args));
}

export function setDatabaseIdentity(userId: string | null) {
  const context = requestIdentity.getStore();
  if (!context) throw new Error("Database access requires a request context");
  if (userId !== null && !/^[1-9]\d*$/.test(userId)) throw new Error("Invalid database identity");
  context.userId = userId;
}

async function acquire() {
  if (!requestIdentity.getStore()) throw new Error("Database access requires a request context");
  const client = await rawPool.connect();
  try {
    if (!checkedClients.has(client)) {
      const result = await client.query<{ unsafe: boolean }>(`
        SELECT r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole
          OR NOT pg_has_role(current_user, 'autohubiq_runtime', 'member')
          OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                    WHERE n.nspname='app' AND pg_has_role(current_user,c.relowner,'USAGE')) AS unsafe
        FROM pg_roles r WHERE r.rolname=current_user`);
      if (result.rows[0]?.unsafe !== false) {
        throw new Error("DATABASE_URL must use a restricted runtime login; run npm run db:security with DATABASE_ADMIN_URL configured");
      }
      checkedClients.add(client);
    }
    return client;
  } catch (error) { client.release(true); throw error; }
}

async function applyIdentity(client: PoolClient) {
  // SET LOCAL disappears on commit/rollback, preventing identity leaks when a
  // pooled connection is subsequently used by another request.
  await client.query("SELECT set_config('app.user_id', $1, true)", [requestIdentity.getStore()!.userId ?? ""]);
}

export const pool = {
  async query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
    const client = await acquire();
    try {
      await client.query("BEGIN");
      await applyIdentity(client);
      const result = await client.query<R>(text, values);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally { client.release(); }
  },
  async connect() {
    const client = await acquire();
    let transaction = false;
    return {
      async query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
        if (/^\s*BEGIN\b/i.test(text)) {
          const result = await client.query<R>(text, values);
          transaction = true;
          await applyIdentity(client);
          return result;
        }
        if (!transaction && !/^\s*ROLLBACK\b/i.test(text)) throw new Error("Explicit transaction required");
        const result = await client.query<R>(text, values);
        if (/^\s*(COMMIT|ROLLBACK)\b/i.test(text)) transaction = false;
        return result;
      },
      release() {
        // Destroy an accidentally unfinished transaction instead of returning
        // a dirty connection to the pool.
        client.release(transaction);
      },
    };
  },
};
