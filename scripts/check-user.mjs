import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const email = process.argv[2] || 'farm1@gmail.com';

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query('SELECT id, email, full_name, role, created_at FROM users WHERE email=$1', [email]);
    if (res.rows.length === 0) {
      console.log('No user found with email', email);
    } else {
      console.log('User row:', res.rows[0]);
    }
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('DB query failed:', err);
    try { await client.end(); } catch(e){}
    process.exit(1);
  }
})();