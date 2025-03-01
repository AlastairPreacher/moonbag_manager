import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

interface PortfolioValue {
  total: number;
  change24h: number;
  changePercent24h: number;
}

interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: string;
  assets: {
    symbol: string;
    name: string;
  };
}

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioValue, setPortfolioValue] = useState<PortfolioValue>({
    total: 0,
    change24h: 0,
    changePercent24h: 0
  });
  const [portfolioHistory, setPortfolioHistory] = useState<{
    labels: string[];
    values: number[];
  }>({ labels: [], values: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchTransactions(),
      calculatePortfolioValue(),
      fetchPortfolioHistory()
    ]).finally(() => setIsLoading(false));
  }, []);

  const calculatePortfolioValue = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assets } = await supabase
        .from('assets') 
        .select('*')
        .eq('user_id', user.id);

      if (!assets) return;

      let total = 0;
      let previous24h = 0;

      for (const asset of assets) {
        try {
          const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${asset.token_address}`
          );
          const data = await response.json();
          const pair = data.pairs?.[0];

          if (pair) {
            const currentPrice = parseFloat(pair.priceUsd);
            const price24hAgo = currentPrice / (1 + pair.priceChange.h24 / 100);

            // Get asset amount from transactions
            const { data: assetTransactions } = await supabase
              .from('transactions')
              .select('type, amount')
              .neq('notes', 'Test transaction')
              .eq('asset_id', asset.id);

            const amount = (assetTransactions || []).reduce((sum, tx) => 
              sum + (tx.type === 'BUY' ? tx.amount : -tx.amount), 0
            );

            total += currentPrice * amount;
            previous24h += price24hAgo * amount;
          }
        } catch (err) {
          console.error(`Error fetching price for asset ${asset.symbol}:`, err);
        }
      }

      const change24h = total - previous24h;
      const changePercent24h = (change24h / previous24h) * 100;

      setPortfolioValue({
        total,
        change24h,
        changePercent24h
      });
    } catch (err) {
      console.error('Error calculating portfolio value:', err);
    }
  };

  const fetchPortfolioHistory = async () => {
    // For now, we'll use the last 7 days of transactions to simulate history
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data: historicalTransactions } = await supabase
        .from('transactions')
        .eq('user_id', user.id)
        .neq('notes', 'Test transaction')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (!historicalTransactions) return;

      const dailyValues = new Map<string, number>();
      let runningTotal = 0;

      historicalTransactions.forEach(tx => {
        const date = new Date(tx.timestamp).toLocaleDateString();
        runningTotal += tx.type === 'BUY' ? 
          tx.amount * tx.price : 
          -tx.amount * tx.price;
        dailyValues.set(date, runningTotal);
      });

      setPortfolioHistory({
        labels: Array.from(dailyValues.keys()),
        values: Array.from(dailyValues.values())
      });
    } catch (err) {
      console.error('Error fetching portfolio history:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('transactions') 
        .select('*, assets(symbol, name)')
        .eq('user_id', user.id)
        .neq('notes', 'Test transaction')
        .order('timestamp', { ascending: false })
        .limit(5);

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load recent transactions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      
      {/* Portfolio Value Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Portfolio Value</p>
                <p className="text-2xl font-bold text-gray-800">
                  ${portfolioValue.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">24h Change</p>
                <p className={`text-2xl font-bold ${portfolioValue.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(portfolioValue.change24h).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              {portfolioValue.change24h >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">24h %</p>
                <p className={`text-2xl font-bold ${portfolioValue.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioValue.changePercent24h >= 0 ? '+' : ''}
                  {portfolioValue.changePercent24h.toFixed(2)}%
                </p>
              </div>
              {portfolioValue.changePercent24h >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Chart */}
      {!isLoading && !error && portfolioHistory.labels.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Portfolio History</h2>
          <div className="h-64">
            <Line
              data={{
                labels: portfolioHistory.labels,
                datasets: [{
                  label: 'Portfolio Value',
                  data: portfolioHistory.values,
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => `$${context.raw?.toLocaleString()}`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    ticks: {
                      callback: (value) => `$${value.toLocaleString()}`
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {error}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Your Dashboard</h3>
          <p className="text-gray-500 mb-4">Start by adding your first transaction to begin tracking your portfolio.</p>
          <button
            onClick={() => window.location.href = '#/transactions'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add First Transaction
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.assets.symbol}</td>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;