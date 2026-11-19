// Relational mapping from live metadata. Reads no application records.
const fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..'),req=createRequire(path.join(root,'frontend/package.json'));
req('@next/env').loadEnvConfig(path.join(root,'frontend'));
const {Client}=req('pg');
const PDFDocument=require('../../tmp/report-tools/node_modules/pdfkit/js/pdfkit.js');
const SVGtoPDF=require('../../tmp/report-tools/node_modules/svg-to-pdfkit');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,t,size=29,extra='')=>`<text x="${x}" y="${y}" font-family="Times New Roman" font-size="${size}" ${extra}>${esc(t)}</text>`;
(async()=>{
 const c=new Client({connectionString:process.env.DATABASE_ADMIN_URL??process.env.DATABASE_URL});let cols,cons;
 try{await c.connect();await c.query('BEGIN READ ONLY');
 cols=(await c.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='app' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='app') ORDER BY table_name,ordinal_position")).rows;
 cons=(await c.query("SELECT c.relname AS table_name,con.contype AS kind,pg_get_constraintdef(con.oid,true) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND con.contype IN ('p','f','u')")).rows;
 await c.query('ROLLBACK');}finally{await c.end();}
 if(new Set(cols.map(c=>c.table_name)).size!==15||cons.filter(c=>c.kind==='f').length!==14)throw Error('Review changed schema');
 const pk=t=>cons.find(c=>c.table_name===t&&c.kind==='p').definition.match(/\(([^)]+)\)/)[1].split(',').map(s=>s.trim());
 const fks=t=>cons.filter(c=>c.table_name===t&&c.kind==='f').map(c=>{const m=c.definition.match(/FOREIGN KEY \(([^)]+)\) REFERENCES app\.(\w+)\(([^)]+)\)/);if(!m)throw Error(c.definition);return {column:m[1],parent:m[2],key:m[3]};});


 const positions={users:[200,200],listing_enquiries:[1300,200],manufacturers:[2400,200],dealer_profiles:[200,1000],cities:[1300,1000],vehicle_models:[2400,1000],vehicles:[200,1800],request_limits:[1300,1800],vehicle_variants:[2400,1800],vehicle_listings:[200,2700],listing_images:[1300,2700],fuel_economy_references:[2400,2700],listing_price_estimates:[200,3600],listing_image_data:[1300,3600],listing_embeddings:[2400,3600]};
 const W=3300,H=4240,cardW=650,rowH=43;
 const cards=[],ports={};
 for(const [table,[x,y]] of Object.entries(positions)){
  const columns=cols.filter(c=>c.table_name===table),keys=pk(table),refs=fks(table);
  const uq=cons.filter(c=>c.table_name===table&&c.kind==='u').map(c=>c.definition.replace('UNIQUE','UQ'));
  if(table==='vehicle_listings')uq.push("UQ (vehicle_id) when listing_status = 'active'");
  const h=82+columns.length*rowH+(uq.length?65:0);
  cards.push(`<rect x="${x}" y="${y}" width="${cardW}" height="${h}" fill="white" stroke="#253044" stroke-width="2.5"/><rect x="${x}" y="${y}" width="${cardW}" height="65" fill="#eef1f5" stroke="#253044" stroke-width="2.5"/>`,text(x+23,y+43,table,34,'font-weight="bold"'));
  columns.forEach((c,i)=>{
   const cy=y+95+i*rowH,isPk=keys.includes(c.column_name),fk=refs.find(f=>f.column===c.column_name);
   ports[table+'.'+c.column_name]={left:[x,cy-9],right:[x+cardW,cy-9]};
   if(i%2===1)cards.push(`<rect x="${x+2}" y="${cy-29}" width="${cardW-4}" height="${rowH}" fill="#f7f8fa"/>`);
   cards.push(text(x+23,cy,c.column_name,29,isPk?'font-weight="bold" text-decoration="underline"':''),text(x+548,cy,[isPk?'PK':'',fk?'FK':''].filter(Boolean).join('/'),25,'fill="#34435c"'));
  });
  if(uq.length)cards.push(`<line x1="${x}" y1="${y+82+columns.length*rowH}" x2="${x+cardW}" y2="${y+82+columns.length*rowH}" stroke="#b3bac5"/>`,text(x+23,y+122+columns.length*rowH,uq.join(' ; '),24));
 }
 const routes=[
 ['dealer_profiles.user_id','users.user_id','left','left',130],
 ['dealer_profiles.city_id','cities.city_id','right','left',1100],
 ['vehicle_models.manufacturer_id','manufacturers.manufacturer_id','right','right',3140],
 ['vehicle_variants.model_id','vehicle_models.model_id','right','right',3180],
 ['vehicles.dealer_id','dealer_profiles.dealer_id','left','left',100],
 ['vehicles.variant_id','vehicle_variants.variant_id','right','left',[[1000,0],[1000,1680],[2300,1680],[2300,0]]],
 ['vehicle_listings.vehicle_id','vehicles.vehicle_id','left','left',70],
 ['listing_images.listing_id','vehicle_listings.listing_id','left','right',1150],
 ['listing_image_data.image_id','listing_images.image_id','left','left',1210],
 ['listing_price_estimates.listing_id','vehicle_listings.listing_id','left','left',40],
 ['listing_enquiries.user_id','users.user_id','left','right',1060],
 ['listing_enquiries.listing_id','vehicle_listings.listing_id','left','right',[[1180,0],[1180,2520],[1000,2520],[1000,0]]],
 ['listing_embeddings.listing_id','vehicle_listings.listing_id','left','right',[[2250,0],[2250,3500],[940,3500],[940,0]]],
 ['fuel_economy_references.variant_id','vehicle_variants.variant_id','right','right',3140]
 ];
 const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="white"/>`,text(200,80,'AutoHubIQ ER to relational diagram',49,'font-weight="bold"'),text(200,135,'PK = primary key (underlined)     FK = foreign key     Lines connect FK rows to their referenced PK rows.',28)];
 let arrows=0;
 const colors=['#245a81','#97622b','#426c4f','#72558a'];
 for(const [source,target,sideA,sideB,route] of routes){
  const [table,column]=source.split('.');if(!fks(table).some(f=>f.column===column&&f.parent+'.'+f.key===target))throw Error('Invalid relationship '+source);
  const a=ports[source][sideA],b=ports[target][sideB];
  const bends=typeof route==='number'?[[route,a[1]],[route,b[1]]]:route.map(([x,y],i)=>[x,y||((i===0)?a[1]:b[1])]);
  const points=[a,...bends,b],d=points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' '),color=colors[arrows%colors.length];
  out.push(`<path d="${d}" fill="none" stroke="white" stroke-width="11" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linejoin="round"/>`);
  const dir=sideB==='left'?1:-1;
  out.push(`<path d="M${b[0]-dir*15} ${b[1]-9} L${b[0]} ${b[1]} L${b[0]-dir*15} ${b[1]+9}" fill="none" stroke="${color}" stroke-width="3.5"/><circle cx="${a[0]}" cy="${a[1]}" r="5" fill="${color}"/>`);arrows++;
 }
 out.push(...cards);
 out.push('</svg>');const svg=out.join('\n');
 fs.writeFileSync(path.join(root,'docs/diagrams/AutoHubIQ_Relational.svg'),svg);
 const target=path.join(root,'output/pdf/AutoHubIQ_ER_to_Relational.pdf');
 const pdf=new PDFDocument({size:[W/2,H/2],margin:0,info:{Title:'AutoHubIQ ER to relational diagram',Author:'AutoHubIQ Project Team'}}),stream=fs.createWriteStream(target);pdf.pipe(stream);
 SVGtoPDF(pdf,svg,0,0,{width:W/2,height:H/2,preserveAspectRatio:'xMidYMid meet',fontCallback:(f,b)=>b?'C:/Windows/Fonts/timesbd.ttf':'C:/Windows/Fonts/times.ttf'});
 if(arrows!==14)throw Error('Missing FK references');pdf.end();stream.on('finish',()=>console.log(JSON.stringify({pages:1,tables:15,columns:cols.length,foreignKeys:arrows,file:target})));
})().catch(e=>{console.error(e);process.exitCode=1;});
