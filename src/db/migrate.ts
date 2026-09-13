import postgres from 'postgres';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Please set DATABASE_URL in .env');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL / Supabase...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Applying database schema migrations...');

    // Users table
    await sql`
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
    `;

    // Daily checkins table
    await sql`
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
    `;

    // Weekly progress table
    await sql`
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
    `;

    // Achievements table
    await sql`
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
    `;

    // Rank definitions table
    await sql`
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
    `;

    // App settings table
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        value_type TEXT NOT NULL DEFAULT 'string',
        category TEXT NOT NULL DEFAULT 'general',
        description TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // User achievements junction table
    await sql`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
      );
    `;

    // Settings table
    await sql`
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
    `;

    // Admin audit logs
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_action TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB
      );
    `;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_last_checkin ON users(last_checkin_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON daily_checkins(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins(date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_weekly_user_id ON weekly_progress(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ranks_order ON rank_definitions(display_order);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ranks_min_xp ON rank_definitions(min_xp);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_category ON app_settings(category);`;

    console.log('Schema migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
