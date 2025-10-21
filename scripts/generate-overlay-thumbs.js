const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const overlaysDir = path.join(__dirname, '..', 'public', 'overlays');
const thumbsDir = path.join(overlaysDir, 'thumbs');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generate() {
  await ensureDir(thumbsDir);
  const files = fs.readdirSync(overlaysDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  for (const file of files) {
    const input = path.join(overlaysDir, file);
    const out = path.join(thumbsDir, file);
    try {
      await sharp(input)
        .resize({ width: 160 })
        .jpeg({ quality: 60 })
        .toFile(out);
      console.log('Generated thumbnail for', file);
    } catch (err) {
      console.error('Failed to generate thumb for', file, err.message || err);
    }
  }
}

generate().catch(err => { console.error(err); process.exit(1); });
