import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchTokens, CHAIN_IDS, isChainSupported } from '../services/dexscreener';
import { supabase } from '../lib/supabase';
import type { TokenSearchResult } from '../services/dexscreener';

interface AddAssetModalProps {
  onClose: () => void;
  onAssetAdded: () => void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ onClose, onAssetAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TokenSearchResult['pairs']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    console.log('Searching for:', searchQuery);
    setIsLoading(true);
    setError(null);

    try {
      const data = await searchTokens(searchQuery);
      console.log('Search results:', data);
      setHasSearched(true);
      setSearchResults(data.pairs || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch token data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = async (pair: any) => {
    try {
      const { baseToken } = pair;
      const chainName = pair.chainId.toLowerCase();
      
      if (!isChainSupported(chainName)) {
        setError(`Unsupported chain: ${pair.chainId}`);
        return;
      }
      
      const chainId = CHAIN_IDS[chainName];

      
      // Check if asset already exists
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('token_address', baseToken.address)
        .eq('chain_id', chainId)
        .single();

      if (existingAsset) {
        setError('Asset already exists in your portfolio');
        return;
      }

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to add assets');
        return;
      }

      // Insert new asset
      const { error: insertError } = await supabase
        .from('assets')
        .insert({
          token_address: baseToken.address,
          chain_id: chainId,
          symbol: baseToken.symbol,
          name: baseToken.name,
          decimals: 18, // Default for most tokens
          user_id: user.id // Add the user_id to comply with RLS
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        if (insertError.code === '42501') {
          setError('Permission denied. Please check if you are logged in.');
        } else {
          setError(insertError.message || 'Failed to add asset');
        }
        return;
      }

      onAssetAdded();
      onClose();
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Add New Asset</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a token (e.g., ETH, BTC, or contract address)"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96">
            {!hasSearched && (
              <p className="text-center text-gray-500 py-4">
                Search for a token to get started
              </p>
            )}
            {hasSearched && searchResults.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No results found. Try a different search term.
              </p>
            )}
            {searchResults.map((pair) => (
              <div
                key={`${pair.chainId}-${pair.pairAddress}`}
                className="border-b border-gray-200 last:border-0 py-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">
                      {pair.baseToken.name} ({pair.baseToken.symbol})
                    </h3>
                    <p className="text-sm text-gray-500">
                      Chain: {pair.chainId.charAt(0).toUpperCase() + pair.chainId.slice(1)} • DEX: {pair.dexId}
                    </p>
                    <p className="text-xs text-gray-400 break-all">
                      Address: {pair.baseToken.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-800">
                      ${parseFloat(pair.priceUsd || '0').toFixed(4)}
                    </p>
                    <p className={`text-sm ${(pair.priceChange?.h24 || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(pair.priceChange?.h24 || 0) >= 0 ? '+' : ''}{(pair.priceChange?.h24 || 0).toFixed(2)}% (24h)
                    </p>
                    <button
                      onClick={() => handleAddAsset(pair)}
                      className="mt-2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                      Add Asset
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddAssetModal;