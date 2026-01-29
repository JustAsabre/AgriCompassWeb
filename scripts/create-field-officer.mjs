import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { randomUUID } from 'crypto';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'Field Officer';

if (!email || !password) {
  console.error('\n❌ Usage: node scripts/create-field-officer.mjs <email> <password> [fullName]');
  console.error('   Example: node scripts/create-field-officer.mjs officer@agricompass.com SecurePass123 "John Doe"\n');
  process.exit(1);
}

// Validate password strength (minimum 10 characters as per project policy)
if (password.length < 10) {
  console.error('\n❌ Password must be at least 10 characters long (project security policy)\n');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    
    console.log('\n🔐 Creating Field Officer Account\n');
    console.log('=' .repeat(50));
    
    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.error(`\n❌ User with email "${email}" already exists!`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      
      // Offer to update role if not already a field_officer
      if (user.role !== 'field_officer') {
        console.log(`\n   To update this user to field_officer role, run:`);
        console.log(`   node scripts/update-user-role.mjs ${user.id} field_officer\n`);
      }
      await client.end();
      process.exit(1);
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Generate user ID
    const userId = randomUUID();
    
    // Insert the new field officer
    const insertQuery = `
      INSERT INTO users (
        id, email, password, full_name, role, 
        phone, region, verified, email_verified,
        created_at
      ) VALUES (
        $1, $2, $3, $4, 'field_officer',
        NULL, NULL, true, true,
        NOW()
      )
      RETURNING id, email, full_name, role, created_at;
    `;
    
    const result = await client.query(insertQuery, [
      userId,
      email.toLowerCase(),
      hashedPassword,
      fullName
    ]);
    
    const newUser = result.rows[0];
    
    console.log('\n✅ Field Officer Account Created Successfully!\n');
    console.log('   Account Details:');
    console.log('   ' + '-'.repeat(40));
    console.log(`   ID:         ${newUser.id}`);
    console.log(`   Email:      ${newUser.email}`);
    console.log(`   Full Name:  ${newUser.full_name}`);
    console.log(`   Role:       ${newUser.role}`);
    console.log(`   Created:    ${newUser.created_at}`);
    console.log('\n   The user can now log in at /auth with these credentials.\n');
    
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed to create field officer:', err.message);
    try { await client.end(); } catch(e){}
    process.exit(1);
  }
})();
