#!/usr/bin/env node

/**
 * Performance verification script
 * Checks that all performance optimizations are properly configured
 */

const fs = require('fs');
const path = require('path');

const checks = [];
const warnings = [];
const errors = [];

console.log('🔍 Checking performance optimizations...\n');

// Check 1: Next.js config has performance settings
try {
  const configPath = path.join(__dirname, '..', 'next.config.mjs');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  if (configContent.includes('swcMinify')) {
    checks.push('✅ SWC minification enabled');
  } else {
    warnings.push('⚠️  SWC minification not enabled');
  }
  
  if (configContent.includes('optimizePackageImports')) {
    checks.push('✅ Package import optimization configured');
  } else {
    warnings.push('⚠️  Package import optimization not configured');
  }
  
  if (configContent.includes('compress: true')) {
    checks.push('✅ Compression enabled');
  } else {
    warnings.push('⚠️  Compression not enabled');
  }
  
  if (configContent.includes('images:')) {
    checks.push('✅ Image optimization configured');
  } else {
    warnings.push('⚠️  Image optimization not configured');
  }
} catch (e) {
  errors.push('❌ Could not read next.config.mjs');
}

// Check 2: PostCard has React.memo
try {
  const postCardPath = path.join(__dirname, '..', 'app', 'components', 'PostCard.tsx');
  const postCardContent = fs.readFileSync(postCardPath, 'utf8');
  
  if (postCardContent.includes('memo(PostCardComponent')) {
    checks.push('✅ PostCard is memoized');
  } else {
    warnings.push('⚠️  PostCard is not memoized');
  }
} catch (e) {
  warnings.push('⚠️  Could not verify PostCard memoization');
}

// Check 3: API cache exists
try {
  const cachePath = path.join(__dirname, '..', 'src', 'lib', 'api', 'cache.ts');
  if (fs.existsSync(cachePath)) {
    checks.push('✅ API caching layer exists');
  } else {
    warnings.push('⚠️  API caching layer not found');
  }
} catch (e) {
  warnings.push('⚠️  Could not verify API caching');
}

// Check 4: Performance monitor exists
try {
  const perfMonPath = path.join(__dirname, '..', 'src', 'lib', 'performance-monitor.ts');
  if (fs.existsSync(perfMonPath)) {
    checks.push('✅ Performance monitoring configured');
  } else {
    warnings.push('⚠️  Performance monitoring not found');
  }
} catch (e) {
  warnings.push('⚠️  Could not verify performance monitoring');
}

// Check 5: CSS containment in globals.css
try {
  const cssPath = path.join(__dirname, '..', 'app', 'styles', 'global.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  if (cssContent.includes('contain:') || cssContent.includes('content-visibility:')) {
    checks.push('✅ CSS containment optimizations applied');
  } else {
    warnings.push('⚠️  CSS containment not found');
  }
  
  if (cssContent.includes('-webkit-font-smoothing') || cssContent.includes('text-rendering')) {
    checks.push('✅ Font rendering optimizations applied');
  } else {
    warnings.push('⚠️  Font rendering optimizations not applied');
  }
} catch (e) {
  warnings.push('⚠️  Could not verify CSS optimizations');
}

// Check 6: OptimizedImage component exists
try {
  const optImgPath = path.join(__dirname, '..', 'app', 'components', 'OptimizedImage.tsx');
  if (fs.existsSync(optImgPath)) {
    checks.push('✅ Optimized image component exists');
  } else {
    warnings.push('⚠️  Optimized image component not found');
  }
} catch (e) {
  warnings.push('⚠️  Could not verify optimized image component');
}

// Check 7: Image worker exists
try {
  const workerPath = path.join(__dirname, '..', 'src', 'lib', 'image-worker.ts');
  if (fs.existsSync(workerPath)) {
    checks.push('✅ Image compression worker exists');
  } else {
    warnings.push('⚠️  Image compression worker not found');
  }
} catch (e) {
  warnings.push('⚠️  Could not verify image worker');
}

// Check 8: Package.json has required dependencies
try {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  if (pkgContent.dependencies['web-vitals']) {
    checks.push('✅ web-vitals package installed');
  } else {
    warnings.push('⚠️  web-vitals package not installed');
  }
  
  if (pkgContent.dependencies['swr']) {
    checks.push('✅ SWR for data fetching installed');
  } else {
    warnings.push('⚠️  SWR not installed (optional but recommended)');
  }
} catch (e) {
  warnings.push('⚠️  Could not verify package dependencies');
}

// Print results
console.log('📊 Results:\n');

if (checks.length > 0) {
  console.log('Passed Checks:');
  checks.forEach(check => console.log(`  ${check}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('Warnings:');
  warnings.forEach(warning => console.log(`  ${warning}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('Errors:');
  errors.forEach(error => console.log(`  ${error}`));
  console.log('');
}

// Summary
const total = checks.length + warnings.length + errors.length;
const score = Math.round((checks.length / total) * 100);

console.log('─'.repeat(50));
console.log(`\n📈 Performance Score: ${score}% (${checks.length}/${total} checks passed)\n`);

if (score >= 90) {
  console.log('🎉 Excellent! Your app is well-optimized.');
} else if (score >= 75) {
  console.log('👍 Good! Consider addressing the warnings above.');
} else if (score >= 50) {
  console.log('⚠️  Fair. Several optimizations are missing.');
} else {
  console.log('❌ Needs improvement. Please review the optimization guide.');
}

console.log('\n📚 For details, see: PERFORMANCE_OPTIMIZATIONS.md\n');

// Exit with appropriate code
process.exit(errors.length > 0 ? 1 : 0);
