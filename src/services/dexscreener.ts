const DEXSCREENER_API_BASE = 'https://api.dexscreener.com/latest';

// Chain ID mapping
export const CHAIN_IDS: { [key: string]: number } = {
  // EVM chains
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  avalanche: 43114,
  fantom: 250,
  cronos: 25,
  base: 8453,
  
  // Non-EVM chains
  solana: 999999,
  osmosis: 999998,
  pulsechain: 999997,
  bitcoin: 999996,
  cosmos: 999995,
  terra: 999994,
  sui: 999993,
  aptos: 999992,
  near: 999991,
  tron: 999990
};

// Helper function to check if a chain is supported
export function isChainSupported(chainId: string): boolean {
  return chainId.toLowerCase() in CHAIN_IDS;
}
export interface TokenSearchResult {
  pairs: {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
      address: string;
      name: string;
      symbol: string;
    };
    quoteToken: {
      address: string;
      name: string;
      symbol: string;
    };
    priceUsd?: string;
    priceChange: {
      h24: number;
      h6: number;
      h1: number;
      m5: number;
    };
    liquidity: {
      usd: number;
    };
    volume: {
      h24: number;
    };
  }[];
}

export async function searchTokens(query: string): Promise<TokenSearchResult> {
  console.log('Fetching from:', `${DEXSCREENER_API_BASE}/dex/search/?q=${encodeURIComponent(query)}`);
  const response = await fetch(`${DEXSCREENER_API_BASE}/dex/search/?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(`Failed to fetch token data: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('API Response:', data);
  return data;
}