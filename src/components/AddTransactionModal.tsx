import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Plus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { searchTokens } from '../services/dexscreener';
import type { Asset, Portfolio } from '../types/database';

interface AddTransactionModalProps {
  onClose: () => void;
  onTransactionAdded: () => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, onTransactionAdded }) => {
  // State definitions
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [showNewPortfolioInput, setShowNewPortfolioInput] = useState(false);
  const [showAssetSearch, setShowAssetSearch] = useState(true);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [existingAssets, setExistingAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<Asset | null>(null);
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [usdValue, setUsdValue] = useState('');
  const [price, setPrice] = useState('');
  const [inputMode, setInputMode] = useState<'asset' | 'usd'>('asset');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceFetching, setIsPriceFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolios();
    fetchExistingAssets();
  }, []);

  const fetchExistingAssets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setExistingAssets(assets || []);
    } catch (err) {
      console.error('Error fetching existing assets:', err);
      setError('Failed to load existing assets');
    }
  };

  const fetchPortfolios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: portfoliosData, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPortfolios(portfoliosData || []);
      
      const defaultPortfolio = portfoliosData?.find(p => p.is_default);
      if (defaultPortfolio) {
        setSelectedPortfolio(defaultPortfolio.id);
      }
    } catch (err) {
      console.error('Error fetching portfolios:', err);
      setError('Failed to load portfolios');
    }
  };

  const handleAssetSearch = async () => {
    if (!assetSearchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const data = await searchTokens(assetSearchQuery);
      setSearchResults(data.pairs || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch token data');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      setError('Portfolio name is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newPortfolio, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id,
          name: newPortfolioName.trim(),
          is_default: portfolios.length === 0
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPortfolios();
      setSelectedPortfolio(newPortfolio.id);
      setShowNewPortfolioInput(false);
      setNewPortfolioName('');
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError('Failed to create portfolio');
    }
  };

  const fetchCurrentPrice = async (asset: Asset) => {
    setIsPriceFetching(true);
    try {
      const data = await searchTokens(asset.token_address);
      const pair = data.pairs?.[0];
      if (pair?.priceUsd) {
        setPrice(pair.priceUsd);
        if (inputMode === 'asset' && amount) {
          setUsdValue((parseFloat(amount) * parseFloat(pair.priceUsd)).toString());
        } else if (inputMode === 'usd' && usdValue) {
          setAmount((parseFloat(usdValue) / parseFloat(pair.priceUsd)).toString());
        }
      } else {
        throw new Error('Price not available');
      }
    } catch (err) {
      console.error('Error fetching price:', err);
      setError('Failed to fetch current price');
    } finally {
      setIsPriceFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAsset || !amount || !price) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      let finalPortfolioId = selectedPortfolio;
      if (!finalPortfolioId) {
        const { data: newPortfolio, error } = await supabase
          .from('portfolios')
          .insert({
            user_id: user.id,
            name: 'Default Portfolio',
            is_default: true
          })
          .select()
          .single();

        if (error) throw error;
        if (!newPortfolio) throw new Error('Failed to create default portfolio');
        
        finalPortfolioId = newPortfolio.id;
        await fetchPortfolios();
        setSelectedPortfolio(finalPortfolioId);
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          asset_id: selectedAsset,
          portfolio_id: finalPortfolioId,
          type,
          amount: parseFloat(amount),
          price: parseFloat(price),
          timestamp: new Date().toISOString(),
          notes: notes.trim() || null
        }]);

      if (transactionError) throw transactionError;

      onTransactionAdded();
      onClose();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Add Transaction</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset
            </label>
            <div className="flex space-x-2 mb-2">
              <button
                type="button"
                onClick={() => setShowAssetSearch(true)}
                className={`px-3 py-1 rounded-md ${
                  showAssetSearch 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Search New
              </button>
              <button
                type="button"
                onClick={() => setShowAssetSearch(false)}
                className={`px-3 py-1 rounded-md ${
                  !showAssetSearch 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Select Existing
              </button>
            </div>

            {/* Asset Search or Selection */}
            <div className="space-y-2">
              {showAssetSearch ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAssetSearch()}
                      placeholder="Search for a token (e.g., ETH, BTC)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAssetSearch}
                      className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </div>

                  {isSearching && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                    </div>
                  )}

                  {!isSearching && searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                      {searchResults.map((pair) => (
                        <button
                          key={`${pair.chainId}-${pair.baseToken.address}`}
                          type="button"
                          onClick={() => {
                            setSelectedAsset(pair.baseToken.address);
                            setSelectedAssetDetails({
                              id: pair.baseToken.address,
                              token_address: pair.baseToken.address,
                              chain_id: parseInt(pair.chainId),
                              symbol: pair.baseToken.symbol,
                              name: pair.baseToken.name,
                              decimals: 18,
                              user_id: '',
                              created_at: '',
                              updated_at: ''
                            });
                            setPrice(pair.priceUsd || '0');
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{pair.baseToken.symbol}</div>
                              <div className="text-sm text-gray-500">{pair.baseToken.name}</div>
                            </div>
                            <div className="text-right">
                              <div>${parseFloat(pair.priceUsd || '0').toFixed(4)}</div>
                              <div className={`text-sm ${(pair.priceChange?.h24 || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(pair.priceChange?.h24 || 0) >= 0 ? '+' : ''}{(pair.priceChange?.h24 || 0).toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={selectedAsset}
                  onChange={(e) => {
                    const asset = existingAssets.find(a => a.id === e.target.value);
                    if (asset) {
                      setSelectedAsset(asset.id);
                      setSelectedAssetDetails(asset);
                      fetchCurrentPrice(asset);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an asset</option>
                  {existingAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.symbol})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Portfolio Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio
            </label>
            <div className="space-y-2">
              {showNewPortfolioInput ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="Enter portfolio name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreatePortfolio}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPortfolioInput(false);
                      setNewPortfolioName('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <select
                    value={selectedPortfolio}
                    onChange={(e) => setSelectedPortfolio(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a portfolio</option>
                    {portfolios.map((portfolio) => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}{portfolio.is_default ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewPortfolioInput(true)}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="BUY"
                  checked={type === 'BUY'}
                  onChange={(e) => setType(e.target.value as 'BUY')}
                  className="mr-2"
                />
                Buy
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="SELL"
                  checked={type === 'SELL'}
                  onChange={(e) => setType(e.target.value as 'SELL')}
                  className="mr-2"
                />
                Sell
              </label>
            </div>
          </div>

          {/* Input Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="asset"
                  checked={inputMode === 'asset'}
                  onChange={(e) => setInputMode(e.target.value as 'asset')}
                  className="mr-2"
                />
                Asset Amount
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="usd"
                  checked={inputMode === 'usd'}
                  onChange={(e) => setInputMode(e.target.value as 'usd')}
                  className="mr-2"
                />
                USD Value
              </label>
            </div>
          </div>

          {/* Amount Input */}
          {inputMode === 'asset' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ({selectedAssetDetails?.symbol || 'tokens'})
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  setAmount(value);
                  if (price && value) {
                    setUsdValue((parseFloat(value) * parseFloat(price)).toString());
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                USD Value
              </label>
              <input
                type="number"
                step="any"
                value={usdValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setUsdValue(value);
                  if (price && value) {
                    setAmount((parseFloat(value) / parseFloat(price)).toString());
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>
          )}

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price per {selectedAssetDetails?.symbol || 'token'} (USD)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => {
                  const newPrice = e.target.value;
                  setPrice(newPrice);
                  if (inputMode === 'asset' && amount) {
                    setUsdValue((parseFloat(amount) * parseFloat(newPrice)).toString());
                  } else if (inputMode === 'usd' && usdValue) {
                    setAmount((parseFloat(usdValue) / parseFloat(newPrice)).toString());
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
              <button
                type="button"
                onClick={() => selectedAssetDetails && fetchCurrentPrice(selectedAssetDetails)}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50"
                disabled={!selectedAssetDetails || isPriceFetching}
              >
                <RefreshCw className={`h-5 w-5 ${isPriceFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Value Display */}
          {selectedAssetDetails && (
            <div className="text-sm text-gray-500">
              {inputMode === 'asset' ? (
                <p>≈ ${parseFloat(usdValue || '0').toLocaleString()} USD</p>
              ) : (
                <p>≈ {parseFloat(amount || '0').toLocaleString()} {selectedAssetDetails.symbol}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isLoading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;