// Service to check business account balance via backend API
import apiService from './apiServiceClient';

/**
 * Get business account balance from backend
 * @returns {Promise<{balance: number, hasInsufficientFunds: boolean, minimumRequired: number, mode: string}>}
 */
export const getBusinessBalance = async () => {
  try {
    console.log('💰 Checking business account balance via backend...');
    
    // Call backend API to get balance
    const result = await apiService.getBalance();
    
    console.log('💰 Balance check results:', {
      balance: result.balance,
      minimumRequired: result.minimumRequired,
      hasInsufficientFunds: result.hasInsufficientFunds,
      mode: result.mode
    });
    
    return {
      balance: result.balance || 0,
      hasInsufficientFunds: result.hasInsufficientFunds || false,
      minimumRequired: result.minimumRequired || 4.0,
      mode: result.mode || 'production'  // Include mode from backend
    };
  } catch (error) {
    console.error('❌ Error checking business balance:', error);
    // Return safe defaults in case of error
    // Don't set hasInsufficientFunds to true on error - let it fail gracefully
    return {
      balance: 0,
      hasInsufficientFunds: false, // Don't block on error, let the order request fail instead
      minimumRequired: 4.0,
      mode: 'production'
    };
  }
};

