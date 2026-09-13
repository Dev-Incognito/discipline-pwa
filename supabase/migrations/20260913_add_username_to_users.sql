-- Add username column to users table for multi-user support
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
UPDATE users SET username = 'admin' WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
