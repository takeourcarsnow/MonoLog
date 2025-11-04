const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const overlaysDir = path.join(__dirname, '..', 'public', 'overlays');
const backupDir = path.join(overlaysDir, 'orig-backup');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function convert() {
  await ensureDir(backupDir);
  const files = fs.readdirSync(overlaysDir).filter(f => /\.(jpe?g)$/i.test(f));
  if (files.length === 0) {
    console.log('No JPEG files found to convert.');
    return;
  }

  for (const file of files) {
    const input = path.join(overlaysDir, file);
    const base = file.replace(/\.[^.]+$/, '');
    const outName = base + '.webp';
    const out = path.join(overlaysDir, outName);
    const backupPath = path.join(backupDir, file);

    try {
      // Convert to webp with a sensible quality for photographic overlays
      await sharp(input).webp({ quality: 80 }).toFile(out);
      // Move original to backup (do not delete permanently)
      fs.renameSync(input, backupPath);
      console.log(`Converted ${file} -> ${outName} (original moved to orig-backup/${file})`);
    } catch (err) {
      console.error('Failed to convert', file, err.message || err);
    }
  }

  console.log('Conversion finished. You should re-run scripts/generate-overlay-thumbs.js to regenerate thumbnails.');
}

convert().catch(err => { console.error(err); process.exit(1); });
