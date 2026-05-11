import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScheduleFrequency = 'immediate' | '30min' | '1hour' | '2hours' | '4hours' | 'custom';

export interface Schedule {
  id: string;
  postId: string;
  frequency: ScheduleFrequency;
  customInterval?: number; // in minutes
  timezone: string;
  nextPublishTime: number; // timestamp
  isActive: boolean;
  createdAt: number;
  lastPublishedAt?: number;
  failureCount: number;
  maxRetries: number;
}

export interface SchedulerState {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  // Methods
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  getSchedule: (id: string) => Schedule | undefined;
  getActiveSchedules: () => Schedule[];
  getSchedulesByPostId: (postId: string) => Schedule[];
  updateNextPublishTime: (id: string, nextTime: number) => void;
  incrementFailureCount: (id: string) => void;
  resetFailureCount: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSchedules: () => void;
  getUpcomingSchedules: (hoursAhead?: number) => Schedule[];
}

const generateId = () => `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const calculateNextPublishTime = (
  frequency: ScheduleFrequency,
  customInterval?: number,
  timezone?: string
): number => {
  const now = Date.now();
  const intervalMs: Record<ScheduleFrequency, number> = {
    immediate: 0,
    '30min': 30 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    '2hours': 2 * 60 * 60 * 1000,
    '4hours': 4 * 60 * 60 * 1000,
    custom: (customInterval || 60) * 60 * 1000,
  };

  return now + (intervalMs[frequency] || 0);
};

export const useSchedulerStore = create<SchedulerState>()(
  persist(
    (set, get) => ({
      schedules: [],
      isLoading: false,
      error: null,

      addSchedule: (schedule) => {
        const newSchedule: Schedule = {
          ...schedule,
          id: generateId(),
          createdAt: Date.now(),
          nextPublishTime: schedule.nextPublishTime || calculateNextPublishTime(
            schedule.frequency,
            schedule.customInterval,
            schedule.timezone
          ),
        };

        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));
      },

      updateSchedule: (id: string, updates: Partial<Schedule>) => {
        set((state) => ({
          schedules: state.schedules.map((schedule) =>
            schedule.id === id ? { ...schedule, ...updates } : schedule
          ),
        }));
      },

      deleteSchedule: (id: string) => {
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.id !== id),
        }));
      },

      getSchedule: (id: string) => {
        return get().schedules.find((schedule) => schedule.id === id);
      },

      getActiveSchedules: () => {
        return get().schedules.filter((schedule) => schedule.isActive);
      },

      getSchedulesByPostId: (postId: string) => {
        return get().schedules.filter((schedule) => schedule.postId === postId);
      },

      updateNextPublishTime: (id: string, nextTime: number) => {
        get().updateSchedule(id, { nextPublishTime: nextTime });
      },

      incrementFailureCount: (id: string) => {
        const schedule = get().getSchedule(id);
        if (schedule) {
          const newFailureCount = schedule.failureCount + 1;
          get().updateSchedule(id, {
            failureCount: newFailureCount,
            isActive: newFailureCount < schedule.maxRetries,
          });
        }
      },

      resetFailureCount: (id: string) => {
        get().updateSchedule(id, { failureCount: 0 });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearSchedules: () => {
        set({ schedules: [] });
      },

      getUpcomingSchedules: (hoursAhead: number = 24) => {
        const now = Date.now();
        const futureTime = now + hoursAhead * 60 * 60 * 1000;

        return get()
          .getActiveSchedules()
          .filter(
            (schedule) =>
              schedule.nextPublishTime >= now && schedule.nextPublishTime <= futureTime
          )
          .sort((a, b) => a.nextPublishTime - b.nextPublishTime);
      },
    }),
    {
      name: 'scheduler-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
