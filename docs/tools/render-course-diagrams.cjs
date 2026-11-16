// Chen ER notation and ER-to-relational mapping, generated from audited metadata.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/diagrams/course');
fs.mkdirSync(out,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/schema-catalog.json'),'utf8'));
const tables=Object.groupBy(catalog.columns,c=>c.table_name);
const constraints=t=>catalog.constraints.filter(c=>c.table_name===t);
const pk=t=>constraints(t).find(c=>c.kind==='p').definition.match(/\(([^)]+)\)/)[1];
const relationships=catalog.constraints.filter(c=>c.kind==='f').map(c=>{
 const fk=c.definition.match(/\(([^)]+)\)/)[1],parent=c.definition.match(/REFERENCES app\.(\w+)/)[1];
 const one=constraints(c.table_name).some(k=>['p','u'].includes(k.kind)&&k.definition.match(/\(([^)]+)\)/)?.[1]===fk);
 const labels={dealer_profiles:{city_id:'located in',user_id:'owns profile'},vehicle_models:{manufacturer_id:'makes'},vehicle_variants:{model_id:'offers variant'},vehicles:{dealer_id:'owns inventory',variant_id:'describes'},vehicle_listings:{vehicle_id:'listed as'},listing_images:{listing_id:'has image'},listing_image_data:{image_id:'stores upload'},listing_price_estimates:{listing_id:'has estimate'},listing_embeddings:{listing_id:'has embedding'},listing_enquiries:{listing_id:'receives',user_id:'submits'}};
 return {parent,child:c.table_name,fk,one,label:labels[c.table_name][fk]};
});
const modules=[
 {id:'01-accounts',title:'Accounts and dealership ownership',names:['cities','users','dealer_profiles','request_limits']},
 {id:'02-catalogue',title:'Vehicle catalogue',names:['manufacturers','vehicle_models','vehicle_variants']},
 {id:'03-inventory',title:'Physical inventory and listings',names:['dealer_profiles','vehicle_variants','vehicles','vehicle_listings']},
 {id:'04-images',title:'Listing images and uploaded content',names:['vehicle_listings','listing_images','listing_image_data'],slots:[0,1,3]},
 {id:'05-estimates',title:'Price estimates and semantic embeddings',names:['vehicle_listings','listing_price_estimates','listing_embeddings'],slots:[0,2,3]},
 {id:'06-interactions',title:'Buyer enquiries test drives and offers',names:['users','vehicle_listings','listing_enquiries']},
];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function text(x,y,value,size=24,extra=''){return `<text x="${x}" y="${y}" font-family="Times New Roman,serif" font-size="${size}" fill="black" ${extra}>${esc(value)}</text>`;}
function start(w,h,title,description){return [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><rect width="${w}" height="${h}" fill="white"/>`,text(50,55,title,34,'font-weight="bold"')];}
const line=(pts,double=false)=>`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="black" stroke-width="2"/>`+(double?`<polyline points="${pts.map(([x,y])=>`${x+5},${y+5}`).join(' ')}" fill="none" stroke="black" stroke-width="2"/>`:'');
function chen(m){
 const s=start(1800,1640,`AutoHubIQ Chen ER diagram ${m.id.slice(0,2)}`,m.title);
 s.push(text(50,95,m.title,28),text(50,136,'Rectangle entity   Diamond relationship   Oval attribute   Underline primary key',23));
 const coords=Object.fromEntries(m.names.map((t,i)=>{const slot=m.slots?.[i]??i;return[t,{x:450+(slot%2)*900,y:450+Math.floor(slot/2)*650}];}));
 const rels=relationships.filter(r=>m.names.includes(r.parent)&&m.names.includes(r.child));
 const incoming={};
 for(const r of rels){
  const a=coords[r.parent],b=coords[r.child];let d,left,right,pa,pb;
  const slot=incoming[r.child]??0;incoming[r.child]=slot+1;const count=rels.filter(x=>x.child===r.child).length;
  const bx=b.x+(count>1?(a.x===b.x?-45:45):0);
  if(a.y===b.y){d={x:900,y:a.y===450?205:1435};pa=[a.x,a.y+(a.y===450?-30:30)];pb=[bx,b.y+(b.y===450?-30:30)];left=[pa,[a.x,d.y],[d.x-80,d.y]];right=[pb,[bx,d.y],[d.x+80,d.y]];}
  else if(a.x===b.x){d={x:a.x,y:775};pa=[a.x,a.y+30];pb=[bx,b.y-30];left=[pa,[d.x,d.y-38]];right=[pb,[bx,d.y+38],[d.x,d.y+38]];}
  else {d={x:900,y:775};pa=[a.x+(a.x<900?45:-45),a.y+30];pb=[bx,b.y-30];left=[pa,[pa[0],d.y-80],[d.x,d.y-80],[d.x,d.y-38]];right=[pb,[bx,d.y+80],[d.x,d.y+80],[d.x,d.y+38]];}
  s.push(line(left),line(right,true));
  s.push(`<polygon points="${d.x},${d.y-38} ${d.x+80},${d.y} ${d.x},${d.y+38} ${d.x-80},${d.y}" fill="white" stroke="black" stroke-width="2"/>`,text(d.x,d.y+7,r.label,22,'text-anchor="middle"'));
  const cross=a.x!==b.x&&a.y!==b.y;
  s.push(text(pa[0]+15,pa[1]+(pa[1]>a.y?(cross?78:36):-18),r.one?'(0,1)':'(0,N)',25),text(pb[0]+15,pb[1]+(pb[1]>b.y?36:-18),'(1,1)',25));
 }
 for(const t of m.names){const c=coords[t],fks=relationships.filter(r=>r.child===t).map(r=>r.fk);
  const attrs=tables[t].filter(a=>!fks.includes(a.column_name)||a.column_name===pk(t));
  const halves=[attrs.slice(0,Math.ceil(attrs.length/2)),attrs.slice(Math.ceil(attrs.length/2))];
  halves.forEach((group,side)=>group.forEach((a,i)=>{const x=c.x+(side===0?-280:280),y=c.y+(i-(group.length-1)/2)*70,dx=(side===0?c.x-120:c.x+120)-x,dy=c.y-y,scale=1/Math.sqrt(dx*dx/(142*142)+dy*dy/(24*24));
   s.push(line([[side===0?c.x-120:c.x+120,c.y],[x+dx*scale,y+dy*scale]]),`<ellipse cx="${x}" cy="${y}" rx="142" ry="24" fill="white" stroke="black" stroke-width="2"/>`,text(x,y+7,a.column_name,a.column_name.length>23?19:22,`text-anchor="middle" ${a.column_name===pk(t)?'text-decoration="underline"':''}`));
  }));
  s.push(`<rect x="${c.x-120}" y="${c.y-30}" width="240" height="60" fill="white" stroke="black" stroke-width="2"/>`,text(c.x,c.y+8,t,t.length>19?21:25,'font-weight="bold" text-anchor="middle"'));
 }
 s.push(text(50,1515,'(min,max) labels describe participation at the adjacent entity; N means many.',24),text(50,1554,'Double line marks total participation of the child. Non-key foreign keys appear only in the mapping.',23),text(50,1593,'Shared primary identifiers are underlined; they are not invented partial keys. Operational request_limits is independent.',22),'</svg>');
 return s.join('\n');
}
function mapping(m){
 const widths=Object.fromEntries(m.names.map(t=>[t,tables[t].map(c=>Math.max(120,c.column_name.length*14+30))]));
 const sums=m.names.map(t=>widths[t].reduce((a,b)=>a+b,0));
 const width=Math.max(1900,...sums)+260,height=260+m.names.length*390;
 const s=start(width,height,`AutoHubIQ ER to relational mapping ${m.id.slice(0,2)}`,m.title);
 s.push(text(50,100,m.title,28),text(50,145,'Underlined attribute primary key   FK label foreign key   Arrows child FK to referenced parent PK',24));
 s.push('<defs><marker id="fk-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0 L10 5 L0 10" fill="none" stroke="black"/></marker></defs>');
 const cells={};m.names.forEach((t,row)=>{let x=50;cells[t]={};tables[t].forEach((c,i)=>{cells[t][c.column_name]={x:x+widths[t][i]/2,y:230+row*390};x+=widths[t][i];});});
 const rels=relationships.filter(r=>m.names.includes(r.parent)&&m.names.includes(r.child));
 for(const [i,r] of rels.entries()){const a=cells[r.child][r.fk],b=cells[r.parent][pk(r.parent)],rail=width-65-i*15;
  s.push(`<path d="M${a.x} ${a.y+90} V${a.y+112} H${rail} V${b.y-18-i%2*10} H${b.x} V${b.y}" fill="none" stroke="black" stroke-width="2" marker-end="url(#fk-arrow)"/>`);
 }
 m.names.forEach((t,row)=>{const y=230+row*390;let x=50;s.push(text(x,y-42,t.toUpperCase(),29,'font-weight="bold"'));
  tables[t].forEach((c,i)=>{const isFk=relationships.some(r=>r.child===t&&r.fk===c.column_name);s.push(`<rect x="${x}" y="${y}" width="${widths[t][i]}" height="90" fill="white" stroke="black" stroke-width="2"/>`,text(x+widths[t][i]/2,y+36,c.column_name,24,`text-anchor="middle" ${c.column_name===pk(t)?'text-decoration="underline" font-weight="bold"':''}`));if(isFk)s.push(text(x+widths[t][i]/2,y+68,'FK',20,'text-anchor="middle"'));x+=widths[t][i];});
  const refs=relationships.filter(r=>r.child===t);refs.forEach((r,i)=>s.push(text(50,y+163+i*35,`${r.child}.${r.fk} -> ${r.parent}.${pk(r.parent)}${r.one?'   UNIQUE FK for 1:1 mapping':''}`,24)));
  if(!refs.length)s.push(text(50,y+163,'No foreign key in this relation.',24));
 });
 s.push(text(50,height-45,'All columns are shown. Composite UNIQUE and CHECK rules remain in the data dictionary; PK underlining does not imply a composite key.',23),'</svg>');return s.join('\n');
}
const manifest=[];
for(const m of modules){for(const kind of ['chen','mapping']){const name=`${kind}-${m.id}.svg`;const svg=kind==='chen'?chen(m):mapping(m);fs.writeFileSync(path.join(out,name),svg);const [,w,h]=svg.match(/width="(\d+)" height="(\d+)"/);manifest.push({module:m.id,title:m.title,kind,file:name,width:Number(w),height:Number(h),entities:m.names});}}
for(const t of Object.keys(tables))if(!modules.some(m=>m.names.includes(t)))throw Error('Missing entity '+t);
for(const r of relationships)if(!modules.some(m=>m.names.includes(r.parent)&&m.names.includes(r.child)))throw Error('Missing relationship '+r.child+'.'+r.fk);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const PDFDocument=require('../../tmp/report-tools/node_modules/pdfkit/js/pdfkit.js'),svgToPdf=require('../../tmp/report-tools/node_modules/svg-to-pdfkit');
const pdf=new PDFDocument({autoFirstPage:false,info:{Title:'AutoHubIQ Chen ER Diagrams and Relational Mapping',Author:'Ronit Prasad and Sanjana Medarametla'}});
pdf.registerFont('Times New Roman','C:/Windows/Fonts/times.ttf');pdf.registerFont('Times New Roman-Bold','C:/Windows/Fonts/timesbd.ttf');
fs.mkdirSync(path.join(root,'output/pdf'),{recursive:true});pdf.pipe(fs.createWriteStream(path.join(root,'output/pdf/AutoHubIQ_ER_and_Relational_Mapping.pdf')));
for(const [i,m] of manifest.entries()){pdf.addPage({size:'A3',layout:'landscape',margin:40});const scale=Math.min((pdf.page.width-80)/m.width,(pdf.page.height-100)/m.height);const w=m.width*scale,h=m.height*scale;pdf.save().translate((pdf.page.width-w)/2,35).scale(scale);svgToPdf(pdf,fs.readFileSync(path.join(out,m.file),'utf8'),0,0,{assumePt:true});pdf.restore();pdf.font('Times New Roman').fontSize(10).text(`AutoHubIQ  |  Course notation  |  ${m.kind==='chen'?'Chen ER diagram':'ER-to-relational schema mapping'}  |  ${i+1} of ${manifest.length}`,40,pdf.page.height-35,{lineBreak:false});}
pdf.end();console.log(`Generated ${manifest.length} course-style SVG sheets and the diagram PDF; all 14 entities and ${relationships.length} FK relationships covered.`);
