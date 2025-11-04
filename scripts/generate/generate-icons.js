const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, '..', 'public', 'logo.svg');
  const sizes = [192, 512, 1024];

  try {
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
      const outputPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .flatten({ background: '#0f0f10' }) // Add solid background to prevent transparency issues
        .png()
        .toFile(outputPath);
      console.log(`Generated icon-${size}.png`);
    }
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();