// lib/api/auth.ts
import axios from 'axios';
import { BrowserProvider } from 'ethers';

const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_URL || 'https://api.parabuild.xyz/';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await authApi.refreshToken(refreshToken);
          
          // Update tokens
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${response.access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('wallet_address');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API methods
export const authApi = {
  /**
   * Step 1: Get nonce for wallet address
   * Creates user if doesn't exist
   */
  getNonce: async (walletAddress: string): Promise<{ nonce: string }> => {
    const response = await apiClient.post('/auth/nonce', {
      wallet_address: walletAddress.toLowerCase(),
    });
    return response.data;
  },

  /**
   * Step 2: Sign message with wallet
   * This happens in the browser using ethers.js
   */
  signMessage: async (nonce: string, provider: BrowserProvider): Promise<string> => {
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(nonce);
    return signature;
  },

  /**
   * Step 3: Verify signature and get JWT tokens
   */
  verifySignature: async (
    walletAddress: string,
    signature: string
  ): Promise<{
    status: string;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    wallet: string;
  }> => {
    const response = await apiClient.post('/auth/verify', {
      wallet_address: walletAddress.toLowerCase(),
      signature,
    });
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (
    refreshToken: string
  ): Promise<{
    status: string;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> => {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Complete authentication flow
   * 1. Get nonce
   * 2. Sign message
   * 3. Verify signature
   * 4. Store tokens
   */
  authenticate: async (
    walletAddress: string,
    provider: BrowserProvider
  ): Promise<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
    wallet: string;
  }> => {
    try {
      // Step 1: Get nonce
      const { nonce } = await authApi.getNonce(walletAddress);

      // Step 2: Sign message
      const signature = await authApi.signMessage(nonce, provider);

      // Step 3: Verify signature
      const result = await authApi.verifySignature(walletAddress, signature);

      // Step 4: Store tokens
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('refresh_token', result.refresh_token);
      localStorage.setItem('wallet_address', result.wallet);

      return {
        success: true,
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        wallet: result.wallet,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  },

  /**
   * Logout - clear tokens
   */
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('wallet_address');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  /**
   * Get current access token
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem('access_token');
  },

  /**
   * Get current wallet address
   */
  getWalletAddress: (): string | null => {
    return localStorage.getItem('wallet_address');
  },
};

export { apiClient };
export default authApi;