import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

let config: any;

if (databaseUrl) {
  console.log("Using DATABASE_URL to connect to database.");
  config = defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    schemaFilter: ["public"],
    dbCredentials: {
      url: databaseUrl,
    },
    verbose: true,
  });
} else {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error("Missing database connection variables.");
  }

  console.log(`Using individual SQL variables for user: ${user} to connect to database.`);
  config = defineConfig({
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
}

export default config;
