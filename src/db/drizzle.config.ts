import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

import fs from "fs";

dotenv.config();

let sqlHost = process.env.SQL_HOST;
if (sqlHost && sqlHost.startsWith('/') && !fs.existsSync(sqlHost)) {
  const candidateDirs = ['/app/cloudsql', '/cloudsql'];
  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(dir)) {
        const subdirs = fs.readdirSync(dir);
        for (const sub of subdirs) {
          const fullPath = `${dir}/${sub}`;
          if (fs.existsSync(`${fullPath}/.s.PGSQL.5432`) || fs.existsSync(fullPath)) {
            sqlHost = fullPath;
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

if (!sqlHost) {
  throw new Error("SQL_HOST must be set in environment variables.");
}
if (!sqlDbName) {
  throw new Error("SQL_DB_NAME must be set in environment variables.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  },
  verbose: true,
});
