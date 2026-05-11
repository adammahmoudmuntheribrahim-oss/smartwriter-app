import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface BloggerAccount {
  blogId: string;
  blogTitle: string;
  blogUrl: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthState {
  // Authentication
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Blogger account
  bloggerAccount: BloggerAccount | null;
  
  // Methods
  setBloggerAccount: (account: BloggerAccount | null) => void;
  setAccessToken: (token: string, expiresIn?: number) => Promise<void>;
  setRefreshToken: (token: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  validateConnection: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      bloggerAccount: null,

      setBloggerAccount: (account) => {
        set({ bloggerAccount: account, isAuthenticated: !!account });
      },

      setAccessToken: async (token, expiresIn) => {
        try {
          await SecureStore.setItemAsync('blogger_access_token', token);
          if (expiresIn) {
            const expiresAt = Date.now() + expiresIn * 1000;
            await SecureStore.setItemAsync('blogger_token_expires_at', expiresAt.toString());
            set((state) => ({
              bloggerAccount: state.bloggerAccount
                ? { ...state.bloggerAccount, expiresAt }
                : null,
            }));
          }
        } catch (error) {
          console.error('Failed to store access token:', error);
          set({ error: 'Failed to store access token securely' });
        }
      },

      setRefreshToken: async (token) => {
        try {
          await SecureStore.setItemAsync('blogger_refresh_token', token);
        } catch (error) {
          console.error('Failed to store refresh token:', error);
          set({ error: 'Failed to store refresh token securely' });
        }
      },

      getAccessToken: async () => {
        try {
          const token = await SecureStore.getItemAsync('blogger_access_token');
          const expiresAtStr = await SecureStore.getItemAsync('blogger_token_expires_at');
          
          if (token && expiresAtStr) {
            const expiresAt = parseInt(expiresAtStr, 10);
            if (expiresAt > Date.now()) {
              return token;
            }
            // Token expired
            await SecureStore.deleteItemAsync('blogger_access_token');
            await SecureStore.deleteItemAsync('blogger_token_expires_at');
          }
          return null;
        } catch (error) {
          console.error('Failed to retrieve access token:', error);
          return null;
        }
      },

      getRefreshToken: async () => {
        try {
          return await SecureStore.getItemAsync('blogger_refresh_token');
        } catch (error) {
          console.error('Failed to retrieve refresh token:', error);
          return null;
        }
      },

      clearAuth: async () => {
        try {
          await SecureStore.deleteItemAsync('blogger_access_token');
          await SecureStore.deleteItemAsync('blogger_refresh_token');
          await SecureStore.deleteItemAsync('blogger_token_expires_at');
          set({
            isAuthenticated: false,
            bloggerAccount: null,
            error: null,
          });
        } catch (error) {
          console.error('Failed to clear auth:', error);
          set({ error: 'Failed to clear authentication' });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      validateConnection: async () => {
        try {
          const token = await get().getAccessToken();
          const account = get().bloggerAccount;
          
          if (!token || !account?.blogId) {
            return false;
          }

          // TODO: Add actual API validation call to Blogger API
          return true;
        } catch (error) {
          console.error('Connection validation failed:', error);
          return false;
        }
      },

      logout: async () => {
        try {
          await get().clearAuth();
          set({
            isAuthenticated: false,
            bloggerAccount: null,
          });
        } catch (error) {
          console.error('Logout failed:', error);
          set({ error: 'Logout failed' });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bloggerAccount: state.bloggerAccount,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
