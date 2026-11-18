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

## College-demo quick start

The existing local database has been configured with authentication, semantic
search tables, 12 listing embeddings, and a local demo administrator. Its
generated login is in the ignored `frontend/.demo-credentials.txt` file. Open
that file locally; do not commit or share it. Sign in at `/account` to access
`/admin`. The `.test` email address is a demo identifier and receives no email.

From `frontend`, start the project with:

```powershell
npm.cmd run dev
```

On another development checkout with the core database already populated:

```powershell
npm.cmd install
npm.cmd run setup:local
npm.cmd run db:embed
npm.cmd run demo:admin
npm.cmd run demo:dealers
npm.cmd run db:check
```

`setup:local` preserves database connection settings, configures `AUTH_SECRET`
if missing, and applies the additive view, embedding, upload, and enquiry
schemas. `demo:admin` creates an administrator only when none exists; it does
not promote existing accounts or replace existing passwords.

For the full demonstration, register a new dealer, sign out, sign in as the
demo administrator and verify the application, then return as the dealer to
publish a vehicle. Add up to six JPEG, PNG or WebP photos (5 MB each maximum).
Sign in as a separate customer to submit an enquiry or test-drive request;
the request appears in the dealer's **Buyer requests** inbox. Seed demo cars
are illustrative and accept enquiries, test-drive requests and customer offers.
No email or SMS is sent.

The marketplace supports budget, fuel, transmission, sorting and paged browsing.
An optional description enables semantic ranking with the same filters and
paging; semantic matches are always ordered by relevance.

Photos are decoded, resized, stripped of metadata, and stored as JPEG bytes in
PostgreSQL. They survive app restarts without requiring an external upload
service. This storage choice is intended for the small college demo.

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
- SQL seeds initially use non-login placeholders. Run `npm.cmd run demo:dealers`
  to provision six usable demo dealer accounts without replacing working
  passwords; generated credentials stay in ignored `.demo-credentials.txt`.

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

Additional endpoints:

- `POST /api/dealer/listings/<listingId>/images` — owner-only multipart photo
  upload with a `photo` field; maximum six photos per listing
- `GET /api/images/<imageId>` — uploaded JPEG content
- `POST /api/listings/<listingId>/enquiries` — authenticated buyer request with
  `message`, optional `phone`, and `request_type` (`enquiry`, `test_drive` or
  `offer`); offers require a positive `offer_amount` and a customer account
- `GET /api/dealer/dashboard` also returns the latest 100 buyer requests for
  the authenticated dealer's inventory
- `GET /api/offers` — customer-only offer history
- `PATCH /api/offers/<offerId>` — customer edits owned offers before contact;
  owning dealer sends `{ "action": "mark_contacted" }` to close editing
- `GET /api/db-check` requires administrator access

Listings accept `page`, `page_size` (1–48), `max_price`, `fuel_type`,
`transmission`, and `sort` (`newest`, `price_asc`, `price_desc`, `mileage_asc`).
Search accepts `page` and `page_size` in its JSON body. Both endpoints return
`has_more` and `page`. Login, registration, search, uploads and enquiries have
database-backed request budgets. Anonymous search/registration budgets are
shared across the demo; public hosting should also enforce trusted edge limits.

Database writes use parameterized queries. Role and account status are checked
on the server for protected operations; the UI is not an authorization
boundary.

## Validation

For dealer demo logins, run `npm.cmd run setup:local` and
`npm.cmd run demo:dealers` from this directory. Six dealer accounts (two per
supported city) share the existing demo inventory. New passwords are saved in
ignored `.demo-credentials.txt`; existing working passwords are preserved.
Run `npm.cmd run demo:admin` to provision an administrator if needed. Sign in
at `/account`, open `/admin`, and approve newly registered dealers before they
publish. Photos are optional. Customers can send price offers from listing
details; dealers receive them in **Buyer requests** and follow up directly.

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

After a successful production build, run the full workflow regression:

```powershell
npm.cmd run test:workflow
```

For the rubric's vector read/update/delete evidence, run:

```powershell
npm.cmd run test:vector
```

This executes `database/queries/28_vector_read_update_delete_demo.sql` and
checks that rollback restores every original embedding and metadata value.

The [final-deliverables index](../docs/final-deliverables.md) links the completed
formal report, editable source, course ER/mapping diagrams and SQL evidence.
Member details and the joint contribution statement are populated. Current
application screenshots remain a separate student review task.

The workflow regression creates a randomly named temporary database using the configured database
role, applies the schemas and seeds, starts an isolated server on port 3101,
and tests registration, admin verification, publishing, image validation and
limits, buyer enquiries, ownership checks, filters, pagination, semantic search,
listing status changes, and rate limiting. It removes its temporary database
and stops its server afterward. The configured role therefore needs permission
to create databases. Existing demo accounts and inventory are not used for test
writes. Run `db:embed` first so the seeded search vectors are available.

This is a local college demo. Public deployment still needs an operator-chosen
host and HTTPS configuration, production secrets and accounts, backups,
monitoring, and an email provider for password recovery. Do not publish the
generated demo administrator or local credential file.

## Submission documentation and audit

- [Dated rubric audit and remaining tasks](../docs/completion-audit.md)
- [Architecture and complete/focused ER diagrams](../docs/architecture-and-demo.md)
- [Relational schema and complete data dictionary](../docs/relational-schema.md)
- [Final deliverables and formal report](../docs/final-deliverables.md)

Buyers can view/edit their offers at /offers until the owning dealer marks them
contacted or the listing becomes unavailable. Only the customer's own amount,
message and phone are editable; old offers remain visible. Dealer contact status
is entered manually and does not detect external email/calls. Inventory
analytics use asking prices; no confirmed-sales ledger, general user-management
UI, or PostgreSQL end-user RLS/GRANT implementation is claimed.

Validation on 15 November 2026: auth tests, lint, isolated production build,
93 workflow HTTP checks, 22 GET-only city/detail checks, live/fresh schema
comparison, trigger/function/view and vector RUD verification passed. Current
application screenshots remain pending; the formal report PDF/source and course
diagrams are complete and published. See the audit
for coverage limits. The fresh build requires access to the existing Google
Fonts dependencies. The main application and existing data were unchanged by
the documentation audit.
