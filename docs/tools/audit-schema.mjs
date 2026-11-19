// Documentation-only audit. Reads the configured database; all DDL/DML tests use a disposable database.
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const nextEnv = require('@next/env');
const pg = require('pg');
const root = new URL('../../', import.meta.url);
nextEnv.loadEnvConfig(new URL('frontend/', root).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const source = new pg.Client({ connectionString: (process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL), connectionTimeoutMillis: 5000 });
const database = `autohubiq_audit_${randomBytes(8).toString('hex')}`;
const targetUrl = new URL((process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL));
targetUrl.pathname = `/${database}`;
const admin = new pg.Client({ connectionString: (process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL), connectionTimeoutMillis: 5000 });
let target, created = false;
const catalog = async client => ({
  columns: (await client.query(`SELECT c.relname AS table_name, a.attname AS column_name,
    format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS not_null,
    a.attidentity AS identity, pg_get_expr(d.adbin,d.adrelid) AS default_value
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='app' AND c.relkind='r' ORDER BY c.relname,a.attnum`)).rows,
  constraints: (await client.query(`SELECT c.relname AS table_name, con.conname AS name,
    con.contype AS kind, pg_get_constraintdef(con.oid,true) AS definition
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='app' ORDER BY c.relname,con.conname`)).rows,
  indexes: (await client.query(`SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_indexes WHERE schemaname='app' ORDER BY tablename,indexname`)).rows,
  views: (await client.query(`SELECT viewname AS name,definition FROM pg_views WHERE schemaname='app' ORDER BY viewname`)).rows,
  functions: (await client.query(`SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS arguments FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' ORDER BY p.proname`)).rows,
  triggers: (await client.query(`SELECT event_object_table AS table_name,trigger_name AS name,action_statement FROM information_schema.triggers WHERE trigger_schema='app' ORDER BY event_object_table,trigger_name`)).rows,
});
try {
  await source.connect();
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const metadata = await catalog(source);
  const versions = (await source.query(`SELECT current_setting('server_version') AS postgresql,(SELECT extversion FROM pg_extension WHERE extname='vector') AS pgvector`)).rows[0];
  const counts = (await source.query(`SELECT (SELECT count(*)::int FROM app.cities) cities,
    (SELECT count(*)::int FROM app.vehicle_listings) listings,
    (SELECT count(*)::int FROM app.vehicle_listings WHERE listing_status='active') active_listings,
    (SELECT count(*)::int FROM app.listing_price_estimates) estimates,
    (SELECT count(*)::int FROM app.listing_embeddings) embeddings`)).rows[0];
  const cities = (await source.query(`SELECT c.city_name,count(DISTINCT dp.dealer_id)::int AS dealers,count(DISTINCT vl.listing_id)::int AS listings FROM app.cities c LEFT JOIN app.dealer_profiles dp USING(city_id) LEFT JOIN app.vehicles v USING(dealer_id) LEFT JOIN app.vehicle_listings vl USING(vehicle_id) GROUP BY c.city_id ORDER BY c.city_name`)).rows;
  const coverage = (await source.query(`SELECT count(*) FILTER(WHERE e.listing_id IS NULL)::int AS missing_embeddings,
    count(*) FILTER(WHERE p.listing_id IS NULL)::int AS missing_estimates FROM app.vehicle_listings vl
    LEFT JOIN app.listing_embeddings e USING(listing_id)
    LEFT JOIN LATERAL (SELECT listing_id FROM app.listing_price_estimates WHERE listing_id=vl.listing_id LIMIT 1) p ON true
    WHERE vl.listing_status='active'`)).rows[0];
  const integrity = (await source.query(await readFile(new URL('database/queries/26_database_integrity_checks.sql',root),'utf8'))).rows;
  assert(integrity.every(row=>Number(row.issue_count)===0));
  const vectors = (await source.query('SELECT listing_id,embedding::text,source_text,model_name FROM app.listing_embeddings')).rows;
  await source.query('ROLLBACK');
  await admin.connect(); await admin.query(`CREATE DATABASE "${database}"`); created=true;
  target = new pg.Client({connectionString:targetUrl.href}); await target.connect();
  for (const directory of ['schema','seed']) {
    const location = new URL(`database/${directory}/`,root);
    for (const file of (await readdir(location)).filter(x=>x.endsWith('.sql')).sort()) await target.query(await readFile(new URL(file,location),'utf8'));
  }
  const clean = await catalog(target);
  assert.deepEqual(clean.columns,metadata.columns,'Live columns must match fresh schema');
  assert.deepEqual(clean.constraints,metadata.constraints,'Live constraints must match fresh schema');
  assert.deepEqual(clean.indexes,metadata.indexes,'Live indexes must match fresh schema');
  assert.deepEqual(clean.triggers,metadata.triggers);
  assert.deepEqual(clean.views,metadata.views);
  assert.deepEqual(clean.functions,metadata.functions);
  for (const e of vectors) await target.query(`INSERT INTO app.listing_embeddings SELECT $1,$2::vector,$3,$4,CURRENT_TIMESTAMP WHERE EXISTS(SELECT 1 FROM app.vehicle_listings WHERE listing_id=$1)`,[e.listing_id,e.embedding,e.source_text,e.model_name]);
  await target.query(await readFile(new URL('database/queries/27_advanced_database_features.sql',root),'utf8'));
  await target.query(await readFile(new URL('database/queries/11_above_city_average.sql',root),'utf8'));
  const triggerTests=[];
  for(const [table,key] of [['dealer_profiles','dealer_id'],['vehicles','vehicle_id'],['vehicle_listings','listing_id']]) {
    await target.query('BEGIN');
    const row=(await target.query(`UPDATE app.${table} SET updated_at='2000-01-01' WHERE ${key}=(SELECT min(${key}) FROM app.${table}) RETURNING updated_at`)).rows[0];
    assert(new Date(row.updated_at).getFullYear()>2000); await target.query('ROLLBACK'); triggerTests.push(table);
  }
  const fingerprint=`SELECT md5(string_agg(row_to_json(e)::text,'|' ORDER BY listing_id)) AS value FROM app.listing_embeddings e`;
  const before=(await target.query(fingerprint)).rows[0].value;
  const rud=await target.query(await readFile(new URL('database/queries/28_vector_read_update_delete_demo.sql',root),'utf8'));
  assert.equal((await target.query(fingerprint)).rows[0].value,before);
  assert.equal(rud.find(r=>r.command==='UPDATE').rowCount,1); assert.equal(rud.find(r=>r.command==='DELETE').rowCount,1);
  const result={date:'2026-11-15',versions,counts,table_count:new Set(metadata.columns.map(c=>c.table_name)).size,cities,coverage,integrity,
    schema_matches_clean_install:true,trigger_tests:triggerTests,advanced_queries_passed:true,vector_rud:{matches:rud.find(r=>r.fields.some(f=>f.name==='similarity')).rowCount,updated:1,deleted:1,rollback_restored:true},configured_database_access:'READ ONLY; tests ran in disposable database'};
  const evidence=new URL('docs/evidence/',root);await mkdir(evidence,{recursive:true});
  await writeFile(new URL('schema-catalog.json',evidence),JSON.stringify({date:result.date,...metadata},null,2)+'\n');
  await writeFile(new URL('database-validation.json',evidence),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {
  await source.end().catch(()=>{}); if(target) await target.end();
  if(created) { assert(/^autohubiq_audit_[a-f0-9]{16}$/.test(database));await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`); }
  await admin.end().catch(()=>{});
}
