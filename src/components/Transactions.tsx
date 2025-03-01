import React, { useState, useEffect } from 'react';
import { Activity, Plus } from 'lucide-react';
import AddTransactionModal from './AddTransactionModal';
import { supabase } from '../lib/supabase';

interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: string;
  notes?: string;
  assets: {
    symbol: string;
    name: string;
  };
  portfolios: {
    name: string;
  };
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTransactions([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*, assets(symbol, name), portfolios(name)')
        .eq('user_id', user.id)
        .neq('notes', 'Test transaction')
        .order('timestamp', { ascending: false });

      if (fetchError) throw fetchError;
      console.log('Fetched transactions:', data);
      
      const transformedData = (data || []).map(transaction => {
        if (!transaction.assets) {
          console.warn('Transaction missing asset data:', transaction);
          return null;
        }
        return {
          ...transaction,
          assets: transaction.assets
        };
      }).filter(Boolean);
      
      setTransactions(transformedData);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(`Failed to load transactions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleTransactionAdded = () => {
    fetchTransactions();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Transaction
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found. Add your first transaction to get started.
            </div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.type === 'BUY' ? 'bg-green-100 text-green-800' : 
                      transaction.type === 'SELL' ? 'bg-red-100 text-red-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.assets.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.portfolios.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(transaction.amount * transaction.price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
      
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onTransactionAdded={handleTransactionAdded}
        />
      )}
    </div>
  );
};

export default Transactions;