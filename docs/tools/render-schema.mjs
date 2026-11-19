// Generate schema documentation from catalog metadata; no database writes.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root=new URL('../../',import.meta.url), out=new URL('docs/diagrams/',root);
const catalog=JSON.parse(await readFile(new URL('docs/evidence/schema-catalog.json',root),'utf8'));
await mkdir(out,{recursive:true});
const tables=Object.groupBy(catalog.columns,c=>c.table_name);
const constraints=t=>catalog.constraints.filter(c=>c.table_name===t);
const keys={},relations=[];
for(const t of Object.keys(tables)) {
  keys[t]={};
  for(const c of constraints(t)) {
    const columns=c.definition.match(/\(([^)]+)\)/)?.[1];
    if(['p','f','u'].includes(c.kind)&&columns) for(const col of columns.split(', ')) (keys[t][col]??=[]).push({p:'PK',f:'FK',u:'UK'}[c.kind]);
    if(c.kind==='f') relations.push({parent:c.definition.match(/REFERENCES app\.(\w+)/)[1],child:t,fk:columns,card:constraints(t).some(k=>['p','u'].includes(k.kind)&&k.definition.match(/\(([^)]+)\)/)?.[1]===columns)?'0..1':'0..*'});
  }
}
const safe=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const lines=['# Relational schema and data dictionary','','Audited 15 November 2026 against PostgreSQL 18.6 / pgvector 0.8.7. All 14 base tables, columns, constraints, indexes, views, functions, and triggers match a fresh application of the repository SQL scripts. No record values are included.','','Sources: [catalog snapshot](evidence/schema-catalog.json), [database verification](evidence/database-validation.json), [DDL](../database/schema/). Regenerate from the repository root with `node docs/tools/audit-schema.mjs` then `node docs/tools/render-schema.mjs`.','','## Notation and enforcement','','PK = primary key; FK = foreign key; UK = unique-constraint membership. Every FK is NOT NULL on the child. A parent may have zero children. dealer_profiles.user_id, listing_embeddings.listing_id, and listing_image_data.image_id permit at most one corresponding child. Composite unique keys are listed separately; their members are not individually unique.','','Default — means no explicit default. Identity columns are generated ALWAYS. PostgreSQL CHECK expressions permit NULL unless NOT NULL is also specified. FK deletion uses NO ACTION unless CASCADE is explicitly listed. Security update 19 November 2026: schema 20 enforces roles and ownership with RLS, column grants and guarded functions in addition to server-side checks. The dated audit snapshot below predates the mileage-reference and security additions.','','## Relational schemas',''];
for(const [t,cols] of Object.entries(tables)) lines.push(`- **app.${t}**(${cols.map(c=>c.column_name+(keys[t][c.column_name]?` [${keys[t][c.column_name].join(',')}]`:'')).join(', ')})`);
lines.push('','## Column definitions, constraints, and indexes','');
for(const [t,cols] of Object.entries(tables)) {
  lines.push(`### app.${t}`,'','| Column | PostgreSQL type | Nullable | Default / generation | Key membership |','| --- | --- | --- | --- | --- |');
  for(const c of cols) lines.push(`| \`${c.column_name}\` | \`${c.type}\` | ${c.not_null?'No':'Yes'} | ${safe(c.identity?'GENERATED ALWAYS AS IDENTITY':c.default_value??'—')} | ${keys[t][c.column_name]?.join(', ')??'—'} |`);
  lines.push('','**Exact constraints**','',...constraints(t).map(c=>`- \`${c.name}\`: \`${safe(c.definition)}\``),'','**Indexes**','',...catalog.indexes.filter(i=>i.table_name===t).map(i=>`- \`${i.name}\`: \`${safe(i.definition)}\``),'');
}
lines.push('## Derived objects','',...catalog.views.map(v=>`- View \`app.${v.name}\`; full definition in the catalog snapshot and schema 14.`),...catalog.functions.map(f=>`- Function \`app.${f.name}(${f.arguments})\`.`),...catalog.triggers.map(t=>`- \`${t.name}\` on \`app.${t.table_name}\`: \`${t.action_statement}\` before each update.`),'','## Additional validation and workflow rules','',
'- Only verified dealer accounts may publish. FKs do not independently check user role or verification state.',
'- Vehicle-year CHECKs are fixed at 1990–2030. The listing-creation function additionally rejects future years and registration before manufacture.',
'- Description length 20–5000 and a maximum of six photos are server-side rules. Stored image payloads have a database 2 MB CHECK; the server-side function also validates and normalizes uploads.',
'- A buyer may edit an owned offer only while the listing is active, the dealer is verified, and contacted_at is NULL. The server-side function uses guarded offer row locks. Schema 20 also enforces ownership and editable state with RLS and an update trigger.',
'- Offer positivity and conditional NULL rules are database-enforced. The server-side function additionally validates decimal input before PostgreSQL numeric conversion.',
'- listing_enquiries.updated_at is set by the offer Server Action, not the generic timestamp trigger. users.updated_at has a default but no update trigger.',
'- Mark contacted is entered by the dealer, not detection of an external call/email. Sold listing status does not record a sale transaction or confirmed sale price.',
'- Registration numbers are not unique; primary-image selection has no unique partial index. Do not claim these constraints in the report.',
'- Positive estimate bounds and lower <= upper are enforced. No CHECK requires the central estimate to lie within those bounds.','');
await writeFile(new URL('docs/relational-schema.md',root),lines.join('\n'));
console.log('Generated relational schema and data dictionary. Generate course diagrams with node docs/tools/render-complete-er.cjs and node docs/tools/render-complete-relational.cjs.');
