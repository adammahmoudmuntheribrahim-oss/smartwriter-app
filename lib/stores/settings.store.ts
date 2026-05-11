import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BloggerSettings {
  blogId: string;
  enableAutoPublish: boolean;
  publishAsDraft: boolean;
  retryFailedPosts: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

export interface AppSettings {
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  enableNotifications: boolean;
  enableAutoBackup: boolean;
  backupFrequencyHours: number;
  requestTimeoutMs: number;
  enableSSLOnly: boolean;
  enableNetworkDetection: boolean;
}

export interface SettingsState {
  blogger: BloggerSettings;
  app: AppSettings;
  isLoading: boolean;
  error: string | null;

  // Blogger settings methods
  updateBloggerSettings: (updates: Partial<BloggerSettings>) => void;
  getBloggerSettings: () => BloggerSettings;
  resetBloggerSettings: () => void;

  // App settings methods
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  getAppSettings: () => AppSettings;
  resetAppSettings: () => void;

  // General methods
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetAllSettings: () => void;
}

const DEFAULT_BLOGGER_SETTINGS: BloggerSettings = {
  blogId: '',
  enableAutoPublish: false,
  publishAsDraft: false,
  retryFailedPosts: true,
  maxRetries: 3,
  retryDelayMs: 5000,
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: 'en',
  theme: 'auto',
  enableNotifications: true,
  enableAutoBackup: true,
  backupFrequencyHours: 24,
  requestTimeoutMs: 30000,
  enableSSLOnly: true,
  enableNetworkDetection: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      blogger: DEFAULT_BLOGGER_SETTINGS,
      app: DEFAULT_APP_SETTINGS,
      isLoading: false,
      error: null,

      updateBloggerSettings: (updates: Partial<BloggerSettings>) => {
        set((state: SettingsState) => ({
          blogger: { ...state.blogger, ...updates },
        }));
      },

      getBloggerSettings: () => {
        return get().blogger;
      },

      resetBloggerSettings: () => {
        set({ blogger: DEFAULT_BLOGGER_SETTINGS });
      },

      updateAppSettings: (updates: Partial<AppSettings>) => {
        set((state: SettingsState) => ({
          app: { ...state.app, ...updates },
        }));
      },

      getAppSettings: () => {
        return get().app;
      },

      resetAppSettings: () => {
        set({ app: DEFAULT_APP_SETTINGS });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      resetAllSettings: () => {
        set({
          blogger: DEFAULT_BLOGGER_SETTINGS,
          app: DEFAULT_APP_SETTINGS,
          error: null,
        });
      },
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
