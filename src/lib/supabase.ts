import { createClient } from '@supabase/supabase-js';
import type { Profile, Portfolio, Asset, PortfolioAsset, Transaction } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<{
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      portfolios: {
        Row: Portfolio;
        Insert: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Portfolio, 'id' | 'user_id'>>;
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Asset, 'id'>>;
      };
      portfolio_assets: {
        Row: PortfolioAsset;
        Insert: PortfolioAsset;
        Update: PortfolioAsset;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'user_id'>>;
      };
    };
  };
}>(supabaseUrl, supabaseAnonKey);

// Add error logging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'User authenticated' : 'No session');
}
)