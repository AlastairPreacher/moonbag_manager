/*
  # Add portfolio constraints

  1. Changes
    - Add unique constraint on portfolios (user_id, name) to prevent duplicate portfolio names per user
    - Update generate_test_data function to handle the constraint properly

  2. Security
    - No changes to RLS policies
*/

-- Add unique constraint to portfolios table
ALTER TABLE portfolios
ADD CONSTRAINT portfolios_user_id_name_key UNIQUE (user_id, name);

-- Drop and recreate the generate_test_data function with updated portfolio handling
DROP FUNCTION IF EXISTS generate_test_data(uuid);

CREATE OR REPLACE FUNCTION generate_test_data(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_portfolio_id uuid;
  v_eth_asset_id uuid;
  v_btc_asset_id uuid;
  v_sol_asset_id uuid;
  v_start_date timestamptz;
  v_base_price numeric;
  v_amount numeric;
  v_portfolio_name text;
  i integer;
BEGIN
  -- Generate a unique portfolio name
  v_portfolio_name := 'Test Portfolio';
  i := 1;
  WHILE EXISTS (
    SELECT 1 FROM portfolios 
    WHERE user_id = p_user_id AND name = v_portfolio_name
  ) LOOP
    v_portfolio_name := 'Test Portfolio ' || i;
    i := i + 1;
  END LOOP;

  -- Create a test portfolio
  INSERT INTO portfolios (user_id, name, is_default)
  VALUES (p_user_id, v_portfolio_name, true)
  RETURNING id INTO v_portfolio_id;

  -- Create or get ETH asset
  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES (p_user_id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 1, 'ETH', 'Ethereum', 18)
  ON CONFLICT (token_address, chain_id) DO UPDATE 
  SET user_id = p_user_id
  RETURNING id INTO v_eth_asset_id;

  -- Create or get BTC asset
  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES (p_user_id, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 1, 'BTC', 'Bitcoin', 8)
  ON CONFLICT (token_address, chain_id) DO UPDATE 
  SET user_id = p_user_id
  RETURNING id INTO v_btc_asset_id;

  -- Create or get SOL asset
  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES (p_user_id, 'So11111111111111111111111111111111111111112', 999999, 'SOL', 'Solana', 9)
  ON CONFLICT (token_address, chain_id) DO UPDATE 
  SET user_id = p_user_id
  RETURNING id INTO v_sol_asset_id;

  -- Set start date to 6 months ago
  v_start_date := now() - interval '6 months';

  -- ETH transactions (starting around $2000)
  v_base_price := 2000;
  FOR i IN 1..20 LOOP
    -- Randomize price with a trend upward
    v_base_price := v_base_price * (1 + (random() * 0.1 - 0.03));
    -- Random amount between 0.1 and 2 ETH
    v_amount := random() * 1.9 + 0.1;
    
    INSERT INTO transactions (
      user_id,
      asset_id,
      portfolio_id,
      type,
      amount,
      price,
      timestamp,
      notes
    ) VALUES (
      p_user_id,
      v_eth_asset_id,
      v_portfolio_id,
      CASE WHEN random() < 0.7 THEN 'BUY'::transaction_type ELSE 'SELL'::transaction_type END,
      v_amount,
      v_base_price,
      v_start_date + (i || ' days')::interval + (random() * interval '1 day'),
      'Test transaction'
    );
  END LOOP;

  -- BTC transactions (starting around $30000)
  v_base_price := 30000;
  FOR i IN 1..15 LOOP
    v_base_price := v_base_price * (1 + (random() * 0.15 - 0.05));
    v_amount := random() * 0.2 + 0.01;
    
    INSERT INTO transactions (
      user_id,
      asset_id,
      portfolio_id,
      type,
      amount,
      price,
      timestamp,
      notes
    ) VALUES (
      p_user_id,
      v_btc_asset_id,
      v_portfolio_id,
      CASE WHEN random() < 0.7 THEN 'BUY'::transaction_type ELSE 'SELL'::transaction_type END,
      v_amount,
      v_base_price,
      v_start_date + (i || ' days')::interval + (random() * interval '1 day'),
      'Test transaction'
    );
  END LOOP;

  -- SOL transactions (starting around $20)
  v_base_price := 20;
  FOR i IN 1..25 LOOP
    v_base_price := v_base_price * (1 + (random() * 0.2 - 0.07));
    v_amount := random() * 50 + 5;
    
    INSERT INTO transactions (
      user_id,
      asset_id,
      portfolio_id,
      type,
      amount,
      price,
      timestamp,
      notes
    ) VALUES (
      p_user_id,
      v_sol_asset_id,
      v_portfolio_id,
      CASE WHEN random() < 0.7 THEN 'BUY'::transaction_type ELSE 'SELL'::transaction_type END,
      v_amount,
      v_base_price,
      v_start_date + (i || ' days')::interval + (random() * interval '1 day'),
      'Test transaction'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;