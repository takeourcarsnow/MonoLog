import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true }).catch(() => {});
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function* walk(dir, excludeDirs = new Set()) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      if (!excludeDirs.has(dirent.name)) {
        yield* walk(res, excludeDirs);
      }
    } else if (dirent.isFile()) {
      yield res;
    }
  }
}

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

async function readText(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function writeText(file, content) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, content, 'utf8');
}

async function main() {
  const projectRoot = path.resolve(__dirname, '../../');
  const srcLib = path.join(projectRoot, 'src', 'lib');
  const dstLib = path.join(projectRoot, 'lib');

  const when = timestamp();
  const backupsRoot = path.join(projectRoot, 'backups', `lib-migration-${when}`);
  const conflictsBackup = path.join(backupsRoot, 'conflicts');
  const originalBackup = path.join(backupsRoot, 'src-lib-original');
  const logsDir = path.join(backupsRoot, 'logs');
  const logFile = path.join(logsDir, 'migration.log');

  await ensureDir(backupsRoot);
  await ensureDir(conflictsBackup);
  await ensureDir(originalBackup);
  await ensureDir(logsDir);

  const logLines = [];
  const log = (line) => { logLines.push(line); };

  const srcExists = await exists(srcLib);
  if (!srcExists) {
    console.log('[migrate-lib] No src/lib directory found. Nothing to do.');
    return;
  }
  const dstExists = await exists(dstLib);
  if (!dstExists) {
    await ensureDir(dstLib);
  }

  // Backup a snapshot of src/lib before modifications
  async function backupSrcLibSnapshot() {
    // Copy recursively src/lib into originalBackup
    /** simple recursive copy */
    async function copyDir(src, dest) {
      await ensureDir(dest);
      const entries = await fs.readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          await copyDir(s, d);
        } else if (entry.isFile()) {
          await ensureDir(path.dirname(d));
          await fs.copyFile(s, d);
        }
      }
    }
    await copyDir(srcLib, originalBackup);
    log(`[backup] Copied src/lib -> ${path.relative(projectRoot, originalBackup)}`);
  }

  await backupSrcLibSnapshot();

  // Merge files: prefer src/lib version on conflicts (backup existing lib file)
  const srcFiles = [];
  for await (const file of walk(srcLib)) {
    srcFiles.push(file);
  }

  for (const file of srcFiles) {
    const rel = path.relative(srcLib, file);
    const dest = path.join(dstLib, rel);

    await ensureDir(path.dirname(dest));

    if (await exists(dest)) {
      // If identical, skip moving
      const [a, b] = await Promise.all([readText(file), readText(dest)]);
      if (a === b) {
        log(`[skip-identical] ${path.relative(projectRoot, file)} == ${path.relative(projectRoot, dest)}`);
        continue;
      }
      // Backup existing dest then overwrite with src
      const backupPath = path.join(conflictsBackup, rel);
      await ensureDir(path.dirname(backupPath));
      await fs.copyFile(dest, backupPath);
      log(`[conflict-backup] ${path.relative(projectRoot, dest)} -> ${path.relative(projectRoot, backupPath)}`);

      await fs.copyFile(file, dest);
      log(`[overwrite] ${path.relative(projectRoot, file)} -> ${path.relative(projectRoot, dest)} (preferred src/lib)`);
    } else {
      await fs.copyFile(file, dest);
      log(`[copy] ${path.relative(projectRoot, file)} -> ${path.relative(projectRoot, dest)}`);
    }
  }

  // Update imports from "@/lib" to "@/lib" across codebase
  const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
  const ignoreTop = new Set(['node_modules', '.next', 'backups']);
  const filesToPatch = [];
  async function* walkAll(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ignoreTop.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        yield* walkAll(full);
      } else if (ent.isFile() && exts.has(path.extname(ent.name))) {
        yield full;
      }
    }
  }

  for await (const file of walkAll(projectRoot)) {
    filesToPatch.push(file);
  }

  const importPattern = /(["'])@\/src\/lib(\/|["'])/g; // matches "@/lib/" or "@/lib"
  let patchedCount = 0;
  for (const file of filesToPatch) {
    const content = await readText(file);
    if (!content) continue;
    if (importPattern.test(content)) {
      const updated = content.replace(importPattern, (m, quote, slashOrEnd) => `${quote}@/lib${slashOrEnd}`);
      if (updated !== content) {
        await writeText(file, updated);
        patchedCount++;
        log(`[patched] ${path.relative(projectRoot, file)}`);
      }
    }
  }

  // Optionally rename src/lib to indicate migration (leave backup present already)
  const renamed = path.join(projectRoot, 'src', `lib__migrated_${when}`);
  try {
    await fs.rename(srcLib, renamed);
    log(`[rename] src/lib -> src/lib__migrated_${when}`);
  } catch (e) {
    log(`[rename-skip] Could not rename src/lib: ${e.message}`);
  }

  await writeText(logFile, logLines.join('\n'));
  console.log(`[migrate-lib] Completed. Logs at ${path.relative(projectRoot, logFile)}. Patched files: ${patchedCount}.`);
}

main().catch((err) => {
  console.error('[migrate-lib] Error:', err);
  process.exitCode = 1;
});
