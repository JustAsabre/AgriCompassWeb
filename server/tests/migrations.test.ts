import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('drizzle migrations', () => {
  it('should contain payments migration', async () => {
    const migrationsDir = path.join(process.cwd(), 'drizzle', 'migrations');
    const sqlPath = path.join(migrationsDir, '0002_create_payments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    expect(sql.toLowerCase()).toContain('create table');
    expect(sql.toLowerCase()).toContain('payments');
    expect(sql.toLowerCase()).toContain('transaction_id');
  });

  it('should contain payouts migration', async () => {
    const migrationsDir = path.join(process.cwd(), 'drizzle', 'migrations');
    const sqlPath = path.join(migrationsDir, '0003_create_payouts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    expect(sql.toLowerCase()).toContain('create table');
    expect(sql.toLowerCase()).toContain('payouts');
    expect(sql.toLowerCase()).toContain('paystack_transfer_id');
  });
});
