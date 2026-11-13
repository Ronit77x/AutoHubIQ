import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const galleries = JSON.parse(await readFile(new URL("../lib/demo-gallery-sources.json", import.meta.url), "utf8"));
let failed = 0;
for (const [model, gallery] of Object.entries(galleries)) {
  const directory = new URL(`../public/cars/gallery/${model}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const photo of gallery.photos) {
    const destination = new URL(`${photo.view}.jpg`, directory);
    try {
      try { await sharp(await readFile(destination)).metadata(); continue; } catch { /* Download missing assets. */ }
      const response = await fetch(photo.url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const image = await sharp(Buffer.from(await response.arrayBuffer()), { limitInputPixels: 40_000_000 })
        .rotate().resize(1400, 1000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
      await writeFile(destination, image);
      console.log(`Saved ${model}/${photo.view}.jpg`);
    } catch (error) { failed++; console.error(`${model}/${photo.view}: ${error.message}`); }
  }
}
if (failed) process.exitCode = 1;
