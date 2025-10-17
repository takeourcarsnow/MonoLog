const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateMaskableIcons() {
  const svgPath = path.join(__dirname, '..', 'public', 'logo.svg');
  const sizes = [192, 512];

  try {
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
      const outputPath = path.join(__dirname, '..', 'public', `icon-${size}-maskable.png`);

      // Create a square canvas with padding for maskable icon
      const padding = Math.floor(size * 0.1); // 10% padding
      const iconSize = size - 2 * padding;

      await sharp(svgBuffer)
        .resize(iconSize, iconSize)
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 15, g: 15, b: 16, alpha: 1 } // #0f0f10 background
        })
        .png()
        .toFile(outputPath);
      console.log(`Generated maskable icon-${size}-maskable.png`);
    }
  } catch (error) {
    console.error('Error generating maskable icons:', error);
  }
}

generateMaskableIcons();