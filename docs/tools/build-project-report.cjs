// Formal PDF report and editable Markdown source. Run from the repository root.
const fs=require('node:fs'),path=require('node:path');
const PDFDocument=require('../../tmp/report-tools/node_modules/pdfkit/js/pdfkit.js');
const root=path.resolve(__dirname,'../..');
const svgToPdf=require('../../tmp/report-tools/node_modules/svg-to-pdfkit');
const meta=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/schema-catalog.json'),'utf8'));
const tables=Object.groupBy(meta.columns,c=>c.table_name);
const sections=[
['Introduction',`AutoHubIQ is an intelligent used-car marketplace and dealership inventory analytics platform developed for the Database Management System Experiential Learning Level 3 mini project at PES University. It integrates a Next.js web application with PostgreSQL and pgvector so that structured vehicle data and semantic search can be queried within the same database system.

Used-car descriptions vary in wording, detail and quality. Customers need to compare specifications, asking prices and locations while describing preferences in natural language. Dealers need consistent inventory ownership, publication controls and a way to receive buyer requests. The project addresses these needs with a relational catalogue, listing-level data, indicative price estimates, role-aware workflows and vector similarity retrieval.

### Objectives
- Design a relational schema with primary keys, foreign keys, unique constraints, CHECK constraints and useful indexes.
- Integrate vehicle browsing, detailed listings, images and indicative estimates with a Next.js interface.
- Support natural-language discovery using normalized 384-dimensional embeddings and cosine similarity.
- Implement customer, dealer and administrator accounts with server-side authorization and ownership checks.
- Demonstrate joins, multiple nested/correlated queries, grouping, CTEs, functions, triggers, views, transactions and vector read/update/delete operations.
- Provide reproducible test evidence and clear documentation of the implemented scope.

### Scope
The marketplace supports Bangalore (Bengaluru), Mumbai and Kolkata. The audited demonstration has twelve active illustrative listings, four in each city, twelve indicative estimates and twelve listing embeddings. Six seeded dealerships own two demo vehicles each; an additional registered Bangalore dealer profile exists in the local database.

The delivered application includes inventory analytics, dealer verification, buyer enquiries, test-drive requests, offers and pre-contact offer editing. Confirmed sales, payment processing, timed auctions, actual sale revenue and general account administration are outside the implemented scope.`],
['Requirements and technology',`The system separates public browsing from authenticated customer, dealer and administrator operations. The following requirements describe delivered behavior.

| User | Functional requirements |
| --- | --- |
| Shopper | Choose a city; browse, filter, sort and page active listings; inspect specifications, images and indicative estimates; use semantic search. |
| Customer | Register and sign in; submit enquiries, test-drive requests and price offers; view and edit owned offers while eligible. |
| Dealer | Register a dealership; await administrator verification; publish with required details and optional photos; update price/status; review buyer requests; mark an offer contacted. |
| Administrator | Review dealership applications; verify or reject a dealership; access protected diagnostics. |

| Technology | Purpose and justification |
| --- | --- |
| Next.js 16.4.3 and React 19.3 | App Router pages and Route Handlers provide one integrated web application and API. |
| TypeScript and Tailwind CSS | Typed application code and consistent responsive interface styling. |
| PostgreSQL 18.6 | Relational storage, constraints, joins, aggregates, transactions, views, functions and triggers. |
| pgvector 0.8.7 | Vector storage and cosine-distance retrieval beside relational data; satisfies the SQL plus Vector approach. |
| Transformers.js and MiniLM ONNX | Local feature extraction with mean pooling and normalized 384-dimensional vectors after model download. |
| Node.js pg and sharp | Parameterized database access and normalized JPEG photo storage. |
| Git and GitHub | Version history and project source distribution. |

pgvector is an extension within PostgreSQL, not a separate database server or a separate document database. The embedding model used in code is onnx-community/all-MiniLM-L6-v2-ONNX. [2, 3]`],
['System architecture',`The browser communicates with Next.js pages and API routes. Route Handlers validate requests, authenticate protected operations and issue parameterized SQL through a PostgreSQL connection pool. PostgreSQL stores business records, image bytes, price estimates, request budgets and listing vectors in the app schema.

{{ARCHITECTURE}}

Public listing endpoints read active inventory. Semantic search generates a local embedding for the customer query, combines similarity ranking with structured SQL filters and returns a page of results. The vector table is part of the same PostgreSQL database shown in the architecture.

For publishing, the server checks dealer verification and validates vehicle/listing details. It generates an embedding, then inserts the physical vehicle, active listing and embedding in a single transaction. Photo uploads occur separately and are optional; uploaded content is decoded, normalized to JPEG and stored in PostgreSQL.

Protected requests verify a signed HttpOnly session cookie, then re-read the current account role and active status from the database. The browser interface is not the authorization boundary. API ownership predicates restrict dealer inventory changes and buyer offer changes.`],
['Database design and entity relationships',`The physical design contains fourteen base tables. Manufacturers, models and variants form the reusable vehicle catalogue. Vehicles represent physical inventory; listings hold asking prices, descriptions, publication state and provenance. Keeping vehicles separate from listings permits historical listing records while a partial unique index allows at most one active listing per vehicle.

{{CATALOGUE}}

Each model belongs to one manufacturer and each variant to one model. A vehicle belongs to one dealer and one catalogue variant. A dealership belongs to one city and one user account; the user_id constraint permits at most one dealer profile per account. A city may contain multiple dealerships.

Listing images, price estimates, embeddings and buyer interactions reference listings. A listing may have multiple dated estimates; the current display selects the latest. Its embedding uses listing_id as both primary key and foreign key, so there is at most one vector per listing. Uploaded JPEG data similarly uses image_id as its primary/foreign key.

The design reduces repetition of catalogue attributes and separates records with different lifecycles. This is a normalization rationale based on the implemented entities and keys; it is not a formal proof of every functional dependency.`],
['Buyer offers and supporting relations',`Enquiries, test drives and offers share listing_enquiries. request_type distinguishes the interaction; offer_amount is present only for offers. There is no separate bids or auction table. contacted_at records the dealer-entered contact status, while updated_at records an offer edit.

{{OFFERS}}

A customer submits an offer from a listing and views it under My offers. The customer can revise the owned amount, message and phone while the listing is active, the dealership is verified and contacted_at is NULL. The dealer sees revised data in the existing inbox. After contacting the buyer, the owning dealer selects Mark contacted, which closes editing. External calls and emails are not detected automatically.

Transactions and row locks serialize edits against contact marking and relevant listing/profile changes. Contacted or unavailable offers remain visible in history. No offer reserves or purchases a vehicle.

request_limits is an independent operational table with a hashed key, time window and request count. It has no business-entity foreign key. listing_image_data contains uploaded image bytes; demo/reference image URLs remain in listing_images. The complete typed dictionary in Appendix B includes all fourteen tables and their constraints.`],
['Relational integrity and indexing',`Primary keys identify records. Foreign keys connect catalogue, ownership, inventory and listing-related data. Unique constraints prevent duplicate user emails, duplicate manufacturer names, duplicate model names within a manufacturer and duplicate variant names within a model. A separate LOWER(email) unique index supports case-insensitive email uniqueness.

| Database mechanism | Implemented rule |
| --- | --- |
| Partial unique index | vehicle_listings(vehicle_id) is unique where listing_status is active. |
| CHECK constraints | Positive prices; allowed role/status/source values; nonnegative mileage; owner count 1-10; catalogue fuel/transmission/body values; valid estimate bounds. |
| Conditional offer CHECK | Offer rows require positive offer_amount; non-offer rows require NULL offer_amount. |
| Payload CHECK | Stored image content is no larger than 2 MB and has the normalized JPEG content type. |
| Cascade deletion | Deleting a listing cascades to images, estimates, embeddings and interactions; deleting an image cascades to its stored payload. Other FKs use NO ACTION. |
| B-tree indexes | Support city, dealer, variant, year, mileage, listing price/status, enquiry and estimate lookups. |
| HNSW index | Uses vector_cosine_ops on listing embeddings for cosine-distance search capability. |

API rules are intentionally distinguished from database constraints. SQL year checks permit 1990-2030, whereas the create-listing API also rejects future years and registration before manufacture. Description length, dealer verification, photo-count limits and offer-edit eligibility are checked in the API. The schema does not independently enforce customer/dealer roles across foreign keys.

Registration numbers have no unique constraint, and primary-image selection has no unique partial index. Estimate bounds must be positive and ordered, but the central estimate is not forced inside that range by a CHECK. These are implementation limits rather than guarantees claimed by this report.`],
['SQL operations and query examples',`The application performs meaningful INSERT, SELECT and UPDATE operations. Customer/dealer registration inserts accounts and profiles; publishing inserts inventory, listing and vector rows; listing maintenance and offer revision update existing rows. Public APIs and SQL analytics read related data through joins. Vector DELETE is demonstrated within a rollback transaction so that the sample is restored.

### Joined listing retrieval

The following representative query connects listings, physical vehicles and dealerships. Actual routes add catalogue data, estimates, images, filters, sorting and pagination.

\`\`\`sql
SELECT vl.listing_id, dp.dealership_name,
       v.manufacturing_year, vl.asking_price
FROM app.vehicle_listings vl
JOIN app.vehicles v USING (vehicle_id)
JOIN app.dealer_profiles dp USING (dealer_id)
WHERE vl.listing_status = 'active'
ORDER BY vl.asking_price;
\`\`\`

### Nested query for prices above the overall average

Query 10 compares each active asking price with a nested aggregate over active listings. The full stored query joins the vehicle catalogue and city for readable results. [4]

\`\`\`sql
SELECT listing_id, asking_price
FROM app.vehicle_listings
WHERE listing_status = 'active'
  AND asking_price > (
    SELECT AVG(asking_price)
    FROM app.vehicle_listings
    WHERE listing_status = 'active'
  );
\`\`\`

### Correlated query for prices above the city average

Query 11 correlates the inner dealer city to the outer dealer city. Unlike the overall-average example, its comparison group changes for each outer city.

\`\`\`sql
SELECT vl.listing_id, dp.city_id, vl.asking_price
FROM app.vehicle_listings vl
JOIN app.vehicles v USING (vehicle_id)
JOIN app.dealer_profiles dp USING (dealer_id)
WHERE vl.listing_status = 'active'
  AND vl.asking_price > (
    SELECT AVG(vl2.asking_price)
    FROM app.vehicle_listings vl2
    JOIN app.vehicles v2 USING (vehicle_id)
    JOIN app.dealer_profiles dp2 USING (dealer_id)
    WHERE dp2.city_id = dp.city_id
      AND vl2.listing_status = 'active'
  );
\`\`\`

### Nested aggregation for dealer activity

Query 15 groups inventory by dealer, then applies HAVING against a nested average of dealer listing counts. This provides a third distinct nested/correlated-query example. A valid empty result is possible when the dealers have equal active counts; it is not evidence of query failure.

\`\`\`sql
SELECT dp.dealer_id, COUNT(vl.listing_id) AS total
FROM app.dealer_profiles dp
LEFT JOIN app.vehicles v USING (dealer_id)
LEFT JOIN app.vehicle_listings vl
  ON vl.vehicle_id = v.vehicle_id
 AND vl.listing_status = 'active'
GROUP BY dp.dealer_id
HAVING COUNT(vl.listing_id) > (
  SELECT AVG(listing_count)
  FROM (
    SELECT COUNT(vl2.listing_id) AS listing_count
    FROM app.dealer_profiles dp2
    LEFT JOIN app.vehicles v2 USING (dealer_id)
    LEFT JOIN app.vehicle_listings vl2
      ON vl2.vehicle_id = v2.vehicle_id
     AND vl2.listing_status = 'active'
    GROUP BY dp2.dealer_id
  ) AS dealer_counts
);
\`\`\`

Additional nested lookups select the latest price estimate using a LATERAL subquery ordered by assessment time. Queries 12, 17, 24 and 27 demonstrate grouping, ranking and common table expressions. Recursive queries are not claimed; the project demonstrates multiple nested/correlated queries under the combined rubric category.`],
['Advanced database concepts',`### Views and reusable functions
app.active_listing_details joins inventory, catalogue, dealer/city and the latest price estimate for active listings. app.dealer_inventory_summary exposes active listing count, total asking value and average asking price. These are inventory indicators, not confirmed sales revenue.

app.search_active_listings is a STABLE SQL function that accepts optional city, maximum price, fuel and transmission filters. A separate PL/pgSQL trigger function, app.set_updated_at, updates modification timestamps.

\`\`\`sql
SELECT * FROM app.search_active_listings(
  p_city_id := 1::SMALLINT,
  p_max_price := 1500000::NUMERIC,
  p_fuel_type := 'Diesel'::TEXT,
  p_transmission := 'Automatic'::TEXT
);
\`\`\`

### Triggers
Three BEFORE UPDATE triggers call set_updated_at on dealer_profiles, vehicles and vehicle_listings. The audit attempted to assign an old timestamp in a disposable database and verified that each trigger replaced it with a current timestamp, then rolled back the test. listing_enquiries.updated_at is assigned by the offer API; no generic enquiry or users timestamp trigger is claimed.

### Common table expressions and ranking
Query 27 first aggregates active listings and prices by city, then applies DENSE_RANK to the summary. This separates aggregation from ranking and avoids repeating the same aggregate query.

\`\`\`sql
WITH city_stats AS (
  SELECT c.city_name, COUNT(vl.listing_id) AS total
  FROM app.cities c
  LEFT JOIN app.dealer_profiles dp USING (city_id)
  LEFT JOIN app.vehicles v USING (dealer_id)
  LEFT JOIN app.vehicle_listings vl
    ON vl.vehicle_id = v.vehicle_id
   AND vl.listing_status = 'active'
  GROUP BY c.city_id
)
SELECT *, DENSE_RANK() OVER (ORDER BY total DESC)
FROM city_stats;
\`\`\`

### Transactions and concurrency
Registration, dealer approval/rejection and inventory publishing use explicit transactions. A publishing error rolls back the vehicle/listing/vector inserts together. Rejection withdraws the dealer's active listings transactionally. Offer editing and dealer contact marking lock the relevant rows to enforce the editing boundary. The vector operation demonstration uses ROLLBACK to restore every modified vector and metadata value.`],
['Vector storage and semantic retrieval',`The application uses the SQL plus Vector database option in the rubric. A dedicated listing_embeddings table stores one vector per listing. The primary key is also a foreign key to vehicle_listings, and deletion of the parent cascades to the vector row.

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE app.listing_embeddings (
  listing_id BIGINT PRIMARY KEY
    REFERENCES app.vehicle_listings(listing_id)
    ON DELETE CASCADE,
  embedding VECTOR(384) NOT NULL,
  source_text TEXT NOT NULL,
  model_name TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_listing_embeddings_cosine
ON app.listing_embeddings
USING hnsw (embedding vector_cosine_ops);
\`\`\`

The source text includes make, model, variant, year, body/fuel/transmission, condition, ownership count, mileage, city, colour when present, and listing description. Transformers.js runs the MiniLM ONNX model locally after downloading its model files. Mean pooling and normalization produce 384 finite values; the application rejects invalid dimensions or nonfinite results.

At query time the server embeds the natural-language request, applies structured filters in SQL and orders by the cosine-distance operator <=>. A displayed similarity is computed as 1 minus cosine distance. Supported intent extraction can narrow budget, body type, fuel and transmission group; explicit city selection and request filters remain part of retrieval. Pagination follows relevance order.

For the twelve-row demonstration, an HNSW index exists but the report does not claim a measured speed advantage or a particular query plan. The planner may choose a scan at this scale. Asking price changes do not require vector regeneration because price is handled by SQL filters rather than embedded source text.

Query 28 demonstrates read/update/delete using stored sample vectors. The audit returned five nearest matches, temporarily replaced one sample vector, deleted that sample and rolled back. A before/after fingerprint verified restoration. The replacement is a synthetic operation demonstration; a production text change should regenerate the corresponding vector rather than copy another vehicle's embedding.`],
['Application workflows and authorization',`Registration accepts customer and dealer accounts; public registration cannot create an administrator. A dealer supplies dealership and city information and starts pending. An administrator uses the verification dashboard to approve or reject the dealership. Verified dealers may publish immediately without photos when required vehicle details and a 20-5000 character description are present.

The dealer workspace displays inventory totals, asking-price/status controls, uploads and the latest buyer requests. Existing listing edits cover price and status; full vehicle specification and description editing is not implemented. Customers use the listing contact form for enquiries, test-drive requests and price offers, then My offers for eligible revisions.

| API group | Role and ownership boundary |
| --- | --- |
| /api/cities, /api/listings, /api/search | Public reads/search with validation and applicable request budgets. |
| /api/auth/* | Registration, password verification, signed session, account lookup and logout. |
| /api/dealer/* | Dealer role; listing and image changes restricted to owned inventory; publishing/activation require verification. |
| /api/admin/dealers | Administrator role; dealership review and decisions. |
| GET /api/offers | Customer role; returns only the signed-in buyer's offers. |
| PATCH /api/offers/:id | Owning customer edits before contact; owning dealer may mark contacted. |

Passwords use salted scrypt hashes. Session payloads are signed using HMAC-SHA256 and placed in HttpOnly, SameSite=Lax cookies, with Secure enabled in production and a seven-day expiry. The server re-reads active account status and role on protected requests. Logout clears the browser cookie; this is not a server-side session revocation list.

Parameterized SQL, same-origin mutation checks, validation and database-backed request budgets protect the demonstrated workflows. Password visibility is optional and defaults to hidden. Demo login credentials and database configuration remain outside report screenshots and version control.

End-user roles are stored in PostgreSQL and enforced by API queries. The project does not implement PostgreSQL login roles per customer, GRANT-based end-user separation or row-level-security policies. This accurately describes database-backed application authorization under the team's interpretation of the rubric; no database-native role policy is claimed.`],
['Testing and results',`The implementation was audited on 15 November 2026. The configured database was inspected through read-only queries. Schema/seed application, advanced SQL behavior, trigger tests and vector RUD were exercised in disposable databases. Application build and regression checks used an isolated copy of the committed source. [5]

| Verification | Observed result |
| --- | --- |
| Authentication unit tests | Two tests passed for password hashing and signed-session validation. |
| ESLint | Passed without rewriting application files. |
| Production build and TypeScript | Passed in an isolated copy. A network-enabled retry supplied existing Google Fonts dependencies after a restricted-network attempt failed. |
| Workflow regression | 93 HTTP checks plus assertions passed in a temporary database. |
| All-city public API audit | 22 GET checks passed across three cities, including filters, sorted results, empty results and all twelve detail records with images/estimates. |
| Schema reconciliation | All fourteen tables, columns, constraints, indexes, views, functions and triggers matched a clean install. |
| Data coverage | Twelve active listings, twelve estimates and twelve embeddings; no active listing lacked an estimate or vector. |
| Integrity query 26 | Zero issues for its four orphan checks. |
| Trigger and advanced SQL | Three timestamp triggers verified; view/function, CTE and correlated-query execution passed. |
| Vector RUD | Five matches, one update, one delete and complete rollback restoration in a disposable database. |

The workflow regression exercises role restrictions, unauthorized requests, dealer approval, publishing without photos, image validation/limits, enquiries, offer creation and revision, dealer contact marking, inventory ownership, listing status, filters/paging, semantic search and throttling. A buyer cannot edit another buyer's offer, mark their own offer contacted as a dealer, or revise a contacted/unavailable offer.

The automated write/search workflow concentrates on one selected city. The additional GET audit covers browsing and details for all cities. Tests do not establish exhaustive API branch coverage, browser responsiveness, external email/call delivery, large-scale query performance or concurrency behavior under sustained load. Those are not claimed results.

{{INTEGRITY_EVIDENCE}}

Figure 4 shows historical pgAdmin output for the four orphan checks. The same checks were re-executed during the dated audit and returned zero issues. This is database evidence, not a screenshot of the current web interface. The current source contains the marketplace, account, dealer, admin, listing and offer pages; automated HTTP checks should not be mistaken for a visual browser test.`],
['Team contributions',`The project was developed jointly. Both members participated in requirements, design discussions, implementation, integration, debugging and review. The following equal division records primary responsibility for organizing and presenting the shared work; it does not imply exclusive or independent authorship of the listed features.

| Member | SRN | Primary responsibility within the joint project |
| --- | --- | --- |
| Ronit Prasad | PES1UG24CS549 | Relational design and constraints; SQL queries and inventory analytics; dealer/admin workflows; authentication and role/ownership explanations. |
| Sanjana Medarametla | PES1UG24CS908 | Marketplace and listing interfaces; semantic/vector search; customer enquiries and offers; image handling and workflow-test explanations. |

Both members share responsibility for application/database integration, testing and fixes, documentation review, project decisions and final demonstration. Each member should be able to explain the overall architecture and the boundaries between database constraints and API authorization.

Git history records project changes but is not treated as a precise measure of individual effort. No unsupported percentages, separate implementation claims or fictitious commit ownership are assigned. The repository for review is https://github.com/Ronit77x/AutoHubIQ.`],
['Evaluation rubric alignment',`The attached PES University rubric allocates fifty marks across seven criteria. The table maps the delivered project to those criteria; it does not award marks or imply evaluator approval. [1]

| Criterion | Maximum | Project evidence |
| --- | ---: | --- |
| Database design | 5 | ER relationships, fourteen-table relational schema, typed dictionary and explicit integrity rules. |
| Database creation | 9 | PostgreSQL DDL/constraints; pgvector table/index; SQL plus Vector technology justification. |
| SQL operations and queries | 8 | Application DML; vector DELETE demonstration; several nested/correlated queries; joins, aggregates, HAVING and ordering. |
| Advanced database concepts | 13 | Functions, triggers, CTEs, views, transactions and indexes; vector retrieval and read/update/delete evidence. |
| Web application and database integration | 5 | Next.js interface, Route Handlers, parameterized PostgreSQL access and isolated workflow verification. |
| Authentication and authorization | 4 | Frontend authentication, password hashing and three database-stored roles enforced by protected APIs and ownership checks. |
| Documentation and individual contribution | 6 | Formal report, source repository, query/test evidence, truthful joint contribution statement and student demonstration. |
| Total available | 50 | Final assessment belongs to the evaluator. |

The project uses multiple nested/correlated queries rather than adding a recursive query without a domain need. Role-based access is database-backed API enforcement rather than PostgreSQL end-user RLS. The team considers the vector DELETE demonstration sufficient for the DELETE requirement. These are stated implementation choices and team interpretations, not instructor confirmations.

The source rubric has an internal inconsistency: authentication is allocated four marks in its maximum/distribution but three in the detailed Correct Execution cell. This report retains the stated four-mark maximum without resolving the grading discrepancy.`],
['Conclusion and future work',`AutoHubIQ demonstrates an integrated relational and vector database application rather than an isolated collection of CRUD pages. Structured vehicle catalogue and inventory data support city-based browsing, detailed listing information and indicative price comparisons. Semantic retrieval combines MiniLM embeddings and cosine distance with relational filters. Three account roles support customer interactions, verified dealer inventory and administrator dealership review.

The database demonstrates primary/foreign keys, unique and CHECK constraints, partial and vector indexes, views, functions, triggers, CTEs and transactions. Reproducible checks confirm clean schema installation, the observed twelve-listing dataset, role/ownership workflows and vector read/update/delete restoration. The buyer offer lifecycle adds a concrete use for transactions and ownership checks.

Future enhancements may include a confirmed-sale ledger and actual revenue analytics, broader operator account administration, email/password recovery, stronger database-native policies if needed, production hosting/backups and broader browser/concurrency testing. These are proposed enhancements, not delivered capabilities. Indicative estimates and illustrative vehicle images should not be represented as verified market valuations or vehicle-condition evidence.

The project is presented for Semester 5, Section I, Database Management System Experiential Learning Level 3, August-December 2026. Both authors retain shared responsibility for reviewing the report, validating the contribution statement and explaining the implementation during evaluation.`],
];

// Appendix contains every audited column, not abbreviated entity descriptions.
let dictionary='The following dictionary reflects the audited physical schema. Nullable columns are marked Yes. IDENTITY means GENERATED ALWAYS AS IDENTITY. Full constraint and index definitions are retained in docs/relational-schema.md and docs/evidence/schema-catalog.json. Composite uniqueness applies to the listed column combination, not to each member independently.\n\n';
for(const [t,cols] of Object.entries(tables)){
 const cs=meta.constraints.filter(c=>c.table_name===t);
 const keys={};for(const c of cs){if(['p','f','u'].includes(c.kind)){for(const col of c.definition.match(/\(([^)]+)\)/)[1].split(', '))(keys[col]??=[]).push({p:'PK',f:'FK',u:'UK member'}[c.kind]);}}
 dictionary+=`### ${t}\n\n| Column | Type | Null | Key or default |\n| --- | --- | --- | --- |\n`;
 for(const c of cols){const notes=[...(keys[c.column_name]??[]),...(c.identity?['IDENTITY']:c.default_value?[c.default_value]:[])].join('; ');dictionary+=`| ${c.column_name} | ${c.type.replace('character varying','varchar').replace('timestamp with time zone','timestamptz')} | ${c.not_null?'No':'Yes'} | ${notes||'-'} |\n`;}
 dictionary+='\n'+cs.filter(c=>['f','u','c'].includes(c.kind)).map(c=>'- '+c.definition.replaceAll('\n',' ')).join('\n')+'\n\n';
}
sections.push(['Appendix A Chen ER diagrams and relational mapping',fs.readFileSync(path.join(root,'docs/diagrams/course/mapping-notes.md'),'utf8')]);
sections.push(['Appendix B Data dictionary',dictionary]);
sections.push(['Appendix C Source references',`[1] PES University, Department of Computer Science and Engineering. Database Management System, Aug-Dec 2026, Experiential Learning Level 3 MiniProject Evaluation Criteria. User-supplied one-page rubric, DBMS Level 3 (2).pdf, visually inspected for this report.

[2] Ronit Prasad and Sanjana Medarametla. AutoHubIQ project repository. https://github.com/Ronit77x/AutoHubIQ. Implementation validation baseline e363f78 (15 November 2026). Final ER/mapping deliverables were published to main in commits 3115c6b and 92c02d0; origin/main was fetched and matched the local baseline on 18 November 2026 before this documentation refresh. Validation results remain dated 15 November; no new application test run is implied.

[3] AutoHubIQ database/schema SQL files 01-18 (existing numbered files), including core/catalogue/inventory DDL, price estimates, advanced objects, vector storage, interactions, offers and contact status.

[4] AutoHubIQ database/queries. Particularly queries 10, 11 and 15 for nested/correlated examples; query 27 for CTE/view/function demonstrations; query 28 for vector read/update/delete with rollback.

[5] AutoHubIQ verification artifacts dated 15 November 2026. docs/evidence/database-validation.json, schema-catalog.json and city-validation.json; frontend/scripts/smoke-test.mjs; frontend/lib/auth-crypto.test.mjs. Authentication tests, lint, isolated production build, ninety-three workflow HTTP checks and twenty-two public GET checks are summarized in this report.

[6] AutoHubIQ implementation sources. frontend/lib/auth.ts, auth-crypto.ts and embeddings.ts; frontend/app/api routes; marketplace, account, listing, dealer, admin and offers pages; docs/architecture-and-demo.md and docs/relational-schema.md.

Source artifacts describe implementation behavior and reproducible evidence. No independent market dataset, model-quality benchmark, confirmed sale dataset or large-scale performance evaluation is claimed.`]);

const cover=`# AutoHubIQ Project Report\n\nAn Intelligent Used Car Marketplace and Dealership Analytics Platform\n\nPES University\nDepartment of Computer Science and Engineering\nDatabase Management System\nExperiential Learning Level 3 MiniProject\nSemester 5 | Section I | August-December 2026\n\nRonit Prasad | PES1UG24CS549\nSanjana Medarametla | PES1UG24CS908\n\nRepository https://github.com/Ronit77x/AutoHubIQ\nReport revised 18 November 2026\n`;
const abstract='AutoHubIQ combines a used-car marketplace with dealership inventory analytics using Next.js, TypeScript, PostgreSQL and pgvector. A fourteen-table relational schema separates users, dealers, the vehicle catalogue, physical inventory, listings, images, indicative estimates and buyer interactions. Normalized 384-dimensional MiniLM embeddings support natural-language retrieval alongside structured SQL filters. Customer, dealer and administrator roles provide enquiries, test-drive requests, offers, pre-contact offer revision, verified inventory publishing and dealership approval. Database features include constraints, joins, nested/correlated queries, views, functions, triggers, CTEs, indexes and transactions. The audited dataset contains twelve active illustrative listings across three cities. Verification includes ninety-three workflow HTTP checks, twenty-two public GET checks, schema reconciliation and vector read/update/delete restoration. The system provides inventory indicators rather than confirmed-sales analytics; indicative estimates and demo images are explicitly illustrative.';
fs.mkdirSync(path.join(root,'output/pdf'),{recursive:true});fs.mkdirSync(path.join(root,'output/source'),{recursive:true});
let source=cover+'\n## Abstract\n\n'+abstract+'\n\n'+sections.map(([title,body])=>'## '+title+'\n\n'+body).join('\n\n'); source=source.replace('{{ARCHITECTURE}}','Browser -> Next.js pages and Route Handlers -> PostgreSQL app schema (including pgvector); local MiniLM generates query and listing embeddings.').replace('{{CATALOGUE}}','![Chen catalogue diagram](../../docs/diagrams/course/chen-02-catalogue.svg)').replace('{{OFFERS}}','![Chen buyer interactions](../../docs/diagrams/course/chen-06-interactions.svg)').replace('{{COMPLETE}}','[Course Chen ER diagrams and relational mapping](../pdf/AutoHubIQ_ER_and_Relational_Mapping.pdf)').replace('{{INTEGRITY_EVIDENCE}}','![Historical integrity checks](../../screenshots/21_database_integrity_checks.png)'); fs.writeFileSync(path.join(root,'output/source/AutoHubIQ_Project_Report.md'),source);

const doc=new PDFDocument({size:'A4',margins:{top:54,bottom:54,left:54,right:54},bufferPages:true,info:{Title:'AutoHubIQ Project Report',Author:'Ronit Prasad and Sanjana Medarametla',Subject:'Database Management System Experiential Learning Level 3'}});
doc.registerFont('Body','C:/Windows/Fonts/times.ttf');doc.registerFont('Bold','C:/Windows/Fonts/timesbd.ttf');doc.registerFont('Italic','C:/Windows/Fonts/timesi.ttf');doc.registerFont('Code','C:/Windows/Fonts/consola.ttf');
const stream=fs.createWriteStream(path.join(root,'output/pdf/AutoHubIQ_Project_Report.pdf'));doc.pipe(stream);
const W=doc.page.width-108,B=doc.page.height-58;const toc=[];
function body(){doc.font('Body').fontSize(11.5).fillColor('#111111');}
function room(h){if(doc.y+h>B){doc.addPage();body();}}
function para(text){body();const h=doc.heightOfString(text,{width:W,lineGap:2.2});room(h+10);doc.text(text,54,doc.y,{width:W,lineGap:2.2,align:'justify'});doc.moveDown(.65);}
function heading(text){room(110);doc.moveDown(.4);doc.font('Bold').fontSize(13).fillColor('#111111').text(text,54,doc.y,{width:W});doc.moveDown(.5);body();}
function table(rows){const n=rows[0].length;let widths=n===3&&rows[0][1]==='Cardinality'?[W*.28,W*.08,W*.64]:n===4?[W*.25,W*.25,W*.08,W*.42]:n===3?[W*.24,W*.22,W*.54]:[W*.31,W*.69];
 if(n===3&&rows[0][1]==='Cardinality')rows[0][1]='Ratio';
 const draw=(row,head=false)=>{doc.font(head?'Bold':'Body').fontSize(9.3);const h=Math.max(...row.map((s,i)=>doc.heightOfString(s,{width:widths[i]-12,lineGap:1})))+14;room(h+1);const y=doc.y;let x=54;row.forEach((s,i)=>{doc.rect(x,y,widths[i],h).fillAndStroke(head?'#ededed':'#ffffff','#a0a0a0');doc.fillColor('#111111').text(s,x+6,y+7,{width:widths[i]-12,lineGap:1});x+=widths[i];});doc.y=y+h;doc.x=54;};
 draw(rows[0],true);for(const r of rows.slice(1)){if(doc.y+Math.max(...r.map((s,i)=>doc.heightOfString(s,{width:widths[i]-12})))+18>B){doc.addPage();draw(rows[0],true);}draw(r);}doc.moveDown(.8);body();}
function code(text){doc.font('Code').fontSize(8.5);const lines=text.split('\n');for(const l of lines){room(12);doc.text(l,54,doc.y,{width:W,lineGap:1});}doc.moveDown(.8);body();}
function box(x,y,w,h,title,sub){doc.roundedRect(x,y,w,h,4).lineWidth(.7).fillAndStroke('#ffffff','#444444');doc.font('Bold').fontSize(10.3).fillColor('#111111').text(title,x+8,y+8,{width:w-16,align:'center'});doc.font('Body').fontSize(9.2).text(sub,x+8,y+28,{width:w-16,align:'center'});}
function edge(x1,y1,x2,y2){doc.lineWidth(.7).strokeColor('#555555').moveTo(x1,y1).lineTo(x2,y2).stroke();const angle=Math.atan2(y2-y1,x2-x1),sz=5;doc.moveTo(x2,y2).lineTo(x2-sz*Math.cos(angle-.5),y2-sz*Math.sin(angle-.5)).lineTo(x2-sz*Math.cos(angle+.5),y2-sz*Math.sin(angle+.5)).closePath().fill('#555555');}
function architecture(){room(230);const y=doc.y;box(155,y,285,48,'Browser','Customer  |  Dealer  |  Administrator');edge(298,y+48,298,y+70);box(155,y+70,285,48,'Next.js pages and Route Handlers','Validation, signed sessions and role checks');edge(298,y+118,180,y+145);edge(298,y+118,420,y+145);box(54,y+145,247,57,'PostgreSQL app schema','Relational data, uploads and pgvector');box(320,y+145,220,57,'Local embedding model','MiniLM ONNX via Transformers.js');edge(320,y+177,301,y+177);doc.y=y+214;doc.font('Italic').fontSize(9.5).text('Figure 1  Application architecture and database integration',54,doc.y,{width:W,align:'center'});doc.moveDown();body();}
function entities(kind){
 const y=doc.y;room(380);const top=doc.y;
 function entity(x,dy,name,key){const cy=top+dy;doc.rect(x-68,cy-18,136,36).fillAndStroke('white','black');doc.font('Bold').fontSize(10).fillColor('black').text(name,x-64,cy-4,{width:128,align:'center'});const kd=['vehicle_variants','listing_enquiries'].includes(name)?43:-43;doc.ellipse(x,cy+kd,64,11).stroke();doc.font('Body').fontSize(9).text(key,x-59,cy+kd-4,{width:118,align:'center',underline:true});doc.moveTo(x,cy+(kd>0?18:-18)).lineTo(x,cy+(kd>0?32:-32)).stroke();}
 function diamond(x,dy,label){const cy=top+dy;doc.moveTo(x,cy-17).lineTo(x+42,cy).lineTo(x,cy+17).lineTo(x-42,cy).closePath().fillAndStroke('white','black');doc.font('Body').fontSize(8.7).fillColor('black').text(label,x-37,cy-4,{width:74,align:'center'});}
 function lines(points,total=false){doc.lineWidth(.6).strokeColor('black');for(let n=0;n<(total?2:1);n++){doc.moveTo(points[0][0]+n*2,top+points[0][1]+n*2);for(const pt of points.slice(1))doc.lineTo(pt[0]+n*2,top+pt[1]+n*2);doc.stroke();}}
 if(kind==='OFFERS'){
   lines([[180,88],[180,148]]);lines([[280,242],[280,165],[222,165]],true);diamond(180,165,'submits');
   lines([[420,88],[420,148]]);lines([[320,242],[320,165],[378,165]],true);diamond(420,165,'receives');
   entity(180,70,'users','user_id');entity(420,70,'vehicle_listings','listing_id');entity(300,260,'listing_enquiries','enquiry_id');
   doc.font('Body').fontSize(9).text('(0,N)',185,top+105).text('(0,N)',425,top+105).text('(1,1)',245,top+225).text('(1,1)',325,top+225);
 }else{
   lines([[248,70],[258,70]]);lines([[352,70],[342,70]],true);diamond(300,70,'makes');
   lines([[420,88],[420,148]]);lines([[420,242],[420,182]],true);diamond(420,165,'offers');
   lines([[352,260],[342,260]]);lines([[248,260],[258,260]],true);diamond(300,260,'describes');
   entity(180,70,'manufacturers','manufacturer_id');entity(420,70,'vehicle_models','model_id');entity(420,260,'vehicle_variants','variant_id');entity(180,260,'vehicles','vehicle_id');
   doc.font('Body').fontSize(8.5).text('(0,N)',245,top+51).text('(1,1)',338,top+51).text('(0,N)',425,top+110).text('(1,1)',425,top+220).text('(0,N)',338,top+280).text('(1,1)',245,top+280);
 }
 doc.y=top+340;doc.font('Italic').fontSize(9.5).text(kind==='OFFERS'?'Figure 3  Chen ER view of buyer interactions':'Figure 2  Chen ER view of the vehicle catalogue',54,doc.y,{width:W,align:'center'});doc.moveDown();para('Key attributes are shown in this overview. Appendix A contains all attribute ovals and the separate ER-to-relational mapping sheets.');
}
function integrity(){room(215);const y=doc.y;const image=path.join(root,'screenshots/21_database_integrity_checks.png');doc.save().rect(90,y,405,183).clip();doc.image(image,90-429,y-527,{width:1917});doc.restore();doc.y=y+190;doc.font('Italic').fontSize(9.5).text('Figure 4  Historical database integrity query output',54,doc.y,{width:W,align:'center'});doc.moveDown();body();}
function completeDiagram(){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/diagrams/course/manifest.json'),'utf8'));
 for(const m of manifest){doc.addPage({size:'A3',layout:'landscape',margins:{top:40,left:40,right:40,bottom:40}});const scale=Math.min((doc.page.width-80)/m.width,(doc.page.height-100)/m.height),w=m.width*scale;doc.save().translate((doc.page.width-w)/2,35).scale(scale);svgToPdf(doc,fs.readFileSync(path.join(root,'docs/diagrams/course',m.file),'utf8'),0,0,{assumePt:true});doc.restore();}
 body();
}
function render(md){const lines=md.split('\n');for(let i=0;i<lines.length;){const l=lines[i].trim();if(!l){i++;continue;}if(l.startsWith('### ')){heading(l.slice(4));i++;continue;}if(l==='{{COMPLETE}}'){completeDiagram();i++;continue;}if(l==='{{ARCHITECTURE}}'){architecture();i++;continue;}if(l==='{{CATALOGUE}}'||l==='{{OFFERS}}'){entities(l.slice(2,-2));i++;continue;}if(l==='{{INTEGRITY_EVIDENCE}}'){integrity();i++;continue;}if(l.startsWith('```')){const block=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))block.push(lines[i++]);i++;code(block.join('\n'));continue;}if(l.startsWith('|')){const rows=[];while(i<lines.length&&lines[i].trim().startsWith('|')){const r=lines[i++].trim().slice(1,-1).split('|').map(s=>s.trim());if(!r.every(s=>/^[-: ]+$/.test(s)))rows.push(r);}table(rows);continue;}if(l.startsWith('- ')){para('• '+l.slice(2));i++;continue;}const p=[];while(i<lines.length&&lines[i].trim()&&!/^(### |\||```|\{\{|- )/.test(lines[i].trim()))p.push(lines[i++].trim());para(p.join(' '));}}

doc.font('Bold').fontSize(19).text('PES UNIVERSITY',54,82,{width:W,align:'center'});doc.moveDown(.5);doc.font('Body').fontSize(12).text('Department of Computer Science and Engineering',{align:'center'});doc.text('Database Management System',{align:'center'});doc.text('Experiential Learning Level 3 MiniProject',{align:'center'});doc.moveDown(3.2);doc.font('Bold').fontSize(28).text('AutoHubIQ',{align:'center'});doc.moveDown(.5);doc.font('Body').fontSize(16).text('An Intelligent Used Car Marketplace\nand Dealership Analytics Platform',{align:'center',lineGap:4});doc.moveDown(3);doc.font('Body').fontSize(12).text('Submitted by',{align:'center'});doc.moveDown();doc.font('Bold').text('Ronit Prasad    PES1UG24CS549',{align:'center'});doc.text('Sanjana Medarametla    PES1UG24CS908',{align:'center'});doc.moveDown(2);doc.font('Body').text('Semester 5    Section I',{align:'center'});doc.text('Academic period August to December 2026',{align:'center'});doc.moveDown(2);doc.fontSize(10.5).text('https://github.com/Ronit77x/AutoHubIQ',{align:'center',link:'https://github.com/Ronit77x/AutoHubIQ'});doc.text('18 November 2026',{align:'center'});
doc.addPage();doc.font('Bold').fontSize(18).text('Abstract');doc.moveDown();para(abstract);heading('Keywords');para('Used-car marketplace; relational database; PostgreSQL; pgvector; semantic search; Next.js; role-based access; inventory analytics.');
doc.addPage();const tocPage=2;doc.font('Bold').fontSize(18).text('Contents');
for(const [index,[title,md]] of sections.entries()){doc.addPage({size:'A4',layout:'portrait',margins:{top:54,bottom:54,left:54,right:54}});const page=doc.bufferedPageRange().count;const label=title.startsWith('Appendix')?title:`${index+1}  ${title}`;toc.push([label,page]);doc.font('Bold').fontSize(18).fillColor('#111111').text(label,{width:W});doc.moveDown(.8);render(md);}
const range=doc.bufferedPageRange();doc.switchToPage(tocPage);doc.y=100;for(const [label,page] of toc){doc.font('Body').fontSize(11.5).text(label,54,doc.y,{width:W-40});const y=doc.y-14;doc.text(String(page),doc.page.width-88,y,{width:30,align:'right'});doc.y=y+30;}
for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;if(i>0 && doc.page.width < doc.page.height){doc.font('Body').fontSize(9).fillColor('#444444').text('AutoHubIQ  |  DBMS Level 3',54,doc.page.height-38,{lineBreak:false});doc.text(String(i+1),doc.page.width-90,doc.page.height-38,{width:36,align:'right',lineBreak:false});}}
doc.end();stream.on('finish',()=>console.log(`Created report PDF with ${range.count} pages and editable Markdown source.`));
