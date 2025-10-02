// Generate PWA icons from SVG using sharp
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    
    const svgPath = path.join(__dirname, '..', 'app', 'icon.svg');
    const publicDir = path.join(__dirname, '..', 'public');
    const sizes = [192, 512];

    console.log('📱 Generating PWA icons...\n');

    for (const size of sizes) {
      const outputPath = path.join(publicDir, `icon-${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${size}x${size} icon: ${outputPath}`);
    }

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Sharp is not installed.');
      console.log('\nTo generate icons, run:');
      console.log('  npm install --save-dev sharp');
      console.log('  node scripts/generate-icons-sharp.js');
      console.log('\nOr use an online tool like https://realfavicongenerator.net/');
    } else {
      console.error('Error generating icons:', error);
    }
  }
}

generateIcons();
