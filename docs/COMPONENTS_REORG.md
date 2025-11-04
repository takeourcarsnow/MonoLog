# Components folder reorganization (2025-11-05)

This document summarizes the updated structure of `app/components` and the rationale behind it, plus guidance for adding new components.

## New high-level layout

- app/components/layout/ — application layout primitives (AppShell, headers, client init, route prefetcher, etc.)
- app/components/ui/ — reusable UI primitives (Button, Skeleton, LoadingIndicator, ViewToggle, SlideWrapper, etc.)
- app/components/media/ — media viewers/editors (OptimizedImage, ImageZoom, ImageEditor, FullscreenViewer, MiniSlideshow)
- app/components/notifications/ — notifications system (NotificationItem, NotificationListener, NotificationsPopup, Toast, useNotifications)
- app/components/pwa/ — PWA helpers (InstallButton, InstallPrompt, OfflineButton, PWAAnalytics)
- app/components/auth/ — auth-related components (AuthForm, AuthRequired, etc.)
- app/components/account/ — account management (DeleteAccount)
- app/components/comments/ — comments system (CommentItem, CommentInput, ReplyInput, etc.)
- app/components/communities/ — communities views/cards
- app/components/feed/ — feed pages and views (FeedPage, FeedListView, FeedGridView, GridView, FeedEmptyState, etc.)
- app/components/profile/ — profile pages and parts
- app/components/post/ — post views and parts (PostView)
- app/components/publish/ — publish UI (PublishButton + styles, helpers)
- app/components/search/ — search client/live components
- app/components/hashtag/, favorites/, explore/, calendar/ — section-specific views
- app/components/uploader/ — uploader components (unchanged)
- app/components/imageEditor/, app/components/imageZoom/ — support modules kept at stable roots, imported via alias from media components
- app/components/nav/, icons/, postCard/ — existing domain folders kept as-is
- app/components/LazyMount.tsx, Portal.tsx, etc. — primitives moved under ui/ when appropriate

Notes:
- Relative imports inside components were normalized to use the `@/` alias for cross-folder references. This reduces fragility when moving files.
- Component-specific CSS lives next to the component when appropriate (e.g. publish/Auth styles), imported via relative `./*.css` inside the component.

## How to place new components

- If it’s an app shell piece or layout wrapper, put it in `layout/`.
- If it’s a generic, reusable UI element, put it in `ui/`.
- If it manipulates or displays media, put it in `media/` (and keep heavy helpers in `imageEditor/` or `imageZoom/`).
- Notification UI/hooks go to `notifications/`.
- Domain-specific views live with their domain: `feed/`, `profile/`, `communities/`, `comments/`, etc.
- Prefer `@/app/components/...` imports over long relative paths across folders.

## Migration tooling

A one-off script was added to automate moves and import rewrites:

- scripts/reorg-components.cjs — performs dry-run by default; use `--apply` to execute
- scripts/check-imports.cjs — verifies broken relative imports

Backups are stored under `backups/components-reorg-<timestamp>/components/` before applying changes.

## Post-migration status

- Build verified: `npm run build` completed successfully (Next.js 16 Turbopack).
- All known import paths were updated. If you add new files, prefer alias imports.

