const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, '../public/logo.svg');
const outputDir = path.join(__dirname, '../electron/build');

async function createIcon() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  
  // Create PNGs for each size
  const pngBuffers = await Promise.all(
    sizes.map(size => 
      sharp(inputSvg)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  // Convert PNGs to ICO
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(outputDir, 'icon.ico'), icoBuffer);
  console.log('Created icon.ico');
}

createIcon().catch(console.error);