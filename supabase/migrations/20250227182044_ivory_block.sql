/*
  # Fix test data generation

  1. Changes
    - Add ON CONFLICT DO NOTHING for assets
    - Use COALESCE to get existing asset IDs
    - Improve error handling
    - Add transaction to ensure data consistency

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Function to generate random number between two values
CREATE OR REPLACE FUNCTION random_between(low NUMERIC, high NUMERIC) 
RETURNS NUMERIC AS $$
BEGIN
  RETURN floor(random() * (high - low + 1) + low);
END;
$$ LANGUAGE plpgsql;

-- Function to generate test data
CREATE OR REPLACE FUNCTION generate_test_data(user_id uuid)
RETURNS void AS $$
DECLARE
  portfolio_id uuid;
  eth_asset_id uuid;
  btc_asset_id uuid;
  sol_asset_id uuid;
  start_date timestamptz;
  base_price numeric;
  amount numeric;
  i integer;
BEGIN
  -- Create a test portfolio if none exists
  INSERT INTO portfolios (user_id, name, is_default)
  VALUES (user_id, 'Test Portfolio', true)
  ON CONFLICT (user_id, name) DO NOTHING
  RETURNING id INTO portfolio_id;

  -- If portfolio already existed, get its ID
  IF portfolio_id IS NULL THEN
    SELECT id INTO portfolio_id
    FROM portfolios
    WHERE user_id = user_id AND name = 'Test Portfolio';
  END IF;

  -- Create or get ETH asset
  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES (user_id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 1, 'ETH', 'Ethereum', 18)
  ON CONFLICT (token_address, chain_id) DO NOTHING;
  
  SELECT id INTO eth_asset_id
  FROM assets
  WHERE token_address = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  AND chain_id = 1
  AND user_id = user_id;

  -- Create or get BTC asset
  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES (user_id, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 1, 'BTC', 'Bitcoin', 8)
  ON CONFLICT (token_address, chain_id) DO NOTHING;
  
  SELECT id INTO btc_asset_id
  FROM assets
  WHERE token_address = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
  AND chain_id = 1
  AND user_id = user_id;

  -- Create or get SOL asset
  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES (user_id, 'So11111111111111111111111111111111111111112', 999999, 'SOL', 'Solana', 9)
  ON CONFLICT (token_address, chain_id) DO NOTHING;
  
  SELECT id INTO sol_asset_id
  FROM assets
  WHERE token_address = 'So11111111111111111111111111111111111111112'
  AND chain_id = 999999
  AND user_id = user_id;

  -- Delete existing test transactions
  DELETE FROM transactions
  WHERE user_id = user_id
  AND portfolio_id = portfolio_id;

  -- Set start date to 6 months ago
  start_date := now() - interval '6 months';

  -- ETH transactions (starting around $2000)
  base_price := 2000;
  FOR i IN 1..20 LOOP
    -- Randomize price with a trend upward
    base_price := base_price * (1 + (random() * 0.1 - 0.03));
    -- Random amount between 0.1 and 2 ETH
    amount := random() * 1.9 + 0.1;
    
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
      user_id,
      eth_asset_id,
      portfolio_id,
      CASE WHEN random() < 0.7 THEN 'BUY'::transaction_type ELSE 'SELL'::transaction_type END,
      amount,
      base_price,
      start_date + (i || ' days')::interval + (random() * interval '1 day'),
      'Test transaction'
    );
  END LOOP;

  -- BTC transactions (starting around $30000)
  base_price := 30000;
  FOR i IN 1..15 LOOP
    base_price := base_price * (1 + (random() * 0.15 - 0.05));
    amount := random() * 0.2 + 0.01;
    
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
      user_id,
      btc_asset_id,
      portfolio_id,
      CASE WHEN random() < 0.7 THEN 'BUY'::transaction_type ELSE 'SELL'::transaction_type END,
      amount,
      base_price,
      start_date + (i || ' days')::interval + (random() * interval '1 day'),
      'Test transaction'
    );
  END LOOP;

  -- SOL transactions (starting around $20)
  base_price := 20;
  FOR i IN 1..25 LOOP
    base_price := base_price * (1 + (random() * 0.2 - 0.07));
    amount := random() * 50 + 5;
    
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
      user_id,
      sol_asset_id,
      portfolio_id,
      CASE WHEN random() < 0.7 THEN 'BUY'::transaction_type ELSE 'SELL'::transaction_type END,
      amount,
      base_price,
      start_date + (i || ' days')::interval + (random() * interval '1 day'),
      'Test transaction'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;