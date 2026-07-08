-- Add status field to countermeasures (PENDING by default, COMPLETED when done)
ALTER TABLE countermeasures ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_cm_status'
  ) THEN
    ALTER TABLE countermeasures ADD CONSTRAINT check_cm_status CHECK (status IN ('PENDING', 'COMPLETED'));
  END IF;
END $$;
