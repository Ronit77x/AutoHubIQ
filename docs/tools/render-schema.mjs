// Generate schema documentation and SVG diagrams from catalog metadata; no database writes.
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
const lines=['# Relational schema and data dictionary','','Audited 15 November 2026 against PostgreSQL 18.6 / pgvector 0.8.7. All 14 base tables, columns, constraints, indexes, views, functions, and triggers match a fresh application of the repository SQL scripts. No record values are included.','','Sources: [catalog snapshot](evidence/schema-catalog.json), [database verification](evidence/database-validation.json), [DDL](../database/schema/). Regenerate from the repository root with `node docs/tools/audit-schema.mjs` then `node docs/tools/render-schema.mjs`.','','## Notation and enforcement','','PK = primary key; FK = foreign key; UK = unique-constraint membership. Every FK is NOT NULL on the child. A parent may have zero children. dealer_profiles.user_id, listing_embeddings.listing_id, and listing_image_data.image_id permit at most one corresponding child. Composite unique keys are listed separately; their members are not individually unique.','','Default — means no explicit default. Identity columns are generated ALWAYS. PostgreSQL CHECK expressions permit NULL unless NOT NULL is also specified. FK deletion uses NO ACTION unless CASCADE is explicitly listed. End-user roles and ownership are enforced by API queries; the tables have no RLS policies.','','## Relational schemas',''];
for(const [t,cols] of Object.entries(tables)) lines.push(`- **app.${t}**(${cols.map(c=>c.column_name+(keys[t][c.column_name]?` [${keys[t][c.column_name].join(',')}]`:'')).join(', ')})`);
lines.push('','## Column definitions, constraints, and indexes','');
for(const [t,cols] of Object.entries(tables)) {
  lines.push(`### app.${t}`,'','| Column | PostgreSQL type | Nullable | Default / generation | Key membership |','| --- | --- | --- | --- | --- |');
  for(const c of cols) lines.push(`| \`${c.column_name}\` | \`${c.type}\` | ${c.not_null?'No':'Yes'} | ${safe(c.identity?'GENERATED ALWAYS AS IDENTITY':c.default_value??'—')} | ${keys[t][c.column_name]?.join(', ')??'—'} |`);
  lines.push('','**Exact constraints**','',...constraints(t).map(c=>`- \`${c.name}\`: \`${safe(c.definition)}\``),'','**Indexes**','',...catalog.indexes.filter(i=>i.table_name===t).map(i=>`- \`${i.name}\`: \`${safe(i.definition)}\``),'');
}
lines.push('## Derived objects','',...catalog.views.map(v=>`- View \`app.${v.name}\`; full definition in the catalog snapshot and schema 14.`),...catalog.functions.map(f=>`- Function \`app.${f.name}(${f.arguments})\`.`),...catalog.triggers.map(t=>`- \`${t.name}\` on \`app.${t.table_name}\`: \`${t.action_statement}\` before each update.`),'','## API rules that are not database constraints','',
'- Only verified dealer accounts may publish. FKs do not independently check user role or verification state.',
'- Vehicle-year CHECKs are fixed at 1990–2030. The create-listing API additionally rejects future years and registration before manufacture.',
'- Description length 20–5000 and a maximum of six photos are API rules. Stored image payloads have a database 2 MB CHECK; the API also validates and normalizes uploads.',
'- A buyer may edit an owned offer only while the listing is active, the dealer is verified, and contacted_at is NULL. The API uses transaction row locks; this is not a database CHECK or RLS policy.',
'- Offer positivity and conditional NULL rules are database-enforced. The API additionally validates decimal input before PostgreSQL numeric conversion.',
'- listing_enquiries.updated_at is set by the offer API, not the generic timestamp trigger. users.updated_at has a default but no update trigger.',
'- Mark contacted is entered by the dealer, not detection of an external call/email. Sold listing status does not record a sale transaction or confirmed sale price.',
'- Registration numbers are not unique; primary-image selection has no unique partial index. Do not claim these constraints in the report.',
'- Positive estimate bounds and lower <= upper are enforced. No CHECK requires the central estimate to lie within those bounds.','');
await writeFile(new URL('docs/relational-schema.md',root),lines.join('\n'));
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
async function diagram(name,selected,positions,title) {
  const rels=relations.filter(r=>selected.includes(r.parent)&&selected.includes(r.child));
  const m=['erDiagram',...rels.map(r=>`    ${r.parent.toUpperCase()} ||--${r.card==='0..1'?'o|':'o{'} ${r.child.toUpperCase()} : ${r.fk}`)];
  for(const t of selected) {m.push(`    ${t.toUpperCase()} {`);for(const c of tables[t]) m.push(`        ${c.type.replaceAll('character varying','varchar').replace(/[^a-zA-Z0-9_\[\]]/g,'_')} ${c.column_name}${keys[t][c.column_name]?' '+keys[t][c.column_name].join(','):''}`);m.push('    }');}
  await writeFile(new URL(name+'.mmd',out),m.join('\n')+'\n');
  const boxes=Object.fromEntries(selected.map(t=>[t,{x:positions[t][0],y:positions[t][1],w:445,h:58+tables[t].length*23}]));
  const width=Math.max(...Object.values(boxes).map(b=>b.x+b.w))+40,height=Math.max(...Object.values(boxes).map(b=>b.y+b.h))+80;
  const s=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${xml(title)}</title><desc id="desc">Parent-to-child connectors show cardinalities. All foreign keys are mandatory on the child; parents may have zero children. Full constraints and nullability are in the data dictionary.</desc>`, '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#64748b"/></marker></defs>',`<rect width="${width}" height="${height}" fill="#f8fafc"/><text x="40" y="38" font-family="Arial" font-size="24" font-weight="bold" fill="#0f172a">${xml(title)}</text><text x="40" y="67" font-family="Arial" font-size="15" fill="#475569">15 Nov 2026 · PK primary · FK foreign · UK unique membership · Parent 1 → child 0..* / 0..1</text>`];
  // Route edges through row gutters. Same-row edges arc above the boxes.
  const incomingSlots={};
  for(const [i,r] of rels.entries()) {
    const a=boxes[r.parent],b=boxes[r.child];let path,lx,ly;
    const slot=incomingSlots[r.child]??0;incomingSlots[r.child]=slot+1;
    const incomingCount=rels.filter(edge=>edge.child===r.child).length;
    const sx=a.x+a.w,sy=a.y+48+(i%4)*18,ex=b.x+b.w*(slot+1)/(incomingCount+1),ey=b.y,gutter=sx+12+(i%3)*7,mid=b.y-22-(i%3)*15;
    path=`M${sx} ${sy} H${gutter} V${mid} H${ex} V${ey}`;lx=ex+5;ly=ey-7;
    s.push(`<path d="${path}" fill="none" stroke="${['#64748b','#0f766e','#7c3aed'][i%3]}" stroke-width="1.5" marker-end="url(#arrow)"/><text x="${lx}" y="${ly}" font-family="Arial" font-size="12" fill="#334155">1 → ${r.card}</text>`);
  }
  for(const [t,b] of Object.entries(boxes)) {s.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="white" stroke="#94a3b8"/><rect x="${b.x}" y="${b.y}" width="${b.w}" height="37" rx="8" fill="#0f766e"/><text x="${b.x+12}" y="${b.y+25}" font-family="Arial" font-size="18" font-weight="bold" fill="white">${t}</text>`);tables[t].forEach((c,i)=>s.push(`<text x="${b.x+12}" y="${b.y+59+i*23}" font-family="Consolas,monospace" font-size="13" fill="#0f172a">${xml((keys[t][c.column_name]?.join(',')+' ').replace('undefined ','')+c.column_name+' : '+c.type)}</text>`));}
  s.push('</svg>');await writeFile(new URL(name+'.svg',out),s.join('\n'));
}
const full=['cities','users','manufacturers','request_limits','dealer_profiles','vehicles','vehicle_variants','vehicle_models','listing_enquiries','vehicle_listings','listing_images','listing_image_data','listing_embeddings','listing_price_estimates'];
await diagram('erd-complete',full,Object.fromEntries(full.map((t,i)=>[t,[40+(i%4)*510,140+Math.floor(i/4)*660]])),'AutoHubIQ · complete physical schema (14 tables)');
const market=['cities','dealer_profiles','manufacturers','vehicle_models','vehicle_variants','vehicles','vehicle_listings','listing_images','listing_price_estimates','listing_embeddings','listing_image_data'];
await diagram('erd-marketplace',market,Object.fromEntries(market.map((t,i)=>[t,[40+(i%3)*510,140+Math.floor(i/3)*630]])),'AutoHubIQ · marketplace schema');
await diagram('erd-buyer-offers',['users','dealer_profiles','vehicles','vehicle_listings','listing_enquiries'],{users:[40,140],dealer_profiles:[550,140],vehicles:[1060,140],listing_enquiries:[40,820],vehicle_listings:[550,820]},'AutoHubIQ · buyer offers and dealer ownership');
console.log('Generated relational schema, three Mermaid sources, and three SVG ER diagrams.');
