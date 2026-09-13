-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '⚔️',
  color TEXT NOT NULL DEFAULT 'amber',
  target_days_per_week INTEGER NOT NULL DEFAULT 6,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_successful_days INTEGER NOT NULL DEFAULT 0,
  last_checkin_date TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_archived ON goals(archived);

-- Add goal_id to daily_checkins and weekly_progress
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_checkins_goal_id ON daily_checkins(goal_id);

ALTER TABLE weekly_progress ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_weekly_progress_goal_id ON weekly_progress(goal_id);

-- Populate default goal for any existing users
INSERT INTO goals (user_id, title, description, icon, color, target_days_per_week, current_streak, longest_streak, total_successful_days, last_checkin_date)
SELECT u.id, 'Primary Discipline', 'Main habit and self-control tracker', '⚔️', 'amber', u.weekly_goal, u.current_streak, u.longest_streak, u.total_successful_days, u.last_checkin_date
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.user_id = u.id);

-- Associate existing checkins with the user's default goal
UPDATE daily_checkins dc
SET goal_id = (SELECT g.id FROM goals g WHERE g.user_id = dc.user_id ORDER BY g.created_at ASC LIMIT 1)
WHERE dc.goal_id IS NULL;

-- Associate existing weekly_progress with the user's default goal
UPDATE weekly_progress wp
SET goal_id = (SELECT g.id FROM goals g WHERE g.user_id = wp.user_id ORDER BY g.created_at ASC LIMIT 1)
WHERE wp.goal_id IS NULL;

-- Create unique index for user + goal + date
DROP INDEX IF EXISTS idx_user_date_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_goal_date_unique ON daily_checkins(user_id, goal_id, date);
