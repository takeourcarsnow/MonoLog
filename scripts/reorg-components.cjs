#!/usr/bin/env node
/*
 Safe components folder reorganization + import updater
 - Dry-run by default. Use --apply to actually modify files.
 - Creates a backup of app/components under backups/components-reorg-<timestamp>
 - Updates import paths (alias '@/...'/relative) for moved files to new alias paths
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'app', 'components');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const DRY = !APPLY;

function log(...a){ console.log(...a); }
function warn(...a){ console.warn('[warn]', ...a); }
function err(...a){ console.error('[error]', ...a); }

function ensureDir(p){
  fs.mkdirSync(p, { recursive: true });
}

function posixPath(p){
  return p.split(path.sep).join('/');
}

function removeExt(p){
  return p.replace(/\.(tsx|ts|jsx|js)$/i, '');
}

function pathNoExt(abs){
  const ext = path.extname(abs);
  return ext ? abs.slice(0, -ext.length) : abs;
}

function fileExistsAny(baseNoExt){
  const cand = ['.tsx', '.ts', '.jsx', '.js'];
  for(const ext of cand){
    if(fs.existsSync(baseNoExt + ext)) return baseNoExt + ext;
  }
  // try index under directory
  for(const ext of cand){
    const idx = path.join(baseNoExt, 'index' + ext);
    if(fs.existsSync(idx)) return idx;
  }
  return null;
}

// Define moves mapping (relative to ROOT)
const moves = [
  // layout
  ['app/components/AppShell.tsx', 'app/components/layout/AppShell.tsx'],
  ['app/components/AppShellInit.ts', 'app/components/layout/AppShellInit.ts'],
  ['app/components/AppShellLayout.ts', 'app/components/layout/AppShellLayout.ts'],
  ['app/components/AppShellNavigation.ts', 'app/components/layout/AppShellNavigation.ts'],
  ['app/components/AppShellViews.ts', 'app/components/layout/AppShellViews.ts'],
  ['app/components/ClientErrorBoundary.tsx', 'app/components/layout/ClientErrorBoundary.tsx'],
  ['app/components/ClientInit.tsx', 'app/components/layout/ClientInit.tsx'],
  ['app/components/ClientLayout.tsx', 'app/components/layout/ClientLayout.tsx'],
  ['app/components/Header.tsx', 'app/components/layout/Header.tsx'],
  ['app/components/HeaderInteractive.tsx', 'app/components/layout/HeaderInteractive.tsx'],
  ['app/components/HeaderStatic.tsx', 'app/components/layout/HeaderStatic.tsx'],
  ['app/components/RoutePrefetcher.tsx', 'app/components/layout/RoutePrefetcher.tsx'],
  ['app/components/usePrevPathToggle.tsx', 'app/components/layout/usePrevPathToggle.tsx'],

  // ui
  ['app/components/Button.tsx', 'app/components/ui/Button.tsx'],
  ['app/components/Combobox.tsx', 'app/components/ui/Combobox.tsx'],
  ['app/components/InlinePreloader.tsx', 'app/components/ui/InlinePreloader.tsx'],
  ['app/components/LoadingIndicator.tsx', 'app/components/ui/LoadingIndicator.tsx'],
  ['app/components/Preloader.tsx', 'app/components/ui/Preloader.tsx'],
  ['app/components/Skeleton.tsx', 'app/components/ui/Skeleton.tsx'],
  ['app/components/SkeletonCard.tsx', 'app/components/ui/SkeletonCard.tsx'],
  ['app/components/SlideWrapper.tsx', 'app/components/ui/SlideWrapper.tsx'],
  ['app/components/SpinningLogo.tsx', 'app/components/ui/SpinningLogo.tsx'],
  ['app/components/StatCard.tsx', 'app/components/ui/StatCard.tsx'],
  ['app/components/StaticContainer.tsx', 'app/components/ui/StaticContainer.tsx'],
  ['app/components/ThemeToggle.tsx', 'app/components/ui/ThemeToggle.tsx'],
  ['app/components/TimeDisplay.tsx', 'app/components/ui/TimeDisplay.tsx'],
  ['app/components/ToggleActionButton.tsx', 'app/components/ui/ToggleActionButton.tsx'],
  ['app/components/ViewToggle.tsx', 'app/components/ui/ViewToggle.tsx'],
  ['app/components/Portal.tsx', 'app/components/ui/Portal.tsx'],
  ['app/components/ScrollingHint.tsx', 'app/components/ui/ScrollingHint.tsx'],

  // notifications
  ['app/components/NotificationItem.tsx', 'app/components/notifications/NotificationItem.tsx'],
  ['app/components/NotificationListener.tsx', 'app/components/notifications/NotificationListener.tsx'],
  ['app/components/NotificationsPopup.tsx', 'app/components/notifications/NotificationsPopup.tsx'],
  ['app/components/useNotifications.ts', 'app/components/notifications/useNotifications.ts'],
  ['app/components/notificationMessageUtils.ts', 'app/components/notifications/notificationMessageUtils.ts'],
  ['app/components/Toast.tsx', 'app/components/notifications/Toast.tsx'],

  // media
  ['app/components/OptimizedImage.tsx', 'app/components/media/OptimizedImage.tsx'],
  ['app/components/ProgressiveImage.tsx', 'app/components/media/ProgressiveImage.tsx'],
  ['app/components/LazyImage.tsx', 'app/components/media/LazyImage.tsx'],
  ['app/components/ImageZoom.tsx', 'app/components/media/ImageZoom.tsx'],
  ['app/components/ImageEditor.tsx', 'app/components/media/ImageEditor.tsx'],
  ['app/components/FullscreenViewer.tsx', 'app/components/media/FullscreenViewer.tsx'],
  ['app/components/MiniSlideshow.tsx', 'app/components/media/MiniSlideshow.tsx'],
  ['app/components/useImageEditorActions.ts', 'app/components/media/useImageEditorActions.ts'],

  // pwa
  ['app/components/InstallButton.tsx', 'app/components/pwa/InstallButton.tsx'],
  ['app/components/InstallHelpModal.tsx', 'app/components/pwa/InstallHelpModal.tsx'],
  ['app/components/InstallPrompt.tsx', 'app/components/pwa/InstallPrompt.tsx'],
  ['app/components/OfflineButton.tsx', 'app/components/pwa/OfflineButton.tsx'],
  ['app/components/PWAAnalytics.tsx', 'app/components/pwa/PWAAnalytics.tsx'],

  // auth & account
  ['app/components/AuthForm.tsx', 'app/components/auth/AuthForm.tsx'],
  ['app/components/AuthRequired.tsx', 'app/components/auth/AuthRequired.tsx'],
  ['app/components/AuthConfirmButton.css', 'app/components/auth/AuthConfirmButton.css'],
  ['app/components/SignOut.tsx', 'app/components/auth/SignOut.tsx'],
  ['app/components/DeleteAccount.tsx', 'app/components/account/DeleteAccount.tsx'],

  // comments
  ['app/components/CommentActions.tsx', 'app/components/comments/CommentActions.tsx'],
  ['app/components/CommentInput.tsx', 'app/components/comments/CommentInput.tsx'],
  ['app/components/CommentItem.tsx', 'app/components/comments/CommentItem.tsx'],
  ['app/components/Comments.tsx', 'app/components/comments/Comments.tsx'],
  ['app/components/comments-types.ts', 'app/components/comments/comments-types.ts'],
  ['app/components/ReplyInput.tsx', 'app/components/comments/ReplyInput.tsx'],

  // communities
  ['app/components/CommunitiesView.tsx', 'app/components/communities/CommunitiesView.tsx'],
  ['app/components/CommunityCard.tsx', 'app/components/communities/CommunityCard.tsx'],
  ['app/components/CommunityCardBase.tsx', 'app/components/communities/CommunityCardBase.tsx'],
  ['app/components/CommunityCardClient.tsx', 'app/components/communities/CommunityCardClient.tsx'],
  ['app/components/CommunityCardServer.tsx', 'app/components/communities/CommunityCardServer.tsx'],
  ['app/components/CommunityView.tsx', 'app/components/communities/CommunityView.tsx'],
  ['app/components/CreateCommunityView.tsx', 'app/components/communities/CreateCommunityView.tsx'],
  ['app/components/EditCommunityView.tsx', 'app/components/communities/EditCommunityView.tsx'],

  // feed
  ['app/components/FeedEmptyState.tsx', 'app/components/feed/FeedEmptyState.tsx'],
  ['app/components/FeedGridView.tsx', 'app/components/feed/FeedGridView.tsx'],
  ['app/components/FeedListView.tsx', 'app/components/feed/FeedListView.tsx'],
  ['app/components/FeedPage.tsx', 'app/components/feed/FeedPage.tsx'],
  ['app/components/FeedUnauthCTA.tsx', 'app/components/feed/FeedUnauthCTA.tsx'],
  ['app/components/FeedView.tsx', 'app/components/feed/FeedView.tsx'],
  ['app/components/GridView.tsx', 'app/components/feed/GridView.tsx'],

  // calendar / hashtag / explore / favorites
  ['app/components/CalendarView.tsx', 'app/components/calendar/CalendarView.tsx'],
  ['app/components/HashtagView.tsx', 'app/components/hashtag/HashtagView.tsx'],
  ['app/components/ExploreView.tsx', 'app/components/explore/ExploreView.tsx'],
  ['app/components/FavoritesView.tsx', 'app/components/favorites/FavoritesView.tsx'],

  // profile
  ['app/components/ProfileButton.tsx', 'app/components/profile/ProfileButton.tsx'],
  ['app/components/ProfileView.tsx', 'app/components/profile/ProfileView.tsx'],

  // publish
  ['app/components/PublishButton.tsx', 'app/components/publish/PublishButton.tsx'],
  ['app/components/PublishButton.css', 'app/components/publish/PublishButton.css'],

  // search
  ['app/components/SearchClient.tsx', 'app/components/search/SearchClient.tsx'],
  ['app/components/SearchLive.tsx', 'app/components/search/SearchLive.tsx'],

  // post / thread
  ['app/components/PostView.tsx', 'app/components/post/PostView.tsx'],
  ['app/components/ThreadView.tsx', 'app/components/thread/ThreadView.tsx'],
];

// Build maps
const moveEntries = moves.map(([fromRel, toRel]) => {
  const fromAbs = path.join(ROOT, fromRel);
  const toAbs = path.join(ROOT, toRel);
  return { fromRel, toRel, fromAbs, toAbs };
});

// Alias mapping for quick string replace for alias-imports
const aliasOldToNew = new Map();
for (const m of moveEntries) {
  const oldNoExt = removeExt(posixPath(m.fromRel));
  const neuNoExt = removeExt(posixPath(m.toRel));
  aliasOldToNew.set(`@/${oldNoExt}`, `@/${neuNoExt}`);
}

// Absolute path (no ext) mapping for resolving relative imports
const absOldNoExtToAliasNew = new Map();
for (const m of moveEntries) {
  absOldNoExtToAliasNew.set(pathNoExt(m.fromAbs), `@/${removeExt(posixPath(m.toRel))}`);
}

function walk(dir, out){
  const skip = new Set(['node_modules', '.next', 'backups', '.git', 'public']);
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for(const ent of ents){
    if (ent.name.startsWith('.')) continue;
    if (skip.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function updateImportsInFile(filePath){
  const original = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  let next = original;

  function mapSpec(spec){
    let newSpec = null;
    if (spec.startsWith('@/')){
      const noExt = spec.replace(/\.(tsx|ts|jsx|js)$/i, '');
      const mapped = aliasOldToNew.get(noExt);
      if (mapped){ newSpec = mapped; }
    }
    if (!newSpec && (spec.startsWith('.') || spec.startsWith('..'))){
      const importerDir = path.dirname(filePath);
      const absBase = path.resolve(importerDir, spec);
      const resolved = fileExistsAny(absBase);
      const key = pathNoExt(resolved || absBase);
      const mappedAlias = absOldNoExtToAliasNew.get(key);
      if (mappedAlias){ newSpec = mappedAlias; }
    }
    return newSpec;
  }

  // Apply in order: import/export from, dynamic import, require
  next = next.replace(/(import\s+[^'"\n;]*?from\s+)["']([^"']+)["']/g, (m, p1, spec) => {
    const newSpec = mapSpec(spec);
    if (newSpec && newSpec !== spec){ changed = true; return `${p1}"${newSpec}"`; }
    return m;
  });
  next = next.replace(/(export\s+[^'"\n;]*?from\s+)["']([^"']+)["']/g, (m, p1, spec) => {
    let newSpec = null;
    if (spec.startsWith('@/')){
      const noExt = spec.replace(/\.(tsx|ts|jsx|js)$/i, '');
      const mapped = aliasOldToNew.get(noExt);
      if (mapped) newSpec = mapped;
    }
    if (!newSpec && (spec.startsWith('.') || spec.startsWith('..'))){
      const importerDir = path.dirname(filePath);
      const absBase = path.resolve(importerDir, spec);
      const resolved = fileExistsAny(absBase);
      const key = pathNoExt(resolved || absBase);
      const mappedAlias = absOldNoExtToAliasNew.get(key);
      if (mappedAlias) newSpec = mappedAlias;
    }
    if (newSpec) { changed = true; return `${p1}"${newSpec}"`; }
    return m;
  });
  next = next.replace(/(import\s*\(\s*)['"]([^'"\)]+)['"](\s*\))/g, (m, p1, spec, p3) => {
    let newSpec = null;
    if (spec.startsWith('@/')){
      const noExt = spec.replace(/\.(tsx|ts|jsx|js)$/i, '');
      const mapped = aliasOldToNew.get(noExt);
      if (mapped) newSpec = mapped;
    }
    if (!newSpec && (spec.startsWith('.') || spec.startsWith('..'))){
      const importerDir = path.dirname(filePath);
      const absBase = path.resolve(importerDir, spec);
      const resolved = fileExistsAny(absBase);
      const key = pathNoExt(resolved || absBase);
      const mappedAlias = absOldNoExtToAliasNew.get(key);
      if (mappedAlias) newSpec = mappedAlias;
    }
    if (newSpec) { changed = true; return `${p1}"${newSpec}"${p3}`; }
    return m;
  });
  next = next.replace(/(require\(\s*)['"]([^'"\)]+)['"](\s*\))/g, (m, p1, spec, p3) => {
    let newSpec = null;
    if (spec.startsWith('@/')){
      const noExt = spec.replace(/\.(tsx|ts|jsx|js)$/i, '');
      const mapped = aliasOldToNew.get(noExt);
      if (mapped) newSpec = mapped;
    }
    if (!newSpec && (spec.startsWith('.') || spec.startsWith('..'))){
      const importerDir = path.dirname(filePath);
      const absBase = path.resolve(importerDir, spec);
      const resolved = fileExistsAny(absBase);
      const key = pathNoExt(resolved || absBase);
      const mappedAlias = absOldNoExtToAliasNew.get(key);
      if (mappedAlias) newSpec = mappedAlias;
    }
    if (newSpec) { changed = true; return `${p1}"${newSpec}"${p3}`; }
    return m;
  });

  if (changed) {
    if (!DRY) fs.writeFileSync(filePath, next, 'utf8');
    return true;
  }
  return false;
}

function backupComponents(){
  const backupDir = path.join(ROOT, 'backups', `components-reorg-${timestamp()}`);
  ensureDir(backupDir);
  // copy components dir
  if (fs.existsSync(COMPONENTS_DIR)){
    if (!DRY) fs.cpSync(COMPONENTS_DIR, path.join(backupDir, 'components'), { recursive: true });
  }
  return backupDir;
}

function applyMoves(){
  for (const m of moveEntries){
    if (!fs.existsSync(m.fromAbs)) { continue; }
    ensureDir(path.dirname(m.toAbs));
    if (DRY){
      log(`[dry] move ${posixPath(path.relative(ROOT, m.fromAbs))} -> ${posixPath(path.relative(ROOT, m.toAbs))}`);
    } else {
      fs.renameSync(m.fromAbs, m.toAbs);
      log(`moved ${posixPath(path.relative(ROOT, m.fromAbs))} -> ${posixPath(path.relative(ROOT, m.toAbs))}`);
    }
  }
}

function main(){
  log(`Components reorg ${DRY ? '(dry-run)' : '(apply)'}`);
  const backupDir = backupComponents();
  log(`Backup prepared at: ${posixPath(path.relative(ROOT, backupDir))}`);

  // Update imports first
  const files = [];
  walk(ROOT, files);
  const codeFiles = files.filter(f => /\.(tsx|ts|jsx|js|mjs)$/.test(f));
  let changedCount = 0;
  for (const f of codeFiles){
    // Skip backups and node_modules by walker rules
    const changed = updateImportsInFile(f);
    if (changed) changedCount++;
  }
  log(`${DRY ? '[dry] would update' : 'updated'} imports in ${changedCount} files`);

  // Then move files
  applyMoves();

  log('Done.');
}

if (require.main === module){
  main();
}
