-- Add subcategory to listings and create moderation_stats table
DO $$
BEGIN
  -- Add subcategory column to listings if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'subcategory'
  ) THEN
    ALTER TABLE listings ADD COLUMN subcategory text;
  END IF;
END$$;

-- Create moderation_stats table for analytics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'moderation_stats'
  ) THEN
    CREATE TABLE moderation_stats (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      date timestamp NOT NULL,
      content_type text NOT NULL,
      total_pending integer DEFAULT 0,
      total_approved integer DEFAULT 0,
      total_rejected integer DEFAULT 0,
      average_moderation_time integer,
      created_at timestamp DEFAULT now()
    );
  END IF;
END$$;

-- Add indexes for moderation_stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'moderation_stats' AND indexname = 'idx_moderation_stats_date'
  ) THEN
    CREATE INDEX idx_moderation_stats_date ON moderation_stats(date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'moderation_stats' AND indexname = 'idx_moderation_stats_content_type'
  ) THEN
    CREATE INDEX idx_moderation_stats_content_type ON moderation_stats(content_type);
  END IF;
END$$;