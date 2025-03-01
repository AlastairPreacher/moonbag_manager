import { supabase } from './supabase';

export async function generateTestData() {
  const generatePortfolioName = async (userId: string, baseName = 'Test Portfolio') => {
    let name = baseName;
    let counter = 1;
    while (true) {
      const { data } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .single();
      
      if (!data) return name;
      name = `${baseName} ${counter}`;
      counter++;
    }
  };

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    // Delete existing test transactions
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
      .eq('notes', 'Test transaction');

    // Create a test portfolio
    const portfolioName = await generatePortfolioName(user.id);
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        name: portfolioName,
        is_default: true
      })
      .select()
      .single();

    if (portfolioError) throw portfolioError;

    // Create test assets
    const assets = [
      { 
        symbol: 'ETH', 
        name: 'Ethereum', 
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 
        price: 3000,
        chain_id: 1
      },
      { 
        symbol: 'BTC', 
        name: 'Bitcoin', 
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 
        price: 45000,
        chain_id: 1
      },
      { 
        symbol: 'MATIC', 
        name: 'Polygon', 
        address: '0x0000000000000000000000000000000000001010', 
        price: 1.5,
        chain_id: 137
      }
    ];

    const createdAssets = [];
    for (const asset of assets) {
      // Check if asset exists
      let { data: existingAsset } = await supabase
        .from('assets')
        .select('*')
        .eq('token_address', asset.address)
        .eq('chain_id', asset.chain_id)
        .single();

      if (!existingAsset) {
        const { data: newAsset, error: assetError } = await supabase
          .from('assets')
          .insert({
            user_id: user.id,
            token_address: asset.address,
            chain_id: asset.chain_id,
            symbol: asset.symbol,
            name: asset.name,
            decimals: 18
          })
          .select()
          .single();

        if (assetError) throw assetError;
        existingAsset = newAsset;
      } else if (existingAsset.user_id !== user.id) {
        // Update asset to be owned by current user
        const { error: updateError } = await supabase
          .from('assets')
          .update({ user_id: user.id })
          .eq('id', existingAsset.id);

        if (updateError) throw updateError;
      }

      createdAssets.push({
        ...existingAsset,
        price: asset.price
      });
    }
    // Generate transactions over the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      for (const asset of createdAssets) {
        // Random transaction type (70% buy, 30% sell)
        const type = Math.random() < 0.7 ? 'BUY' : 'SELL';
        
        // Random amount between 0.1 and 2 for the transaction
        const amount = 0.1 + Math.random() * 1.9;
        
        // Price varies by ±5% from base price
        const priceVariation = asset.price * (0.95 + Math.random() * 0.1);
        
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            asset_id: asset.id,
            portfolio_id: portfolio.id,
            type,
            amount,
            price: priceVariation,
            timestamp: date.toISOString(),
            notes: 'Test transaction'
          });

        if (txError) throw txError;
      }
    }

    return true;
  } catch (err) {
    console.error('Error generating test data:', err);
    throw err;
  }
}