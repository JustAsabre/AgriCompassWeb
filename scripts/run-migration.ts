import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables before importing db
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
    // Dynamic import to ensure process.env is populated
    const { pool } = await import("../server/db");

    if (!pool) {
        console.error("Database pool not initialized. Check DATABASE_URL.");
        process.exit(1);
    }

    const migrationFile = path.join(__dirname, "../migrations/add_reviewed_at_to_verifications.sql");

    try {
        const sql = fs.readFileSync(migrationFile, "utf8");
        console.log("Running migration:", migrationFile);

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query("COMMIT");
            console.log("Migration completed successfully.");
        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Migration failed:", err);
            process.exit(1);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error reading or executing migration:", err);
        process.exit(1);
    } finally {
        // Close pool to allow script to exit
        await pool.end();
    }
}

runMigration();
