const fs = require('fs');
const path = require('path');
const potrace = require('potrace');

const projectRoot = path.resolve(__dirname, '..');
const pngPath = path.join(projectRoot, 'public', 'logo_lines.png');
const svgPath = path.join(projectRoot, 'public', 'logo_lines.svg');

async function convert() {
  if (!fs.existsSync(pngPath)) {
    console.error('PNG not found at', pngPath);
    process.exit(1);
  }

  potrace.trace(pngPath, (err, svg) => {
    if (err) {
      console.error('Conversion failed:', err);
      process.exit(1);
    }

    fs.writeFileSync(svgPath, svg);
    console.log('Converted', pngPath, '->', svgPath);
  });
}

convert();
