import "server-only";

// Plain serializable values shared by server-side reads and Server Actions.
// JSON normalization keeps PostgreSQL dates consistent with the existing UI.
export function result<T>(data: T, options: { status?: number; headers?: Record<string, string> } = {}) {
  const status = options.status ?? 200;
  return { ok: status >= 200 && status < 300, status, data: JSON.parse(JSON.stringify(data)) };
}
