import React, { useState } from 'react';
import { DollarSign, PieChart, Activity, User, List, Plus, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import './App.css';

import Dashboard from './components/Dashboard';
import Portfolios from './components/Portfolios';
import Assets from './components/Assets';
import Transactions from './components/Transactions';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check for existing session
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return !isLoggedIn ? (
    <Login />
  ) : (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <h1 className="ml-2 text-xl font-bold text-gray-800">Crypto Tracker</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <User className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="bg-white w-64 shadow-sm hidden md:block">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center p-2 rounded-md ${
                    activeTab === 'dashboard' ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <PieChart className="h-5 w-5 mr-3" />
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('portfolios')}
                  className={`w-full flex items-center p-2 rounded-md ${
                    activeTab === 'portfolios' ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <List className="h-5 w-5 mr-3" />
                  Portfolios
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('assets')}
                  className={`w-full flex items-center p-2 rounded-md ${
                    activeTab === 'assets' ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <DollarSign className="h-5 w-5 mr-3" />
                  Assets
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`w-full flex items-center p-2 rounded-md ${
                    activeTab === 'transactions' ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Activity className="h-5 w-5 mr-3" />
                  Transactions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`w-full flex items-center p-2 rounded-md ${
                    activeTab === 'analytics' ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Activity className="h-5 w-5 mr-3" />
                  Analytics
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center p-2 rounded-md ${
                    activeTab === 'settings' ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <SettingsIcon className="h-5 w-5 mr-3" />
                  Settings
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 md:hidden z-10">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-2 rounded-md ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <PieChart className="h-6 w-6" />
          </button>
          <button
            onClick={() => setActiveTab('portfolios')}
            className={`p-2 rounded-md ${activeTab === 'portfolios' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <List className="h-6 w-6" />
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`p-2 rounded-md ${activeTab === 'assets' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <DollarSign className="h-6 w-6" />
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`p-2 rounded-md ${activeTab === 'transactions' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <Activity className="h-6 w-6" />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-md ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <SettingsIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'portfolios' && <Portfolios />}
          {activeTab === 'assets' && <Assets />}
          {activeTab === 'transactions' && <Transactions />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* Add Button (Mobile) */}
      <button className="md:hidden fixed right-4 bottom-20 bg-blue-600 text-white p-4 rounded-full shadow-lg">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

export default App;