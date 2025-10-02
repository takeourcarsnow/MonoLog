# Database Migrations

## Applying Migrations

### Option 1: Supabase CLI (Recommended)
If you have the Supabase CLI installed:

```bash
supabase db push
```

### Option 2: SQL Editor in Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `add_username_changed_at.sql`
5. Click **Run** to execute the migration

### Option 3: Direct SQL Execution
If you have direct database access:

```bash
psql your_connection_string < supabase/migrations/add_username_changed_at.sql
```

## Migration Details

### `add_username_changed_at.sql`
- **Purpose**: Adds `username_changed_at` column to enforce 24-hour cooldown between username changes
- **Changes**: 
  - Adds `username_changed_at TIMESTAMPTZ` column to `users` table
  - Creates index for efficient lookups
  - Adds column documentation

## Verifying Migration

After applying the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username_changed_at';
```

Expected output:
```
column_name          | data_type
---------------------+--------------------------
username_changed_at  | timestamp with time zone
```
