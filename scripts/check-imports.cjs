#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(dir, out){
  const skip = new Set(['node_modules', '.next', 'backups', '.git', 'public']);
  for(const ent of fs.readdirSync(dir, { withFileTypes: true })){
    if (ent.name.startsWith('.')) continue;
    if (skip.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) out.push(full);
  }
}

function fileExistsAny(baseNoExt){
  const cand = ['.tsx', '.ts', '.jsx', '.js'];
  for(const ext of cand){ if(fs.existsSync(baseNoExt + ext)) return true; }
  // try index
  for(const ext of cand){ if(fs.existsSync(path.join(baseNoExt, 'index'+ext))) return true; }
  return false;
}

const files = [];
walk(ROOT, files);
const relProblems = [];
for(const f of files){
  const code = fs.readFileSync(f, 'utf8');
  const re = /(import\s+[^'"\n;]*?from\s+|export\s+[^'"\n;]*?from\s+|require\(\s*|import\(\s*)["']([^"']+)["']/g;
  let m;
  while((m = re.exec(code))){
    const spec = m[2];
    if (spec && (spec.startsWith('./') || spec.startsWith('../'))){
      const absBase = path.resolve(path.dirname(f), spec);
      if (!fileExistsAny(absBase)){
        relProblems.push({ file: path.relative(ROOT, f), spec });
      }
    }
  }
}

if (relProblems.length){
  console.log('Broken relative imports:', relProblems.length);
  for(const p of relProblems.slice(0, 200)){
    console.log('-', p.file, '->', p.spec);
  }
  if (relProblems.length > 200) console.log('...and more');
  process.exit(1);
} else {
  console.log('No broken relative imports found.');
}
