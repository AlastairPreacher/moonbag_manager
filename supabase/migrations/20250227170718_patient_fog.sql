/*
  # Add assets and transactions tables

  1. New Tables
    - `assets`
      - `id` (uuid, primary key)
      - `token_address` (text, unique with chain_id)
      - `chain_id` (integer)
      - `symbol` (text)
      - `name` (text)
      - `decimals` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `portfolio_assets`
      - `portfolio_id` (uuid, references portfolios)
      - `asset_id` (uuid, references assets)
      - Composite primary key (portfolio_id, asset_id)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `asset_id` (uuid, references assets)
      - `portfolio_id` (uuid, references portfolios)
      - `type` (text, enum: BUY/SELL)
      - `amount` (numeric)
      - `price` (numeric)
      - `timestamp` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address text NOT NULL,
  chain_id integer NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  decimals integer NOT NULL DEFAULT 18,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(token_address, chain_id)
);

-- Create portfolio_assets table
CREATE TABLE IF NOT EXISTS portfolio_assets (
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (portfolio_id, asset_id)
);

-- Create transaction_type enum
CREATE TYPE transaction_type AS ENUM ('BUY', 'SELL');

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  price numeric NOT NULL CHECK (price >= 0),
  timestamp timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Assets policies
CREATE POLICY "Assets are viewable by everyone"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Portfolio assets policies
CREATE POLICY "Users can view own portfolio assets"
  ON portfolio_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE id = portfolio_assets.portfolio_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own portfolio assets"
  ON portfolio_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE id = portfolio_assets.portfolio_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE id = portfolio_assets.portfolio_id
      AND user_id = auth.uid()
    )
  );

-- Transactions policies
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

-- Add triggers for updated_at
CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();