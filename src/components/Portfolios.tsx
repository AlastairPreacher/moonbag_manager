import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Portfolio {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

const Portfolios: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [editingPortfolio, setEditingPortfolio] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: portfoliosData, error } = await supabase
        .from('portfolios') 
        .select('*')
        .eq('user_id', user.id)
        .not('name', 'like', 'Test Portfolio%')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPortfolios(portfoliosData || []);
    } catch (err) {
      console.error('Error fetching portfolios:', err);
      setError('Failed to load portfolios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPortfolio = () => {
    if (newPortfolioName.trim() === '') return;
    
    handleCreatePortfolio();
  };

  const handleCreatePortfolio = async () => {
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

      setPortfolios([...portfolios, newPortfolio]);
      setNewPortfolioName('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError('Failed to create portfolio');
    }
  };

  const handleEditPortfolio = (id: string) => {
    const portfolio = portfolios.find(p => p.id === id);
    if (portfolio) {
      setEditingPortfolio(id);
      setEditName(portfolio.name);
    }
  };

  const saveEditPortfolio = () => {
    if (editName.trim() === '' || !editingPortfolio) return;
    
    setPortfolios(portfolios.map(portfolio => 
      portfolio.id === editingPortfolio 
        ? { ...portfolio, name: editName } 
        : portfolio
    ));
    
    setEditingPortfolio(null);
    setEditName('');
  };

  const handleDeletePortfolio = async (id: string) => {
    // Don't allow deleting the last portfolio
    if (portfolios.length <= 1) return;
    
    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const updatedPortfolios = portfolios.filter(p => p.id !== id);
      setPortfolios(updatedPortfolios);

      // If we deleted the default portfolio, make another one default
      const wasDefault = portfolios.find(p => p.id === id)?.is_default;
      if (wasDefault && updatedPortfolios.length > 0) {
        const { error: updateError } = await supabase
          .from('portfolios')
          .update({ is_default: true })
          .eq('id', updatedPortfolios[0].id);

        if (updateError) throw updateError;
        
        setPortfolios(updatedPortfolios.map((p, index) => 
          index === 0 ? { ...p, is_default: true } : p
        ));
      }
    } catch (err) {
      console.error('Error deleting portfolio:', err);
      setError('Failed to delete portfolio');
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      // Update the database
      const { error } = await supabase
        .from('portfolios')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setPortfolios(portfolios.map(portfolio => ({
        ...portfolio,
        is_default: portfolio.id === id
      })));
    } catch (err) {
      console.error('Error setting default portfolio:', err);
      setError('Failed to set default portfolio');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Portfolios</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 flex items-center"
        >
          <Plus className="h-5 w-5 mr-1" />
          Add Portfolio
        </button>
      </div>
      
      {/* Portfolios List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : portfolios.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Portfolios Yet</h3>
            <p className="text-gray-500 mb-4">Create your first portfolio to start tracking your investments.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Portfolio
            </button>
          </div>
        ) : (
          portfolios.map((portfolio) => (
            <div key={portfolio.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  {editingPortfolio === portfolio.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1 text-lg font-medium"
                        autoFocus
                      />
                      <button 
                        onClick={saveEditPortfolio}
                        className="bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 transition duration-200"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <h2 className="text-lg font-medium text-gray-800">{portfolio.name}</h2>
                      {portfolio.is_default && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {!portfolio.is_default && (
                    <button 
                      onClick={() => setAsDefault(portfolio.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Set as default
                    </button>
                  )}
                  <button 
                    onClick={() => handleEditPortfolio(portfolio.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  {portfolios.length > 1 && (
                    <button 
                      onClick={() => handleDeletePortfolio(portfolio.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add Portfolio Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Portfolio</h2>
            
            <div className="mb-4">
              <label htmlFor="portfolioName" className="block text-sm font-medium text-gray-700 mb-1">
                Portfolio Name
              </label>
              <input
                type="text"
                id="portfolioName"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., DeFi Investments"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPortfolio}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolios;