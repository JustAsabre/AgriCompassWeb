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
    const res = await client.query('SELECT now() as now');
    console.log('DB connection OK, now:', res.rows[0].now);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('DB connection failed:', err);
    try { await client.end(); } catch(e){}
    process.exit(1);
  }
})();