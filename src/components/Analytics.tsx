import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateTestData } from '../lib/generateTestData';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  totalValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
  monthlyReturn: number;
  monthlyReturnPercentage: number;
  bestPerforming: {
    symbol: string;
    return: number;
  };
  historicalData: {
    labels: string[];
    values: number[];
  };
}

const defaultAnalytics: AnalyticsData = {
  totalValue: 0,
  totalReturn: 0,
  totalReturnPercentage: 0,
  monthlyReturn: 0,
  monthlyReturnPercentage: 0,
  bestPerforming: {
    symbol: '',
    return: 0
  },
  historicalData: {
    labels: [],
    values: []
  }
};

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>(defaultAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1M');
  const [isGeneratingData, setIsGeneratingData] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const calculateAssetValue = async (asset: any, transactions: any[]) => {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${asset.token_address}`
      );
      const data = await response.json();
      const pair = data.pairs?.[0];

      if (pair) {
        const currentPrice = parseFloat(pair.priceUsd);
        const assetTransactions = transactions.filter(tx => tx.asset_id === asset.id);
        const amount = assetTransactions.reduce((sum, tx) => 
          sum + (tx.type === 'BUY' ? tx.amount : -tx.amount), 0
        );
        return currentPrice * amount;
      }
      return 0;
    } catch (err) {
      console.error(`Error calculating value for asset ${asset.symbol}:`, err);
      return 0;
    }
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }
    
    try {
      // Calculate date ranges
      const now = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '1M':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6M':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '1Y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'ALL':
          startDate.setFullYear(2020); // Or some reasonable start date
          break;
      }

      // Get current user's assets
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .neq('notes', 'Test transaction');

      if (!assets || assets.length === 0) {
        setAnalytics(defaultAnalytics);
        setIsLoading(false);
        return;
      }

      // Fetch transactions within the time range
      const { data: transactions } = await supabase
        .from('transactions')
        .eq('user_id', user.id)
        .neq('notes', 'Test transaction')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (!transactions || transactions.length === 0) {
        setAnalytics(defaultAnalytics);
        setIsLoading(false);
        return;
      }

      // Calculate historical data points
      const dailyValues = new Map<string, number>();
      let runningTotal = 0;
      let initialValue = 0;
      let monthStartValue = 0;

      // Process transactions chronologically
      transactions.forEach((tx, index) => {
        const date = new Date(tx.timestamp).toLocaleDateString();
        if (index === 0) initialValue = runningTotal;
        if (timeRange === '1M' && index === 0) monthStartValue = runningTotal;

        runningTotal += tx.type === 'BUY' ? 
          tx.amount * tx.price : 
          -tx.amount * tx.price;
        dailyValues.set(date, runningTotal);
      });

      // Calculate current total value
      const assetValues = await Promise.all(
        assets.map(asset => calculateAssetValue(asset, transactions))
      );
      const totalValue = assetValues.reduce((sum, value) => sum + value, 0);

      // Calculate returns
      const totalReturn = totalValue - initialValue;
      const totalReturnPercentage = initialValue !== 0 ? 
        (totalReturn / initialValue) * 100 : 0;
      const monthlyReturn = runningTotal - monthStartValue;
      const monthlyReturnPercentage = monthStartValue !== 0 ? 
        (monthlyReturn / monthStartValue) * 100 : 0;

      // Find best performing asset
      let bestPerforming = { symbol: '', return: 0 };
      for (const asset of assets) {
        const assetTransactions = transactions.filter(tx => tx.asset_id === asset.id);
        if (assetTransactions.length === 0) continue;

        const assetReturn = assetTransactions.reduce((sum, tx) => 
          sum + (tx.type === 'BUY' ? -tx.amount * tx.price : tx.amount * tx.price), 0
        );

        if (assetReturn > bestPerforming.return) {
          bestPerforming = {
            symbol: asset.symbol,
            return: assetReturn
          };
        }
      }

      setAnalytics({
        totalValue: runningTotal,
        totalReturn,
        totalReturnPercentage,
        monthlyReturn,
        monthlyReturnPercentage,
        bestPerforming,
        historicalData: {
          labels: Array.from(dailyValues.keys()),
          values: Array.from(dailyValues.values())
        }
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `$${context.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: (value: number) => `$${value.toLocaleString()}`
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const handleGenerateTestData = async () => {
    setIsGeneratingData(true);
    setError(null);

    try {
      await generateTestData();
      await fetchAnalytics();
    } catch (err) {
      console.error('Error generating test data:', err);
      setError(
        err instanceof Error 
          ? `Failed to generate test data: ${err.message}`
          : 'Failed to generate test data'
      );
    } finally {
      setIsGeneratingData(false);
    }
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
        <button
          onClick={handleGenerateTestData}
          disabled={isGeneratingData}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isGeneratingData ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5 mr-2" />
              Generate Test Data
            </>
          )}
        </button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {error}
        </div>
      ) : (
        <>
          {/* Time Range Selector */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex space-x-2">
              {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-md ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Portfolio Performance</h2>
            <div className="h-[400px]">
              <Line
                data={{
                  labels: analytics.historicalData.labels,
                  datasets: [{
                    data: analytics.historicalData.values,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                  }]
                }}
                options={chartOptions}
              />
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Total Return</h3>
                {analytics.totalReturnPercentage >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="space-y-2">
                <p className={`text-3xl font-bold ${
                  analytics.totalReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.totalReturnPercentage >= 0 ? '+' : ''}
                  {analytics.totalReturnPercentage.toFixed(2)}%
                </p>
                <p className="text-lg text-gray-600">
                  ${Math.abs(analytics.totalReturn).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Monthly Return</h3>
                {analytics.monthlyReturnPercentage >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="space-y-2">
                <p className={`text-3xl font-bold ${
                  analytics.monthlyReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.monthlyReturnPercentage >= 0 ? '+' : ''}
                  {analytics.monthlyReturnPercentage.toFixed(2)}%
                </p>
                <p className="text-lg text-gray-600">
                  ${Math.abs(analytics.monthlyReturn).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Best Performing</h3>
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-gray-800">
                  {analytics.bestPerforming.symbol}
                </p>
                <p className="text-lg text-green-600">
                  +${analytics.bestPerforming.return.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;