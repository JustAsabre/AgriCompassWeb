import { createClient } from 'redis';
import 'dotenv/config';

const url = process.env.REDIS_URL;
if (!url) {
  console.error('REDIS_URL not set in environment');
  process.exit(1);
}

(async ()=>{
  const client = createClient({ url });
  client.on('error', (err) => console.error('Redis client error', err));
  try {
    await client.connect();
    const pong = await client.ping();
    console.log('Redis ping response:', pong);
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to ping Redis:', err);
    try { await client.disconnect(); } catch(e){}
    process.exit(1);
  }
})();