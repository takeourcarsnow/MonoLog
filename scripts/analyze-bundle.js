#!/usr/bin/env node

/**
 * Bundle analysis script
 * Analyzes bundle size and provides optimization recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📊 Analyzing bundle size...\n');

// Check if .next directory exists
const nextDir = path.join(__dirname, '..', '.next');
if (!fs.existsSync(nextDir)) {
  console.log('❌ .next directory not found. Run `npm run build` first.');
  process.exit(1);
}

// Check build output
try {
  const buildOutputPath = path.join(nextDir, 'build-manifest.json');
  if (fs.existsSync(buildOutputPath)) {
    const buildManifest = JSON.parse(fs.readFileSync(buildOutputPath, 'utf8'));
    console.log('✅ Build manifest found');
  }
} catch (e) {
  console.log('⚠️  Could not read build manifest');
}

// Check static chunks
const staticDir = path.join(nextDir, 'static');
if (fs.existsSync(staticDir)) {
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const files = fs.readdirSync(chunksDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    console.log(`📦 Found ${jsFiles.length} JavaScript chunks`);

    let totalSize = 0;
    jsFiles.forEach(file => {
      const filePath = path.join(chunksDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`📏 Total JavaScript bundle size: ${totalSizeMB} MB`);

    if (totalSize > 1024 * 1024) { // > 1MB
      console.log('⚠️  Bundle size is large. Consider code splitting or tree shaking.');
    } else {
      console.log('✅ Bundle size looks good.');
    }
  }
}

// Recommendations
console.log('\n💡 Optimization Recommendations:');
console.log('• Use dynamic imports for large components');
console.log('• Implement code splitting for routes');
console.log('• Use tree shaking to remove unused code');
console.log('• Optimize images and assets');
console.log('• Consider using a CDN for static assets');

console.log('\n📈 Run `npm run analyze` for detailed bundle analysis with @next/bundle-analyzer');