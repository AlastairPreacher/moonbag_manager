/*
  # Fix transactions constraints and policies

  1. Changes
    - Safely add NOT NULL constraints
    - Safely add check constraints for amount and price
    - Update RLS policies
    - Add validation for required fields

  2. Security
    - Recreate RLS policies to ensure proper access
    - Maintain data integrity with constraints
*/

-- Safely add NOT NULL constraints
DO $$ 
BEGIN
  -- Check and set NOT NULL for asset_id
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'asset_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN asset_id SET NOT NULL;
  END IF;

  -- Check and set NOT NULL for amount
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'amount' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN amount SET NOT NULL;
  END IF;

  -- Check and set NOT NULL for price
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'price' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN price SET NOT NULL;
  END IF;

  -- Check and set NOT NULL for type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'type' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN type SET NOT NULL;
  END IF;
END $$;

-- Safely add check constraints
DO $$ 
BEGIN
  -- Add amount check if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.check_constraints 
    WHERE constraint_name = 'transactions_amount_check'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_amount_check 
    CHECK (amount > 0);
  END IF;

  -- Add price check if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.check_constraints 
    WHERE constraint_name = 'transactions_price_check'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_price_check 
    CHECK (price >= 0);
  END IF;
END $$;

-- Recreate RLS policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());