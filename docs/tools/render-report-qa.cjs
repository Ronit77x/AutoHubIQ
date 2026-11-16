const fs=require('node:fs'),path=require('node:path');
const canvas=require('../../tmp/report-tools/node_modules/@napi-rs/canvas');
Object.assign(global,{DOMMatrix:canvas.DOMMatrix,ImageData:canvas.ImageData,Path2D:canvas.Path2D});
(async()=>{
 const pdfjs=await import('../../tmp/report-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
 const root=path.resolve(__dirname,'../..'),out=path.resolve(root,process.argv[3]??'tmp/pdfs');fs.mkdirSync(out,{recursive:true});
 const input=path.resolve(root,process.argv[2]??'output/pdf/AutoHubIQ_Project_Report.pdf');
 const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(input)),useSystemFonts:true}).promise;
 const pages=[],texts=[];
 for(let i=1;i<=doc.numPages;i++){
  const page=await doc.getPage(i),vp=page.getViewport({scale:1.35}),cv=canvas.createCanvas(vp.width,vp.height);
  await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  const content=await page.getTextContent();const items=content.items.filter(t=>t.str.trim());
  pages.push({page:i,text_items:items.length,outside:items.filter(t=>t.transform[4]<25||t.transform[4]>page.view[2]-25||t.transform[5]<15||t.transform[5]>page.view[3]-20).map(t=>t.str)});
  texts.push(items.map(t=>t.str).join(' '));
  fs.writeFileSync(path.join(out,`page-${String(i).padStart(2,'0')}.png`),cv.toBuffer('image/png'));
 }
 for(let i=0;i<doc.numPages;i+=4){const sheet=canvas.createCanvas(1640,2350),ctx=sheet.getContext('2d');ctx.fillStyle='#dddddd';ctx.fillRect(0,0,1640,2350);for(let j=0;j<4&&i+j<doc.numPages;j++){const im=await canvas.loadImage(path.join(out,`page-${String(i+j+1).padStart(2,'0')}.png`));const ratio=Math.min(800/im.width,1132/im.height),w=im.width*ratio,h=im.height*ratio;ctx.drawImage(im,15+(j%2)*815+(800-w)/2,15+Math.floor(j/2)*1170+(1132-h)/2,w,h);}fs.writeFileSync(path.join(out,`sheet-${Math.floor(i/4)+1}.png`),sheet.toBuffer('image/png'));}
 fs.writeFileSync(path.join(out,'extracted-report.txt'),texts.map((t,i)=>`PAGE ${i+1}\n${t}`).join('\n\n'));
 fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({pages:doc.numPages,checks:pages},null,2));
 console.log(JSON.stringify({pages:doc.numPages,blankPages:pages.filter(p=>p.text_items<5).map(p=>p.page),outside:pages.filter(p=>p.outside.length)},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
