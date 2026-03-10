import 'dotenv/config';
import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const globalForDb = globalThis as typeof globalThis & {
  __groovvPool?: Pool;
};

export const pool =
  globalForDb.__groovvPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__groovvPool = pool;
}

export const db = drizzle(pool, {schema});
