import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationsDir = path.join(rootDir, "migrations");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const entries = await readdir(migrationsDir);
    const files = entries.filter((f) => f.endsWith(".sql")).sort();

    const { rows } = await client.query("SELECT filename FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`Applying ${file}...`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }

    console.log("Migrations up to date.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
