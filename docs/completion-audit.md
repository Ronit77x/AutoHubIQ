# AutoHubIQ completion audit

**Implementation audit date:** 15 November 2026. **Documentation review:** 18 November 2026. **Baseline:** commit `e363f78` and the user-supplied 50-mark rubric. This is a completion assessment, not an awarded score. The one-page institutional rubric, DBMS Level 3 (2).pdf, was subsequently supplied and visually reviewed on 15 November 2026. The team accepts the combined nested/correlated-query category, database-backed API authorization and vector DELETE demonstration as sufficient; these are team interpretations, not instructor confirmations.

The application is substantially ahead of the pasted progress report. Semantic search, details pages, estimates, authentication, dealer/admin workflows, image uploads, customer offers, and buyer offer editing are implemented. The main remaining submission work is current web-interface visual evidence and student review/submission. A formal PDF and editable report now include member details, a balanced joint contribution statement, schema diagrams, query examples and the rubric mapping.

## Rubric assessment

| Criterion | Maximum | Status | Evidence and remaining action |
| --- | ---: | --- | --- |
| ER diagram | 2 | Updated | [Course Chen ERDs and relational mapping](course-er-mapping.md) now cover all 14 tables and offer/contact columns. Include legible diagrams in the final report. |
| Relational schema | 3 | Updated | [Schema and column dictionary](relational-schema.md) lists every column, PK/FK, nullability, default, constraint, and index; live metadata matches a clean install. |
| SQL DDL and constraints | 4 | Implemented, verified | All schema scripts apply successfully to a disposable database; FK/unique/check definitions are catalogued. Four orphan checks return zero issues. This is not a claim of exhaustive invalid-input coverage. |
| Vector database creation | 4 | Implemented, verified | Schema 15 creates pgvector, `vector(384)`, and an HNSW cosine index. All 12 active listings have embeddings. pgvector is inside PostgreSQL, not a separate NoSQL server. |
| Technology justification | 1 | Documented | Report sections 2 and 9 explain the stack and vector choice; actual model is the ONNX MiniLM variant through Transformers.js. |
| DML operations | 4 | Implemented, verified | Registration/publishing INSERT, listing/offer UPDATE, marketplace SELECT; query 28 demonstrates vector DELETE in a rollback transaction. No general hard-delete button or confirmed-sale workflow is claimed. The team accepts vector DELETE for this category; no instructor confirmation is asserted. |
| Nested/correlated/recursive queries and joins | 4 | Implemented with multiple examples | Joins, correlated query 11, lateral latest-estimate lookup, nested queries, CTEs, grouping/HAVING, ranking/window functions exist. No recursive query exists. The team accepts multiple nested/correlated examples for the combined category; no recursive implementation or instructor confirmation is claimed. |
| Advanced SQL concepts | 6 | Implemented, verified | Schema 14: two views, SQL search function, PL/pgSQL timestamp function and three triggers. Query 27: CTE/window analytics. Trigger behavior, views/function execution, and correlated query ran in a disposable database. Transactions and indexes provide additional concepts. |
| Vector feature and RUD | 7 | Implemented, verified | Search API embeds natural-language text, applies SQL filters, ranks by cosine distance; workflow exercises search/paging. Query 28 returned five matches, changed one vector, deleted one, then restored all values on rollback in a disposable database. Synthetic vector replacement is demonstration-only. |
| Next.js interface | 3 | Implemented; visual evidence pending | Production build passes. Existing screenshots are historical pgAdmin evidence, not current app screenshots or a completed browser test. |
| API/database integration | 2 | Implemented, verified | 93 isolated workflow HTTP checks plus assertions; 22 GET-only checks across all three cities and all 12 listing details. Not every endpoint branch is tested. |
| Authentication/authorization | 4 | Implemented under team interpretation | scrypt hashes, signed HttpOnly sessions, active-account checks, customer/dealer/admin roles, API role/ownership guards. Roles are stored in DB; no end-user PostgreSQL GRANT roles or RLS policies. The team accepts database-backed API enforcement for this category; no instructor approval or database-native RLS is claimed. |
| Documentation and Git/GitHub | 2 | Updated; final submission pending | Architecture, complete schema/dictionary, audit and report updated. Initial checkout was clean at `e363f78`, matching locally recorded `origin/main`. Deliverables were published directly to main (2710355, 3115c6b and 92c02d0). A fresh fetch on 18 November matched local main before this documentation refresh; implementation test evidence remains dated 15 November. |
| Originality, contributions and viva | 4 | Documented; student review and viva remain | Ronit Prasad (PES1UG24CS549) and Sanjana Medarametla (PES1UG24CS908) are named. The report records joint development and equal primary responsibilities rather than exclusive authorship. Students must review this statement and demonstrate/explain their work; commit history is not treated as a precise effort measure. |
| **Total available** | **50** | **No score awarded** | Final grading belongs to the evaluator. |

## Corrected roadmap and actual scope

| Pasted roadmap area | Current position |
| --- | --- |
| Marketplace/details/estimates | Implemented: all 12 listings have estimates, embeddings and images. All three city listing/filter/empty-result flows checked. Prices remain illustrative estimates, separate from asking prices. |
| Database features | Functions, triggers, views, CTEs, transactions, indexes, joins/subqueries and vector search exist. At least four advanced concepts are demonstrated. Recursion is absent. |
| Semantic search | Implemented with local normalized 384-dimensional MiniLM vectors and cosine ranking plus city, budget, fuel/transmission and supported natural-language intent filters. Model files need an initial download/cache. |
| Authentication | Implemented for three roles. API guards protect data even though client pages themselves are not authorization boundaries. Password eye button defaults to hidden. |
| Dealer/admin | Dealer publishing, photos, price/status edits, inbox, inventory totals and admin verification exist. Listing editing currently covers price/status, not full vehicle-specification or description editing. General user-management UI is absent. |
| Buyer offers | Customers submit offers and view/edit their own amount, message and phone at `/offers`. Dealer “Mark contacted” closes editing. Inactive listings/unverified dealerships also block edits; history remains visible. External calls/emails are not detected. |
| Analytics | Inventory counts, total/average asking prices, and SQL city/dealer analytics exist. Confirmed sales, payments, sale revenue/profit and a sales ledger are absent. Sold listing status is not a sale transaction. |
| Documentation/design | Now reconciled with all 14 tables. No separate bids, sales, sessions or auctions table should be drawn: offers share listing_enquiries; sessions are signed cookies. request_limits is an independent operational table. |
| Final submission | Formal report PDF/source, names/SRNs, joint contributions and course diagrams are complete. Current app screenshots, student review, demo rehearsal and any instructor clarifications remain. No extra features were added during this audit. |

### Known implementation limits to explain honestly

- Database year checks are fixed at 1990–2030; chronology/current-year checks are stronger in the API. Description length, maximum photo count, verified-dealer publishing and offer-edit eligibility are also API rules.
- SQL does not independently require dealer_profiles.user_id to reference a user with the dealer role, or listing_enquiries.user_id to reference a customer. The API imposes offer-role restrictions.
- Registration numbers are not unique and primary photos have no unique partial index. These are not demonstrated integrity guarantees.
- Estimate bounds are ordered/positive, but no CHECK forces the central estimate inside them. Existing illustrative estimates do not constitute real valuation validation.
- No deployment/recovery/email provider is demonstrated. These are future improvements for public operation, not reasons to expand this college demo now.

## Verification performed on 15 November 2026

| Check / command | Result | Boundary |
| --- | --- | --- |
| `npm.cmd test` | Two authentication tests passed | Isolated copy of committed source. |
| `npm.cmd run lint` | Passed | Same copy; no rewrite options. |
| `npm.cmd run build` | Passed, including TypeScript | Same copy, real dependencies copied locally. Initial sandbox run could not fetch Google Fonts; network-enabled retry passed. Main checkout build files untouched. |
| `npm.cmd run test:workflow` | 93 HTTP checks plus assertions passed | Existing regression creates/removes its own temporary database. |
| `node docs/tools/audit-schema.mjs` | Passed | Configured database inspected in a repeatable-read READ ONLY transaction; schema/seed, trigger, function/view, correlated-query and vector RUD tests ran in a separate disposable database, subsequently removed. |
| `node docs/tools/check-public-cities.mjs` | 22 HTTP GET checks passed | Isolated production server; all cities, sorted petrol/budget results, empty results, and 12 details with images/estimates. Configured DB was only read. |
| Diagram/schema generation | Complete | `node docs/tools/render-schema.mjs` for the dictionary; `node docs/tools/render-course-diagrams.cjs` for the revised Chen and mapping sheets; PDF output visually inspected. |

Database evidence: [database validation](evidence/database-validation.json), [schema catalog](evidence/schema-catalog.json), [city validation](evidence/city-validation.json). Versions: PostgreSQL 18.6, pgvector 0.8.7. Observed data: 3 cities, 12 active listings, 12 estimates and 12 embeddings. Six seeded dealers own two demo cars each; the live database additionally has a Bangalore dealership (3 Bangalore / 2 Mumbai / 2 Kolkata profiles). No accounts were removed.

The automated workflow concentrates on one selected city for writes and semantic search; the separate GET audit adds browsing coverage for all cities. Browser interaction, responsive layouts, offer-edit/contact races under stress, every database CHECK failure and every API error branch are not comprehensively verified. Do not label this exhaustive testing.

## Submission checklist, in priority order

1. Review the report under the team's accepted interpretations: multiple nested/correlated queries, database-backed API authorization, and vector DELETE. The original rubric has been inspected; no recursive query or PostgreSQL RLS implementation is claimed.
2. Review the populated names/SRNs and balanced shared contribution statement. Rehearse design decisions, SQL explanations, role checks, vector storage/ranking and individual modifications.
3. Capture genuine current screenshots: marketplace, semantic filters, details/estimates/gallery, login without secrets, admin approval, dealer photo-free publishing/price/status/inbox, buyer offer edit and contacted lock, advanced SQL/vector outputs and test summaries.
4. Review output/pdf/AutoHubIQ_Project_Report.pdf and its editable Markdown source. Both now include diagrams, all fourteen typed tables, nested/correlated examples and validation evidence. The PDF was rendered and visually inspected; final student approval remains.
5. Review the canonical final report and GitHub deliverables. Prior report/diagram revisions are published on main; this documentation review changes no application behavior, accounts or database records.

Historical screenshots `05_demo_inventory_verified.png` and `21_database_integrity_checks.png` were visually inspected: the former shows the old one-dealer-per-city arrangement, and the latter covers only four orphan checks. Keep them explicitly historical; replace the inventory screenshot for a current-state submission. The remaining numbered screenshots are SQL-oriented files and should not be presented as proof of current app workflows without individual inspection.

## Course diagram revision 16 November 2026

The course example prompted a notation correction. The primary submission set
now contains Chen ER entity/attribute/relationship diagrams and separate
compartment-style ER-to-relational mapping sheets, not just physical table
boxes. Six modules cover all 14 entities and 13 FK relationships. Every mapped
column is retained; min-max participation, PK underlining, UNIQUE FK 1:1 mappings
and PK/FK shared identifiers are explicit. The revised report embeds the full
set. This is a documentation-only revision; the 15 November database validation
and application implementation are unchanged.

## Final documentation review 18 November 2026

The final submission entry point is [Final deliverables](final-deliverables.md). The report source is output/source/AutoHubIQ_Project_Report.md and its rendered PDF is output/pdf/AutoHubIQ_Project_Report.pdf; the redundant draft copy has been removed. Diagram pages contain only their title and diagram, including the report appendix. Current UI screenshots are still not claimed. Historical validation dates have been preserved; this is not a fresh application or database audit.
