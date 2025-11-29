ALTER TABLE messages ADD COLUMN IF NOT EXISTS listing_id varchar REFERENCES listings(id);
