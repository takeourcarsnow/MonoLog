# Username Change Cooldown - Implementation Summary

## Overview
Implemented a 24-hour cooldown period for username changes to prevent abuse and maintain stability.

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/add_username_changed_at.sql`
- Added `username_changed_at` column to `users` table (TIMESTAMPTZ)
- Created index for efficient lookups
- Added documentation comment

**To apply**: See `supabase/migrations/README.md` for instructions

### 2. Type Updates
**File**: `src/lib/types.ts`
- Added optional `usernameChangedAt?: string` field to `User` type

### 3. API Logic
**File**: `src/lib/api/supabase.ts`

#### `updateCurrentUser()` function:
- Fetches current profile to check `username_changed_at`
- Only enforces cooldown if username is actually changing
- Calculates hours since last change
- Throws descriptive error if < 24 hours have passed
- Updates `username_changed_at` timestamp when username changes
- Display name, bio, and avatar changes are NOT affected by cooldown

#### `mapProfileToUser()` function:
- Maps `username_changed_at` from database to `usernameChangedAt` in User object

### 4. UI Updates
**File**: `src/components/ProfileView.tsx`
- Added cooldown indicator next to username field
- Shows "🔒 Xh cooldown" when < 24 hours since last change
- Tooltip explains the restriction
- User will see clear error message from API if they try to change too soon

## User Experience

### When username can be changed:
- User updates username normally
- No visual indicators (cooldown expired or first time changing)

### When in cooldown period:
1. **Visual indicator**: Shows "🔒 5h cooldown" (example) next to username field
2. **If user tries anyway**: Error message displays:
   ```
   "You can only change your username once every 24 hours. 
   Try again in 5 hours (Oct 3, 2025, 2:30 PM)."
   ```

### Notes:
- Display name can be changed anytime (no restrictions)
- Bio can be changed anytime (no restrictions)
- Avatar can be changed anytime (no restrictions)
- Only username changes are rate-limited

## Testing

### Manual Test Steps:
1. Apply the database migration
2. Sign in and go to your profile
3. Edit your username and save
4. Try to edit username again immediately
5. You should see:
   - Cooldown indicator in the UI
   - Error message if you try to save

### To Reset Cooldown (for testing):
```sql
UPDATE users 
SET username_changed_at = NOW() - INTERVAL '25 hours' 
WHERE id = 'your-user-id';
```

## Security Considerations
- Cooldown is enforced server-side (not just UI)
- Timestamp is stored in database (can't be manipulated client-side)
- Only affects username changes (not other profile fields)
- First username change has no cooldown (NULL value)
