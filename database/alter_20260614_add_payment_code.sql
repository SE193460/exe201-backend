-- Add sequential code to payment_transactions
-- Format: RM + 2-digit year + 4-digit sequential number (e.g., RM260001)

CREATE SEQUENCE IF NOT EXISTS payment_code_seq START 1;

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS code TEXT;

-- Backfill existing rows with generated codes
WITH numbered AS (
  SELECT id,
    'RM' || TO_CHAR(created_at, 'YY') || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') AS gen_code
  FROM payment_transactions
  WHERE code IS NULL
)
UPDATE payment_transactions
SET code = numbered.gen_code
FROM numbered
WHERE payment_transactions.id = numbered.id;

-- Advance sequence past backfilled count so next generated code doesn't collide
DO $$
DECLARE
  max_n INT;
BEGIN
  SELECT COALESCE(MAX(CAST(RIGHT(code, 4) AS INTEGER)), 0)
    INTO max_n
    FROM payment_transactions
    WHERE code ~ '^RM\d{6}$';
  IF max_n > 0 THEN
    PERFORM setval('payment_code_seq', max_n);
  END IF;
END $$;

-- Add unique constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_code_unique'
  ) THEN
    ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_code_unique UNIQUE (code);
  END IF;
END $$;
