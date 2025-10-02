# Apply Username Cooldown Migration

## Quick Setup

### Step 1: Apply the Database Migration

Choose one of the following methods:

#### Method A: Supabase Dashboard (Easiest)
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Add username_changed_at column to track when username was last changed
-- This enforces a 24-hour cooldown between username changes

ALTER TABLE users
ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_username_changed_at ON users(username_changed_at);

-- Add a comment explaining the column
COMMENT ON COLUMN users.username_changed_at IS 'Timestamp of when the username was last changed. Used to enforce 24-hour cooldown.';
```

6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

#### Method B: Supabase CLI
```bash
# Make sure you're connected to your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

### Step 2: Restart Your Dev Server
```bash
npm run dev
```

### Step 3: Test It Out
1. Go to your profile
2. Edit your username
3. Try to edit it again immediately
4. You should see a cooldown message!

## Verification

To verify the migration worked, run this in SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'username_changed_at';
```

Expected result:
```
column_name          | data_type
---------------------+--------------------------
username_changed_at  | timestamp with time zone
```

## That's It! 🎉

Your username cooldown feature is now active. Users can only change their username once every 24 hours.
