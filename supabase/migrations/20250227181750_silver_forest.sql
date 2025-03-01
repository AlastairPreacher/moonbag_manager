/*
  # Add test data generation function
  
  This migration adds a function to generate test data for the crypto portfolio tracker.
  The function creates realistic historical transaction data with:
    - Multiple assets (ETH, BTC, etc.)
    - Transactions spread across time
    - Realistic price movements
    - Both buy and sell transactions
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
  RETURNING id INTO portfolio_id;

  -- Create test assets
  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES 
    (user_id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 1, 'ETH', 'Ethereum', 18)
    RETURNING id INTO eth_asset_id;

  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES 
    (user_id, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 1, 'BTC', 'Bitcoin', 8)
    RETURNING id INTO btc_asset_id;

  INSERT INTO assets (user_id, token_address, chain_id, symbol, name, decimals)
  VALUES 
    (user_id, 'So11111111111111111111111111111111111111112', 999999, 'SOL', 'Solana', 9)
    RETURNING id INTO sol_asset_id;

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