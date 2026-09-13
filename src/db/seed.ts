import postgres from 'postgres';
import { ACHIEVEMENTS } from '../lib/gamification/achievements';
import { DEFAULT_RANKS, DEFAULT_APP_SETTINGS } from './local-store';

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Please set DATABASE_URL in .env');
    process.exit(1);
  }

  console.log('Seeding initial ranks, settings, and achievements into PostgreSQL / Supabase...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    // 1. Seed Ranks
    for (const rank of DEFAULT_RANKS) {
      await sql`
        INSERT INTO rank_definitions (id, name, description, icon, logo_url, min_xp, display_order, enabled, badge_color, glow_color, rank_up_message, celebration_video_url)
        VALUES (${rank.id}, ${rank.name}, ${rank.description}, ${rank.icon}, ${rank.logoUrl}, ${rank.minXp}, ${rank.displayOrder}, ${rank.enabled}, ${rank.badgeColor}, ${rank.glowColor}, ${rank.rankUpMessage}, ${rank.celebrationVideoUrl})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          logo_url = EXCLUDED.logo_url,
          min_xp = EXCLUDED.min_xp,
          display_order = EXCLUDED.display_order,
          enabled = EXCLUDED.enabled,
          badge_color = EXCLUDED.badge_color,
          glow_color = EXCLUDED.glow_color,
          rank_up_message = EXCLUDED.rank_up_message;
      `;
    }
    console.log(`Seeded ${DEFAULT_RANKS.length} ranks successfully!`);

    // 2. Seed App Settings
    for (const setting of DEFAULT_APP_SETTINGS) {
      await sql`
        INSERT INTO app_settings (id, key, value, value_type, category, description)
        VALUES (${setting.id}, ${setting.key}, ${setting.value}, ${setting.valueType}, ${setting.category}, ${setting.description})
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          description = EXCLUDED.description;
      `;
    }
    console.log(`Seeded ${DEFAULT_APP_SETTINGS.length} app settings successfully!`);

    // 3. Seed Achievements
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const ach = ACHIEVEMENTS[i];
      await sql`
        INSERT INTO achievements (id, name, description, icon, requirement_type, requirement_value, xp_reward, display_order, enabled)
        VALUES (${ach.id}, ${ach.name}, ${ach.description}, ${ach.icon}, ${ach.requirementType}, ${ach.requirementValue}, ${ach.xpReward}, ${i + 1}, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          requirement_type = EXCLUDED.requirement_type,
          requirement_value = EXCLUDED.requirement_value,
          xp_reward = EXCLUDED.xp_reward,
          display_order = EXCLUDED.display_order,
          enabled = EXCLUDED.enabled;
      `;
    }
    console.log(`Seeded ${ACHIEVEMENTS.length} achievements successfully!`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSeed();
