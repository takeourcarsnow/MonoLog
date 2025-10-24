const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const framesDir = path.join(__dirname, '..', 'public', 'frames');
const backupDir = path.join(framesDir, 'orig-backup');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function convert() {
  await ensureDir(backupDir);
  const files = fs.readdirSync(framesDir).filter(f => /\.png$/i.test(f));
  if (files.length === 0) {
    console.log('No PNG files found to convert.');
    return;
  }

  for (const file of files) {
    const input = path.join(framesDir, file);
    const base = file.replace(/\.[^.]+$/, '');
    const outName = base + '.webp';
    const out = path.join(framesDir, outName);
    const backupPath = path.join(backupDir, file);

    try {
      const image = sharp(input);
      const meta = await image.metadata();
      const hasAlpha = !!meta.hasAlpha || (meta.channels && meta.channels === 4);

      if (hasAlpha) {
        // Preserve alpha; use alphaQuality for better alpha retention with lossy WebP
        await image.webp({ quality: 80, alphaQuality: 90 }).toFile(out);
      } else {
        // No transparency, regular WebP conversion
        await image.webp({ quality: 80 }).toFile(out);
      }

      // Move original PNG to backup
      fs.renameSync(input, backupPath);
      console.log(`Converted ${file} -> ${outName} (original moved to orig-backup/${file})`);
    } catch (err) {
      console.error('Failed to convert', file, err.message || err);
    }
  }

  console.log('Frames conversion finished. Frame filenames are now .webp; originals are in public/frames/orig-backup/');
}

convert().catch(err => { console.error(err); process.exit(1); });
