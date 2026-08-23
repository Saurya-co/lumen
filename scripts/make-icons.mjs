/**
 * make-icons — generates electron/build/icon.ico from public/logo.svg.
 * Renders SVG at required sizes with sharp, packs into multi-resolution .ico.
 * Usage: node scripts/make-icons.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import * as pngToIcoMod from "png-to-ico";

const pngToIco = pngToIcoMod.pngToIco ?? pngToIcoMod.default;
if (typeof pngToIco !== "function") {
  throw new Error("png-to-ico: could not resolve export");
}

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const SRC = new URL("../public/logo.svg", import.meta.url);
const OUT = new URL("../electron/build/icon.ico", import.meta.url);

const svg = await readFile(SRC);

// density boosts rasterization quality for the small sizes
const pngs = await Promise.all(
  SIZES.map((size) =>
    sharp(svg, { density: 512 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
  )
);

const ico = await pngToIco(pngs);
await writeFile(OUT, ico);
console.log(`[make-icons] wrote icon.ico (${SIZES.join(", ")}) → ${OUT.pathname}`);
