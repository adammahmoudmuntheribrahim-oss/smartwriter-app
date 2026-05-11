import * as SecureStore from 'expo-secure-store';
import { useLogsStore } from '@/lib/stores/logs.store';

export interface SecureStoreOptions {
  keychainAccessible?: SecureStore.SecureStoreOptions['keychainAccessible'];
}

/**
 * Secure storage wrapper for sensitive data
 * Uses device keychain/keystore for encryption
 */
export class SecureStorageManager {
  private static instance: SecureStorageManager;

  private constructor() {}

  static getInstance(): SecureStorageManager {
    if (!SecureStorageManager.instance) {
      SecureStorageManager.instance = new SecureStorageManager();
    }
    return SecureStorageManager.instance;
  }

  /**
   * Store a sensitive value securely
   */
  async setItem(
    key: string,
    value: string,
    options?: SecureStoreOptions
  ): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, options);
      useLogsStore.getState().addLog({
        level: 'debug',
        message: `Secure value stored: ${key}`,
        context: 'SecureStore',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: `Failed to store secure value: ${key}`,
        context: 'SecureStore',
        data: { error: errorMessage },
      });
      throw new Error(`Failed to store secure value: ${errorMessage}`);
    }
  }

  /**
   * Retrieve a sensitive value securely
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value) {
        useLogsStore.getState().addLog({
          level: 'debug',
          message: `Secure value retrieved: ${key}`,
          context: 'SecureStore',
        });
      }
      return value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: `Failed to retrieve secure value: ${key}`,
        context: 'SecureStore',
        data: { error: errorMessage },
      });
      return null;
    }
  }

  /**
   * Delete a sensitive value
   */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      useLogsStore.getState().addLog({
        level: 'debug',
        message: `Secure value deleted: ${key}`,
        context: 'SecureStore',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: `Failed to delete secure value: ${key}`,
        context: 'SecureStore',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Store a JSON object securely
   */
  async setJSON<T extends Record<string, any>>(
    key: string,
    value: T,
    options?: SecureStoreOptions
  ): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.setItem(key, jsonString, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: `Failed to store secure JSON: ${key}`,
        context: 'SecureStore',
        data: { error: errorMessage },
      });
      throw new Error(`Failed to store secure JSON: ${errorMessage}`);
    }
  }

  /**
   * Retrieve a JSON object securely
   */
  async getJSON<T extends Record<string, any>>(key: string): Promise<T | null> {
    try {
      const jsonString = await this.getItem(key);
      if (jsonString) {
        return JSON.parse(jsonString) as T;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: `Failed to retrieve secure JSON: ${key}`,
        context: 'SecureStore',
        data: { error: errorMessage },
      });
      return null;
    }
  }

  /**
   * Check if a key exists
   */
  async hasItem(key: string): Promise<boolean> {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clear all secure storage (use with caution)
   */
  async clear(): Promise<void> {
    try {
      // Note: SecureStore doesn't have a clear all method
      // You need to manually delete keys you know about
      useLogsStore.getState().addLog({
        level: 'warning',
        message: 'SecureStore clear requested (manual key deletion needed)',
        context: 'SecureStore',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to clear secure storage',
        context: 'SecureStore',
        data: { error: errorMessage },
      });
    }
  }
}

export const secureStorage = SecureStorageManager.getInstance();
