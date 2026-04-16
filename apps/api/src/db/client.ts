import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "./schema.js";

const { Pool } = pkg;

export type DB = NodePgDatabase<typeof schema>;

/**
 * Build a Drizzle client backed by node-postgres against `DATABASE_URL`.
 * In tests the API caller injects a different DB built via {@link wrapPgPool}.
 */
export function makeDb(url: string): DB {
  const pool = new Pool({ connectionString: url, max: 10 });
  return drizzle(pool, { schema });
}

/**
 * Wrap a pg-compatible Pool (e.g. one produced by `pg-mem`'s
 * `adapters.createPg()`) into a Drizzle DB instance. Used by tests.
 */
export function wrapPgPool(pool: unknown): DB {
  return drizzle(pool as never, { schema });
}

export { schema };
