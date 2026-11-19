// Single Chen ER diagram. Metadata only; no account or inventory values read.
const fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..');
const requireFrontend=createRequire(path.join(root,'frontend/package.json'));
const pg=requireFrontend('pg');
requireFrontend('@next/env').loadEnvConfig(path.join(root,'frontend'));
const PDFDocument=require('../../tmp/report-tools/node_modules/pdfkit/js/pdfkit.js');
const SVGtoPDF=require('../../tmp/report-tools/node_modules/svg-to-pdfkit');
const positions={
 users:[1900,450], cities:[650,1500], dealer_profiles:[1900,1500],
 listing_enquiries:[3200,450], manufacturers:[4500,450], vehicle_models:[4500,1500],
 vehicles:[1900,2600], vehicle_listings:[3200,2600], vehicle_variants:[4500,2600],
 listing_images:[1900,3700], listing_image_data:[650,3700], listing_price_estimates:[3200,3700],
 listing_embeddings:[3200,4800], fuel_economy_references:[4500,3700], request_limits:[650,4800]
};
// Each explicit path runs through whitespace between entity/attribute clusters.
// At a crossing there is no junction: relationships exist only at diamonds.
const edges=[
 ['cities','dealer_profiles','city_id','located in',[1275,1030],[[650,1464],[650,1030],[1180,1030]],[[1370,1030],[1820,1030],[1820,1464]]],
 ['users','dealer_profiles','user_id','owns profile',[1980,975],[[1980,486],[1980,928]],[[1980,1022],[1980,1464]]],
 ['users','listing_enquiries','user_id','submits',[2550,180],[[1820,414],[1820,180],[2455,180]],[[2645,180],[3200,180],[3200,414]]],
 ['manufacturers','vehicle_models','manufacturer_id','makes',[4500,975],[[4500,486],[4500,928]],[[4500,1022],[4500,1464]]],
 ['vehicle_models','vehicle_variants','model_id','offers variant',[4500,2050],[[4500,1536],[4500,2003]],[[4500,2097],[4500,2564]]],
 ['dealer_profiles','vehicles','dealer_id','owns inventory',[1980,2050],[[1980,1536],[1980,2003]],[[1980,2097],[1980,2564]]],
 ['vehicle_variants','vehicles','variant_id','describes',[3700,2200],[[4420,2564],[4420,2200],[3795,2200]],[[3605,2200],[1820,2200],[1820,2564]]],
 ['vehicles','vehicle_listings','vehicle_id','listed as',[2550,3000],[[1900,2636],[1900,3000],[2455,3000]],[[2645,3000],[3100,3000],[3100,2636]]],
 ['vehicle_listings','listing_enquiries','listing_id','receives',[3120,1650],[[3120,2564],[3120,1697]],[[3120,1603],[3120,486]]],
 ['vehicle_listings','listing_images','listing_id','has image',[2550,3250],[[3200,2636],[3200,3250],[2645,3250]],[[2455,3250],[1980,3250],[1980,3664]]],
 ['listing_images','listing_image_data','image_id','stores upload',[1275,4200],[[1820,3736],[1820,4200],[1370,4200]],[[1180,4200],[650,4200],[650,3736]]],
 ['vehicle_listings','listing_price_estimates','listing_id','has estimate',[3300,3225],[[3300,2636],[3300,3178]],[[3300,3272],[3300,3664]]],
 ['vehicle_listings','listing_embeddings','listing_id','has embedding',[3850,4200],[[3330,2636],[3330,2900],[3850,2900],[3850,4153]],[[3850,4247],[3850,4400],[3280,4400],[3280,4764]]],
 ['vehicle_variants','fuel_economy_references','variant_id','has reference',[4500,3150],[[4500,2636],[4500,3103]],[[4500,3197],[4500,3664]]]
];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=(x,y,t,size=26,extra='')=>`<text x="${x}" y="${y}" font-family="Times New Roman" font-size="${size}" fill="black" ${extra}>${esc(t)}</text>`;
const poly=(pts,double=false)=>`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="black" stroke-width="2.5"/>`+(double?`<polyline points="${pts.map(([x,y])=>[x+6,y+6].join(',')).join(' ')}" fill="none" stroke="black" stroke-width="2.5"/>`:'');
(async()=>{
 const client=new pg.Client({connectionString:process.env.DATABASE_ADMIN_URL??process.env.DATABASE_URL});
 let columns,constraints;
 try{await client.connect();await client.query('BEGIN READ ONLY');
 columns=(await client.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='app' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='app') ORDER BY table_name,ordinal_position")).rows;
 constraints=(await client.query("SELECT c.relname AS table_name,con.contype AS kind,pg_get_constraintdef(con.oid,true) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND con.contype IN ('p','f','u')")).rows;
 await client.query('ROLLBACK');}finally{await client.end();}
 const tables=[...new Set(columns.map(x=>x.table_name))];
 if(tables.length!==15||constraints.filter(x=>x.kind==='f').length!==edges.length)throw new Error('Schema changed; review master diagram');
 const keys=t=>constraints.find(c=>c.table_name===t&&c.kind==='p').definition.match(/\(([^)]+)\)/)[1].split(',').map(x=>x.trim());
 for(const [parent,child,fk] of edges)if(!constraints.some(c=>c.table_name===child&&c.kind==='f'&&c.definition.includes(`(${fk})`)&&c.definition.includes(`REFERENCES app.${parent}(`)))throw new Error('Relationship does not match schema: '+child+'.'+fk);
 const out=['<svg xmlns="http://www.w3.org/2000/svg" width="5200" height="5050" viewBox="0 0 5200 5050"><title>AutoHubIQ ER diagram</title><rect width="5200" height="5050" fill="white"/>',text(120,70,'AutoHubIQ ER diagram',48,'font-weight="bold"')];
 for(const [parent,child,fk,label,[x,y],a,b] of edges){
  const one=constraints.some(c=>c.table_name===child&&['p','u'].includes(c.kind)&&c.definition.match(/\(([^)]+)\)/)?.[1]===fk);
  out.push(poly(a),poly(b,true),`<polygon points="${x},${y-47} ${x+95},${y} ${x},${y+47} ${x-95},${y}" fill="white" stroke="black" stroke-width="2.5"/>`,text(x,y+8,label,23,'text-anchor="middle"'));
  const p=a[0],c=b.at(-1);
  const parentLabel=child==='listing_embeddings'?[3400,2880]:[p[0]+18,p[1]+(p[1]>positions[parent][1]?42:-18)];
  out.push(text(...parentLabel,one?'(0,1)':'(0,N)',25),text(c[0]+18,c[1]+(c[1]>positions[child][1]?42:-18),'(1,1)',25));
 }
 for(const table of tables){
  const [x,y]=positions[table]; if(!positions[table])throw new Error('Missing table '+table);
  const fks=edges.filter(e=>e[1]===table).map(e=>e[2]);
  const attrs=columns.filter(c=>c.table_name===table&&(!fks.includes(c.column_name)||keys(table).includes(c.column_name)));
  const halves=[attrs.slice(0,Math.ceil(attrs.length/2)),attrs.slice(Math.ceil(attrs.length/2))];
  halves.forEach((group,side)=>group.forEach((a,i)=>{
   const ax=x+(side?-345:345),ay=y+(i-(group.length-1)/2)*70;
   const ex=x+(side?-155:155),dx=ex-ax,dy=y-ay,scale=1/Math.sqrt(dx*dx/(175*175)+dy*dy/(26*26));
   out.push(poly([[ex,y],[ax+dx*scale,ay+dy*scale]]),`<ellipse cx="${ax}" cy="${ay}" rx="175" ry="26" fill="white" stroke="black" stroke-width="2"/>`,text(ax,ay+8,a.column_name,24,`text-anchor="middle" ${keys(table).includes(a.column_name)?'text-decoration="underline" font-weight="bold"':''}`));
  }));
  out.push(`<rect x="${x-155}" y="${y-36}" width="310" height="72" fill="white" stroke="black" stroke-width="3"/>`,text(x,y+9,table,table.length>21?25:28,'text-anchor="middle" font-weight="bold"'));
 }
 out.push('</svg>');
 const svg=out.join('\n');fs.mkdirSync(path.join(root,'docs/diagrams'),{recursive:true});
 fs.writeFileSync(path.join(root,'docs/diagrams/AutoHubIQ_Complete_ER.svg'),svg);
 const pdf=new PDFDocument({size:[2400,2480],margin:0,info:{Title:'AutoHubIQ ER diagram',Author:'AutoHubIQ Project Team'}});
 const file=path.join(root,'output/pdf/AutoHubIQ_Complete_ER.pdf');const stream=fs.createWriteStream(file);pdf.pipe(stream);
 SVGtoPDF(pdf,svg,18,18,{width:2364,height:2444,preserveAspectRatio:'xMidYMid meet',fontCallback:(f,b)=>b?'C:/Windows/Fonts/timesbd.ttf':'C:/Windows/Fonts/times.ttf'});pdf.end();
 stream.on('finish',()=>console.log(JSON.stringify({file,pages:1,entities:tables.length,relationships:edges.length,attributes:columns.length-edges.filter(e=>!keys(e[1]).includes(e[2])).length})));
})().catch(e=>{console.error(e);process.exitCode=1;});
