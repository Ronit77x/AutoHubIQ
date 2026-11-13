# AutoHubIQ

AutoHubIQ is a used-car marketplace and dealer analytics application built with
Next.js, TypeScript, PostgreSQL, and pgvector. Shoppers can browse and filter
active listings or search using natural-language descriptions. Dealers can
publish and maintain their inventory after verification, and administrators can
review dealer applications.

## Requirements

- Node.js 22 or newer
- PostgreSQL with the `vector` extension available
- A database containing the AutoHubIQ `app` schema

## Local setup

From this directory:

```powershell
npm ci
```

Create or edit `frontend/.env.local` without replacing any existing database
settings. Set:

```text
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/AutoHubIQ
AUTH_SECRET=<a random secret with at least 32 characters>
```

Generate a secret locally, then copy its output into `.env.local`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Never commit `.env.local` or share its contents. An example file is provided at
`.env.example`.

If configuring a new database, apply the SQL files in `../database/schema` in
numeric order, then apply the applicable seed files in `../database/seed` in
numeric order. The vector schema requires PostgreSQL's `vector` extension.
Existing databases should be inspected first; these scripts are intended to
preserve existing records and should not be used as a substitute for a backup.

Start the app:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Account and role workflows

- Customers and dealers register at `/account`. Passwords are stored as salted
  scrypt hashes. Session cookies are signed, `HttpOnly`, `SameSite=Lax`, and
  expire after seven days.
- Dealer accounts are created as `pending`. They can sign in and view the
  dealer workspace at `/dealer`, but publishing inventory requires an
  administrator to verify the dealership.
- Verified dealers can publish catalogue-backed vehicles, update asking
  prices, and change listing status. New listings also receive a local
  semantic-search embedding. Seller asking prices remain separate from any
  market estimates.
- Administrators review dealership applications at `/admin`. Public sign-up
  cannot create an administrator account. A trusted database administrator
  must grant the `admin` role after independently verifying the account; there
  is no default admin account or automatic promotion.
- Demo dealer seed users have placeholder, non-login password values and are
  not credentials for the application.

## Semantic vehicle search

Search uses the `onnx-community/all-MiniLM-L6-v2-ONNX` model through
Transformers.js and PostgreSQL `pgvector`. Embeddings are 384-dimensional and
normalized. The model runs locally after its model files are downloaded the
first time; the database connection remains local to the configured
`DATABASE_URL`.

Apply `../database/schema/15_create_listing_embeddings.sql` if the embedding
table is not present. To backfill or refresh embeddings for all active listings:

```powershell
npm run db:embed
```

The backfill updates an embedding only when its source text or model changes.

## API overview

- `GET /api/cities` — active cities
- `GET /api/listings?city_id=<id>` — public active listings in a city
- `GET /api/listings/<listingId>` — public active listing details
- `POST /api/search` — semantic search with structured filters
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me` — account and session operations
- `GET /api/dealer/dashboard`, `GET /api/dealer/catalog`,
  `POST /api/dealer/listings`, `PATCH /api/dealer/listings/<listingId>` —
  authenticated dealer operations
- `GET /api/admin/dealers`, `PATCH /api/admin/dealers` — administrator-only
  dealership review

Database writes use parameterized queries. Role and account status are checked
on the server for protected operations; the UI is not an authorization
boundary.

## Validation

Run the TypeScript checks, lint, focused auth tests, and production build:

```powershell
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run build
```

`npm test` covers password hashing and signed-session validation without
connecting to or changing the configured database. Exercise account
registration, dealer verification, and marketplace APIs only against a
dedicated test database before deployment.
