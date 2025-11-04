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
      const ext = path.extname(file).toLowerCase();
      const out = path.join(thumbsDir, file);
      try {
        const img = sharp(input).resize(160, 160, { fit: 'inside' });
        // Encode output to match original extension so the thumb filename is
        // identical to the overlay filename (this is relied on by the UI).
        if (ext === '.webp') {
          await img.webp({ quality: 60 }).toFile(out);
        } else if (ext === '.png') {
          await img.png({ quality: 60 }).toFile(out);
        } else {
          // default: jpeg for .jpg/.jpeg and any other cases
          await img.jpeg({ quality: 60 }).toFile(out);
        }
        console.log('Generated thumbnail for', file);
      } catch (err) {
        console.error('Failed to generate thumb for', file, err.message || err);
      }
    }
}

generate().catch(err => { console.error(err); process.exit(1); });
