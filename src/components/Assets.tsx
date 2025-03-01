import React, { useState, useEffect } from 'react';
import { Plus, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AddAssetModal from './AddAssetModal';
import type { Asset } from '../types/database';

interface AssetWithPrice extends Asset {
  price: number;
  change24h: number;
}

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<AssetWithPrice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: assetsData, error } = await supabase
        .from('assets') 
        .select('*')
        .eq('user_id', user.id)
        .neq('notes', 'Test transaction');

      if (error) throw error;

      // Fetch current prices from DexScreener
      const assetsWithPrices = await Promise.all(
        (assetsData || []).map(async (asset) => {
          try {
            const response = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${asset.token_address}`
            );
            const data = await response.json();
            const pair = data.pairs?.[0];

            return {
              ...asset,
              price: pair ? parseFloat(pair.priceUsd) : 0,
              change24h: pair ? pair.priceChange?.h24 || 0 : 0
            };
          } catch (err) {
            console.error(`Failed to fetch price for ${asset.symbol}:`, err);
            return {
              ...asset,
              price: 0,
              change24h: 0
            };
          }
        })
      );

      setAssets(assetsWithPrices);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = assets.reduce((sum, asset) => sum + (asset.price || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Assets</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Asset
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Portfolio Value */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-sm font-medium text-gray-500">Total Portfolio Value</h2>
        <p className="text-3xl font-bold text-gray-800">${totalValue.toLocaleString()}</p>
      </div>

      {/* Assets Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">24h Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{asset.symbol}</div>
                        <div className="text-sm text-gray-500">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm ${asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                      </span>
                      {asset.change24h >= 0 ? (
                        <ArrowUp className="ml-1 h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {showAddModal && (
        <AddAssetModal
          onClose={() => setShowAddModal(false)}
          onAssetAdded={fetchAssets}
        />
      )}
    </div>
  );
};

export default Assets;