// convert-logo.js
// Simple script to convert public/logo.svg to public/logo.png using sharp
// Usage: npm run convert-logo

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const svgPath = path.join(projectRoot, 'public', 'logo.svg');
const outPath = path.join(projectRoot, 'public', 'logo.png');

async function convert() {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found at', svgPath);
    process.exit(1);
  }

  try {
    await sharp(svgPath)
      .png({ quality: 90 })
      .toFile(outPath);
    console.log('Converted', svgPath, '->', outPath);
  } catch (err) {
    console.error('Conversion failed:', err);
    process.exit(1);
  }
}

convert();
