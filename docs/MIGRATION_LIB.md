# Lib Folder Unification (2025-11-05)

This migration unified duplicated library code previously split across two paths:

- src/lib
- lib

The project now uses a single canonical location: lib/ at the repository root. All imports should reference this via the existing tsconfig path alias:

- Before: import { foo } from "@/src/lib/..." 
- After:  import { foo } from "@/lib/..."

## What the migration script did

1. Backed up the entire src/lib tree to backups/lib-migration-<timestamp>/src-lib-original.
2. Merged src/lib into lib/ recursively.
   - If a destination file already existed and differed, the old lib version was backed up to backups/lib-migration-<timestamp>/conflicts and the src/lib version took precedence (to preserve current behavior).
   - Identical files were skipped.
3. Updated imports across the codebase from "@/src/lib" to "@/lib".
4. Renamed src/lib to src/lib__migrated_<timestamp> as a safety measure.
5. Excluded backup and migrated directories from TypeScript compilation in tsconfig.json.

Backups are located at:

- backups/lib-migration-YYYY-MM-DD_HH-MM-SS/
  - logs/migration.log (full action log)
  - src-lib-original/ (pre-migration copy)
  - conflicts/ (previous lib/ versions where conflicts occurred)

## Notes

- The Next.js build passed after migration.
- A previously incorrect relative import in lib/api/utils.ts was normalized to use the alias: import { apiError } from "@/lib/apiResponse".
- proxy.ts import was updated to import from "@/lib/types".
- tsconfig excludes now include backups/** and src/lib__migrated_*/**.

## How to revert (optional)

If you need to restore a specific file:

1. Locate the desired version in backups/lib-migration-<timestamp>/src-lib-original or conflicts.
2. Copy it back to the corresponding location under lib/.
3. Ensure imports reference "@/lib/...".
4. Rebuild: npm run build
