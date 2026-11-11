import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { createPool, getPostgresPoolConfig } from './index.ts';
import * as schema from './schema.ts';

/**
 * Drizzle Database Schema Migration Runner
 * Safely executes pending SQL migrations from the ./drizzle folder
 * and verifies PostgreSQL table readiness.
 */
export async function runMigrations() {
  console.log('--- بدء ترحيل وتدقيق مخطط قاعدة بيانات PostgreSQL (Drizzle Migration) ---');
  
  const poolConfig = getPostgresPoolConfig({ isAdmin: true });
  const pool = new Pool(poolConfig);
  const db = drizzle(pool, { schema });

  try {
    // 1. Check database connectivity & version
    const testQuery = await pool.query('SELECT current_user, current_database(), version()');
    const { current_user, current_database, version } = testQuery.rows[0];
    console.log(`✓ متصل بقاعدة البيانات: "${current_database}" كمستخدم: "${current_user}"`);
    console.log(`✓ إصدار محرك PostgreSQL: ${version.split(' ')[0]} ${version.split(' ')[1]}`);

    // 2. Execute migrations from ./drizzle folder inside public schema
    console.log('✓ جاري تطبيق الترحيلات من المجلد ./drizzle داخل مخطط public...');
    await migrate(db, {
      migrationsFolder: './drizzle',
      migrationsTable: '__drizzle_migrations',
      migrationsSchema: 'public',
    });
    console.log('✓ تم تطبيق ترحيلات المخطط بنجاح.');

    // 3. Verify public tables
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    console.log(`✓ الجداول المعتمدة والنشطة في PostgreSQL (${tableNames.length}):`, tableNames.join(', '));

    return {
      success: true,
      currentUser: current_user,
      currentDatabase: current_database,
      tables: tableNames,
    };
  } catch (err: any) {
    console.error('❌ فشل تنفيذ ترحيل قاعدة البيانات:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Direct execution from CLI (e.g. npm run db:migrate)
if (process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(async () => {
      console.log('🎉 اكتمل ترحيل المخطط بنجاح.');
      if (global._postgresPool) {
        await global._postgresPool.end();
      }
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration failed with error:', err);
      if (global._postgresPool) {
        await global._postgresPool.end();
      }
      process.exit(1);
    });
}
