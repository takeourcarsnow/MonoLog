-- Add username_changed_at column to track when username was last changed
-- This enforces a 24-hour cooldown between username changes

ALTER TABLE users
ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_username_changed_at ON users(username_changed_at);

-- Add a comment explaining the column
COMMENT ON COLUMN users.username_changed_at IS 'Timestamp of when the username was last changed. Used to enforce 24-hour cooldown.';
