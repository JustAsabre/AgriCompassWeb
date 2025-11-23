Migration: bankAccount -> mobileNumber mapping

Purpose:
- Migrate possible Ghana mobile numbers stored in the 'bank_account' column into the 'mobile_number' column.
- Only applies when the 'bank_account' appears to be a Ghana mobile number: either in E.164 (+233XXXXXXXXX) or local format (0XXXXXXXXX).

Notes and precautions:
- Bank account fields may contain different content such as account numbers or IBANs; this migration only updates rows where 'bank_account' resembles a Ghana mobile number.
- Backup the database before running migration.
- Review rows updated after migration to confirm no other data was overwritten.
- Consider capturing 'bank_account' values in a separate column or log before modifying them.

SQL Approach:
1. Add 'mobile_number' column (if not already added).
2. For rows where 'mobile_number' is NULL and 'bank_account' matches Ghana mobile regex, copy across appropriately:
   - If bank_account starts with '0', strip leading '0' and replace with '+233'.
   - If bank_account already starts with '+233', keep as-is.
3. Optionally set bank_account to NULL or add a historical audit record if desired.

Proposed SQL (Postgres):
UPDATE users
SET mobile_number = CASE
  WHEN bank_account ~ '^\\+233[0-9]{9}$' THEN bank_account
  WHEN bank_account ~ '^0[0-9]{9}$' THEN '+233' || substring(bank_account from 2)
  ELSE mobile_number
END
WHERE mobile_number IS NULL AND (bank_account ~ '^\\+233[0-9]{9}$' OR bank_account ~ '^0[0-9]{9}$');

Repeat for Payouts table as needed.

Testing and Validation:
- Run the migration against a staging database first.
- Verify a sample of updated rows for correctness.
- Ensure application behavior still works (order flow, payouts).

Rollback Plan:
- If wrong rows were updated, restore from backup or use a script to revert mobile_number to NULL for rows where the bank_account wasn't a valid mobile number originally.

Alternative:
- If in doubt, instead of moving data directly, generate a report of users with bank_account matching the pattern and perform manual review and corrections.