import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

/**
 * Resolves a valid PostgreSQL host or Unix domain socket path.
 * If SQL_HOST points to a non-existent socket, probes known Cloud SQL socket locations.
 */
export const resolvePostgresSocketHost = (): string | undefined => {
  const host = process.env.SQL_HOST;
  if (!host) return undefined;

  // If TCP host (e.g. localhost or IP/domain)
  if (!host.startsWith('/')) {
    return host;
  }

  // If Unix domain socket path exists on disk
  if (fs.existsSync(host)) {
    return host;
  }

  // Scan common Cloud SQL socket directories for valid socket file or folder
  const candidateDirs = ['/app/cloudsql', '/cloudsql'];
  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(dir)) {
        const subdirs = fs.readdirSync(dir);
        for (const sub of subdirs) {
          const fullPath = `${dir}/${sub}`;
          const socketFile = `${fullPath}/.s.PGSQL.5432`;
          if (fs.existsSync(socketFile) || fs.existsSync(fullPath)) {
            return fullPath;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return host;
};

/**
 * Unified PostgreSQL Pool Configuration Resolver
 * Ensures application runtime and migration tools share the exact same connection logic,
 * with DATABASE_URL priority, Unix domain socket / Cloud SQL support, and SSL handling.
 */
export const getPostgresPoolConfig = (options?: { isAdmin?: boolean }): PoolConfig => {
  const resolvedHost = resolvePostgresSocketHost();
  const isSocket = Boolean(resolvedHost && resolvedHost.startsWith('/'));
  const useSsl =
    process.env.SQL_SSL === 'true' ||
    (process.env.NODE_ENV === 'production' &&
      !isSocket &&
      resolvedHost &&
      !resolvedHost.includes('localhost'));

  const poolConfig: PoolConfig = {
    max: 10,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
  };

  const adminUser = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const adminPassword = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

  if (process.env.DATABASE_URL) {
    poolConfig.connectionString = process.env.DATABASE_URL;
    if (useSsl) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  } else {
    poolConfig.host = resolvedHost || process.env.SQL_HOST;
    poolConfig.port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432;
    poolConfig.user = options?.isAdmin ? adminUser : process.env.SQL_USER;
    poolConfig.password = options?.isAdmin ? adminPassword : process.env.SQL_PASSWORD;
    poolConfig.database = process.env.SQL_DB_NAME;
    if (useSsl && !isSocket) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  }

  return poolConfig;
};

export const createPool = () => {
  if (!global._postgresPool) {
    const poolConfig = getPostgresPoolConfig({ isAdmin: false });
    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (_err) => {
      // Suppress unhandled idle client error logging when proxy terminates connection
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

