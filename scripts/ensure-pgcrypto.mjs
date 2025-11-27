import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('Connected to DB, creating extension pgcrypto if not exists...');
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    console.log('Ensured pgcrypto extension is installed');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure pgcrypto:', err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
})();