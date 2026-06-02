import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const migrationFiles = process.argv.slice(2);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

if (migrationFiles.length === 0) {
  throw new Error("Pass at least one migration file path");
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  for (const file of migrationFiles) {
    const absolutePath = path.resolve(file);
    const sql = await fs.readFile(absolutePath, "utf8");
    process.stdout.write(`Running ${file}...\n`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("commit");
      process.stdout.write(`Done ${file}\n`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
