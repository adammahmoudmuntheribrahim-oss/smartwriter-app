import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug' | 'success';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, any>;
  stackTrace?: string;
}

export interface LogsState {
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;
  maxLogs: number;

  // Methods
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  getLogsByLevel: (level: LogLevel) => LogEntry[];
  getLogsByContext: (context: string) => LogEntry[];
  getRecentLogs: (count?: number) => LogEntry[];
  getLogsByTimeRange: (startTime: number, endTime: number) => LogEntry[];
  clearLogs: () => void;
  deleteLog: (id: string) => void;
  exportLogs: () => string;
  searchLogs: (query: string) => LogEntry[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getLogStats: () => {
    total: number;
    info: number;
    warning: number;
    error: number;
    debug: number;
    success: number;
  };
}

const generateId = () => `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useLogsStore = create<LogsState>()(
  persist(
    (set, get) => ({
      logs: [],
      isLoading: false,
      error: null,
      maxLogs: 1000,

      addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
        const newLog: LogEntry = {
          ...log,
          id: generateId(),
          timestamp: Date.now(),
        };

        set((state) => {
          const updatedLogs = [newLog, ...state.logs];
          // Keep only the most recent maxLogs entries
          if (updatedLogs.length > state.maxLogs) {
            updatedLogs.pop();
          }
          return { logs: updatedLogs };
        });
      },

      getLogsByLevel: (level: LogLevel) => {
        return get().logs.filter((log) => log.level === level);
      },

      getLogsByContext: (context: string) => {
        return get().logs.filter((log) => log.context === context);
      },

      getRecentLogs: (count: number = 50) => {
        return get().logs.slice(0, count);
      },

      getLogsByTimeRange: (startTime: number, endTime: number) => {
        return get().logs.filter(
          (log) => log.timestamp >= startTime && log.timestamp <= endTime
        );
      },

      clearLogs: () => {
        set({ logs: [] });
      },

      deleteLog: (id: string) => {
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        }));
      },

      exportLogs: () => {
        const logs = get().logs;
        const csvHeader = 'Timestamp,Level,Context,Message\n';
        const csvRows = logs
          .map(
            (log) =>
              `"${new Date(log.timestamp).toISOString()}","${log.level}","${log.context || ''}","${log.message}"`
          )
          .join('\n');

        return csvHeader + csvRows;
      },

      searchLogs: (query: string) => {
        const lowerQuery = query.toLowerCase();
        return get().logs.filter(
          (log) =>
            log.message.toLowerCase().includes(lowerQuery) ||
            log.context?.toLowerCase().includes(lowerQuery) ||
            JSON.stringify(log.data).toLowerCase().includes(lowerQuery)
        );
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      getLogStats: () => {
        const logs = get().logs;
        return {
          total: logs.length,
          info: logs.filter((l) => l.level === 'info').length,
          warning: logs.filter((l) => l.level === 'warning').length,
          error: logs.filter((l) => l.level === 'error').length,
          debug: logs.filter((l) => l.level === 'debug').length,
          success: logs.filter((l) => l.level === 'success').length,
        };
      },
    }),
    {
      name: 'logs-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
