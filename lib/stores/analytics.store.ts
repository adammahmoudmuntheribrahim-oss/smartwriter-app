import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsState {
  publishedPosts: number;
  failedPosts: number;
  scheduledPosts: number;
  successRate: number;
  totalArticlesGenerated: number;
  
  // Actions
  incrementPublished: () => void;
  incrementFailed: () => void;
  setScheduledCount: (count: number) => void;
  incrementGenerated: () => void;
  resetAnalytics: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      publishedPosts: 0,
      failedPosts: 0,
      scheduledPosts: 0,
      successRate: 0,
      totalArticlesGenerated: 0,

      incrementPublished: () => {
        const newPublished = get().publishedPosts + 1;
        const total = newPublished + get().failedPosts;
        set({ 
          publishedPosts: newPublished,
          successRate: total > 0 ? (newPublished / total) * 100 : 0
        });
      },

      incrementFailed: () => {
        const newFailed = get().failedPosts + 1;
        const total = get().publishedPosts + newFailed;
        set({ 
          failedPosts: newFailed,
          successRate: total > 0 ? (get().publishedPosts / total) * 100 : 0
        });
      },

      setScheduledCount: (count: number) => set({ scheduledPosts: count }),
      
      incrementGenerated: () => set((state) => ({ totalArticlesGenerated: state.totalArticlesGenerated + 1 })),

      resetAnalytics: () => set({
        publishedPosts: 0,
        failedPosts: 0,
        scheduledPosts: 0,
        successRate: 0,
        totalArticlesGenerated: 0
      }),
    }),
    {
      name: 'analytics-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
