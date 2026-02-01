-- Add trust score and review integrity fields

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS expected_delivery_at timestamp;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamp;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS published_at timestamp;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS flagged_at timestamp;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS flag_reason text;

-- Backfill review status from existing approval flag
UPDATE reviews
SET status = CASE WHEN approved THEN 'published' ELSE 'pending' END
WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS review_responses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id varchar NOT NULL REFERENCES reviews(id),
  responder_id varchar NOT NULL REFERENCES users(id),
  response text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trust_score_snapshots (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id),
  score numeric(3,2) NOT NULL,
  rating_score numeric(3,2) NOT NULL,
  reliability_score numeric(3,2) NOT NULL,
  review_count integer DEFAULT 0,
  order_count integer DEFAULT 0,
  confidence_tier text,
  calculated_at timestamp DEFAULT now()
);
