-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash TEXT NOT NULL,
  current_xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_successful_days INTEGER NOT NULL DEFAULT 0,
  current_rank TEXT NOT NULL DEFAULT 'Beginner',
  last_checkin_date TEXT,
  weekly_goal INTEGER NOT NULL DEFAULT 6,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Daily Check-ins Table
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  mood TEXT,
  journal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_checkin_date UNIQUE (user_id, date)
);

-- 4. Weekly Progress Table
CREATE TABLE IF NOT EXISTS weekly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  completed_days INTEGER NOT NULL DEFAULT 0,
  weekly_goal INTEGER NOT NULL DEFAULT 6,
  week_completed BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_week_start UNIQUE (user_id, week_start)
);

-- 5. Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  display_order INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Rank Definitions Table (CMS)
CREATE TABLE IF NOT EXISTS rank_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  logo_url TEXT,
  min_xp INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  badge_color TEXT NOT NULL DEFAULT 'text-amber-400 bg-amber-950/80 border-amber-700',
  glow_color TEXT NOT NULL DEFAULT 'shadow-amber-500/20',
  rank_up_message TEXT NOT NULL DEFAULT 'A new rank has been unlocked!',
  celebration_video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Application Settings Table (CMS)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. User Achievements Junction Table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);

-- 9. Settings Table (Theme & Audio)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  haptics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TEXT,
  theme TEXT NOT NULL DEFAULT 'onyx',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- 11. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_last_checkin ON users(last_checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins(date);
CREATE INDEX IF NOT EXISTS idx_weekly_user_id ON weekly_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_ranks_order ON rank_definitions(display_order);
CREATE INDEX IF NOT EXISTS idx_ranks_min_xp ON rank_definitions(min_xp);
CREATE INDEX IF NOT EXISTS idx_settings_category ON app_settings(category);

-- 12. Seed Ranks
INSERT INTO rank_definitions (id, name, min_xp, icon, logo_url, display_order, enabled, description, badge_color, glow_color, rank_up_message)
VALUES
  ('beginner', 'Beginner', 0, '🥚', '/ranks/beginner.svg', 1, true, 'Every journey starts somewhere.', 'text-zinc-400 bg-zinc-800/80 border-zinc-700', 'shadow-zinc-500/20', 'Welcome to your journey.'),
  ('warrior', 'Warrior', 100, '⚔️', '/ranks/warrior.svg', 2, true, 'Consistency is becoming a habit.', 'text-blue-400 bg-blue-950/80 border-blue-700', 'shadow-blue-500/20', 'Consistency is becoming a habit.'),
  ('chad', 'Chad', 300, '💪', '/ranks/chad.svg', 3, true, 'You''re building serious momentum.', 'text-emerald-400 bg-emerald-950/80 border-emerald-700', 'shadow-emerald-500/20', 'You''re building serious momentum.'),
  ('giga-chad', 'Giga Chad', 750, '🗿', '/ranks/giga_chad.svg', 4, true, 'Elite consistency unlocked.', 'text-amber-400 bg-amber-950/80 border-amber-700', 'shadow-amber-500/20', 'Elite consistency unlocked.'),
  ('hercules', 'Hercules', 1500, '⚡', '/ranks/hercules.svg', 5, true, 'You''re entering legendary territory.', 'text-orange-400 bg-orange-950/80 border-orange-700', 'shadow-orange-500/20', 'You''re entering legendary territory.'),
  ('titan', 'Titan', 3000, '👑', '/ranks/titan.svg', 6, true, 'Very few ever reach this level.', 'text-purple-400 bg-purple-950/80 border-purple-700', 'shadow-purple-500/20', 'Titan power achieved. Exceptional discipline.'),
  ('ascended', 'Ascended', 6000, '🌌', '/ranks/ascended.svg', 7, true, 'Transcendent self-control and focus.', 'text-rose-400 bg-rose-950/80 border-rose-700', 'shadow-rose-500/20', 'Ascended discipline unlocked. True mastery.'),
  ('legend', 'Legend', 10000, '🐐', '/ranks/legend.svg', 8, true, 'The pinnacle of greatness. GOAT status.', 'text-yellow-300 bg-yellow-950/80 border-yellow-500', 'shadow-yellow-500/30', 'The final rank. You are a living Legend.')
ON CONFLICT (id) DO NOTHING;

-- 13. Seed App Settings
INSERT INTO app_settings (id, key, value, value_type, category, description)
VALUES
  ('app_name', 'app_name', 'Discipline', 'string', 'general', 'Application display name'),
  ('app_tagline', 'app_tagline', 'Private Habit & Progression', 'string', 'general', 'Application tagline'),
  ('dashboard_subtitle', 'dashboard_subtitle', 'Build discipline. Build yourself.', 'string', 'text', 'Dashboard hero subtitle'),
  ('checkin_success_message', 'checkin_success_message', 'Another day locked in.', 'string', 'text', 'Check-in success modal message'),
  ('streak_reset_message', 'streak_reset_message', 'Streak ended. Progress didn''t.', 'string', 'text', 'Non-shaming streak setback message'),
  ('weekly_completion_message', 'weekly_completion_message', 'Week complete. Keep building.', 'string', 'text', 'Weekly goal completion celebration message'),
  ('daily_checkin_xp', 'daily_checkin_xp', '10', 'number', 'xp', 'Base XP awarded for daily check-in'),
  ('weekly_goal_xp', 'weekly_goal_xp', '100', 'number', 'xp', 'Bonus XP awarded for hitting weekly goal'),
  ('streak_7_xp', 'streak_7_xp', '50', 'number', 'xp', 'Bonus XP for 7-day streak milestone'),
  ('streak_30_xp', 'streak_30_xp', '150', 'number', 'xp', 'Bonus XP for 30-day streak milestone'),
  ('streak_100_xp', 'streak_100_xp', '500', 'number', 'xp', 'Bonus XP for 100-day streak milestone'),
  ('default_weekly_goal', 'default_weekly_goal', '6', 'number', 'goals', 'Default days required per week'),
  ('min_weekly_goal', 'min_weekly_goal', '1', 'number', 'goals', 'Minimum allowed weekly goal'),
  ('max_weekly_goal', 'max_weekly_goal', '7', 'number', 'goals', 'Maximum allowed weekly goal'),
  ('week_start_day', 'week_start_day', 'Monday', 'string', 'goals', 'First day of weekly tracking cycle'),
  ('week_end_day', 'week_end_day', 'Sunday', 'string', 'goals', 'Last day of weekly tracking cycle'),
  ('max_journal_length', 'max_journal_length', '280', 'number', 'general', 'Maximum characters for private check-in note'),
  ('mood_tracking_enabled', 'mood_tracking_enabled', 'true', 'boolean', 'general', 'Enable mood selector in check-in'),
  ('journal_enabled', 'journal_enabled', 'true', 'boolean', 'general', 'Enable private journal note field'),
  ('urge_mode_enabled', 'urge_mode_enabled', 'true', 'boolean', 'general', 'Enable emergency Urge pause screen'),
  ('urge_timer_duration', 'urge_timer_duration', '300', 'number', 'general', 'Urge mode countdown in seconds (300 = 5 min)'),
  ('achievements_enabled', 'achievements_enabled', 'true', 'boolean', 'general', 'Enable achievements and trophy room'),
  ('stats_enabled', 'stats_enabled', 'true', 'boolean', 'general', 'Enable RPG stats and calendar heatmap'),
  ('admin_session_timeout', 'admin_session_timeout', '60', 'number', 'security', 'Admin inactivity session timeout in minutes')
ON CONFLICT (key) DO NOTHING;

-- 14. Seed Achievements
INSERT INTO achievements (id, name, description, icon, requirement_type, requirement_value, xp_reward, display_order, enabled)
VALUES
  ('first-step', 'First Step', 'Complete your first day.', 'Footprints', 'total_days', '1', 25, 1, true),
  ('7-day-warrior', '7-Day Warrior', 'Reach a 7-day streak.', 'Shield', 'streak', '7', 50, 2, true),
  ('14-day-discipline', '14-Day Discipline', 'Reach a 14-day streak.', 'Flame', 'streak', '14', 75, 3, true),
  ('30-day-strong', '30-Day Strong', 'Reach a 30-day streak.', 'Zap', 'streak', '30', 150, 4, true),
  ('50-day-warrior', '50-Day Warrior', 'Reach a 50-day streak.', 'Sword', 'streak', '50', 250, 5, true),
  ('century-club', 'Century', 'Reach 100 total successful days.', 'Target', 'total_days', '100', 500, 6, true),
  ('weekly-champion', 'Unbreakable', 'Complete 4 weekly goals.', 'Award', 'weekly_goals', '4', 200, 7, true),
  ('rank-giga-chad', 'Giga Chad', 'Reach the Giga Chad rank.', 'Crown', 'rank', 'Giga Chad', 100, 8, true),
  ('rank-hercules', 'Hercules', 'Reach the Hercules rank.', 'Sparkles', 'rank', 'Hercules', 200, 9, true),
  ('rank-legend', 'Legend', 'Reach the Legend rank.', 'Trophy', 'rank', 'Legend', 500, 10, true)
ON CONFLICT (id) DO NOTHING;
