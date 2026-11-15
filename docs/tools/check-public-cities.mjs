// GET-only evidence against an already-running local production server.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base=process.env.AUDIT_BASE_URL??'http://127.0.0.1:3103';
let checks=0;
async function get(path){const r=await fetch(base+path);assert.equal(r.status,200);checks++;return r.json();}
const {cities}=await get('/api/cities');const results=[];
for(const city of cities){
  const data=await get(`/api/listings?city_id=${city.city_id}`);
  assert.equal(data.listings.length,4,'Current demo has four cars per city');
  assert(data.listings.every(v=>v.city_name===city.city_name&&v.estimated_price));
  const filtered=await get(`/api/listings?city_id=${city.city_id}&max_price=1500000&fuel_type=Petrol&sort=price_asc`);
  assert(filtered.listings.every(v=>v.city_name===city.city_name&&Number(v.asking_price)<=1500000&&v.fuel_type==='Petrol'));
  assert(filtered.listings.every((v,i,rows)=>i===0||Number(rows[i-1].asking_price)<=Number(v.asking_price)));
  assert.equal((await get(`/api/listings?city_id=${city.city_id}&max_price=1`)).listings.length,0);
  for(const row of data.listings){const detail=await get(`/api/listings/${row.listing_id}`);assert(detail.listing.estimated_price);assert(detail.listing.images.length>0);}
  results.push({city:city.city_name,listings:data.listings.length,filtered:filtered.listings.length,empty_results_ok:true,details_with_images_and_estimates:4});
}
const result={date:'2026-11-15',city_checks:results,http_get_checks:checks,method:'GET only on isolated production server; configured database read without application writes'};
await writeFile(new URL('../evidence/city-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
