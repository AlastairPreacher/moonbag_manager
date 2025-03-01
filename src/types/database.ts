export type Profile = {
  id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: string;
  user_id: string;
  token_address: string;
  chain_id: number;
  symbol: string;
  name: string;
  decimals: number;
  created_at: string;
  updated_at: string;
};

export type PortfolioAsset = {
  portfolio_id: string;
  asset_id: string;
};

export type TransactionType = 'BUY' | 'SELL';

export type Transaction = {
  id: string;
  user_id: string;
  asset_id: string;
  portfolio_id: string;
  type: TransactionType;
  amount: number;
  price: number;
  timestamp: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};