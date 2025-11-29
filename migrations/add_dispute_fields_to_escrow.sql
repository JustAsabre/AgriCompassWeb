ALTER TABLE escrow ADD COLUMN IF NOT EXISTS dispute_reason text;
ALTER TABLE escrow ADD COLUMN IF NOT EXISTS dispute_resolution text;
ALTER TABLE escrow ADD COLUMN IF NOT EXISTS disputed_at timestamp;
ALTER TABLE escrow ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamp;
