import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');
}

function createPostgresClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  // Supabase connection pooling (port 6543) requires `prepare: false`
  return postgres(connectionString, {
    max: process.env.NODE_ENV === 'production' ? 10 : 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  });
}

const client = global.__dbClient ?? createPostgresClient();
if (process.env.NODE_ENV !== 'production' && client) {
  global.__dbClient = client;
}

export const db = client ? drizzle(client, { schema }) : null;
export { schema };
