const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const svgPath = path.join(__dirname, '..', 'public', 'logo.svg');
  const pngPath = path.join(__dirname, '..', 'public', 'icon-1024.png');

  try {
    // Read the SVG
    const svgBuffer = fs.readFileSync(svgPath);

    // Convert to PNG at 1024x1024
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(pngPath);

    console.log('Generated icon-1024.png successfully');
  } catch (error) {
    console.error('Error generating icon:', error);
  }
}

generateIcon();