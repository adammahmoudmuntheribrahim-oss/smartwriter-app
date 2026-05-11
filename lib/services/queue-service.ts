import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePostsStore } from '@/lib/stores/posts.store';
import { bloggerService } from '@/lib/services/blogger-service';
import { useLogsStore } from '@/lib/stores/logs.store';
import { useSettingsStore } from '@/lib/stores/settings.store';
import NetInfo from '@react-native-community/netinfo';

export interface QueueItem {
  id: string;
  postId: string;
  action: 'publish' | 'update' | 'delete';
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  priority: 'low' | 'normal' | 'high';
}

export class QueueService {
  private static instance: QueueService;
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private readonly QUEUE_STORAGE_KEY = 'smartwriter_queue';
  private readonly BATCH_SIZE = 5;
  private networkListener: any = null;

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Initialize network listener for offline/online detection
   */
  private initializeNetworkListener(): void {
    this.networkListener = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        useLogsStore.getState().addLog({
          level: 'info',
          message: 'Network connection restored',
          context: 'QueueService',
        });
        // Process queue when connection is restored
        this.processQueue();
      } else {
        useLogsStore.getState().addLog({
          level: 'warning',
          message: 'Network connection lost',
          context: 'QueueService',
        });
      }
    });
  }

  /**
   * Load queue from storage
   */
  async loadQueue(): Promise<void> {
    try {
      const storedQueue = await AsyncStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
        useLogsStore.getState().addLog({
          level: 'info',
          message: `Queue loaded with ${this.queue.length} items`,
          context: 'QueueService',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to load queue from storage',
        context: 'QueueService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to save queue to storage',
        context: 'QueueService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Add item to queue
   */
  async addToQueue(
    postId: string,
    action: 'publish' | 'update' | 'delete',
    payload: Record<string, any>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    try {
      const queueItem: QueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        postId,
        action,
        payload,
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: useSettingsStore.getState().getBloggerSettings().maxRetries,
        priority,
      };

      // Sort by priority
      this.queue.push(queueItem);
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      await this.saveQueue();

      useLogsStore.getState().addLog({
        level: 'info',
        message: `Item added to queue: ${action}`,
        context: 'QueueService',
        data: { postId, action, queueSize: this.queue.length },
      });

      // Try to process if online
      this.processQueue();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to add item to queue',
        context: 'QueueService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Process queue items
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      useLogsStore.getState().addLog({
        level: 'warning',
        message: 'Cannot process queue: No internet connection',
        context: 'QueueService',
      });
      return;
    }

    this.isProcessing = true;

    try {
      const itemsToProcess = this.queue.slice(0, this.BATCH_SIZE);

      for (const item of itemsToProcess) {
        await this.processQueueItem(item);
      }

      await this.saveQueue();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Error processing queue',
        context: 'QueueService',
        data: { error: errorMessage },
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    try {
      const post = usePostsStore.getState().getPost(item.postId);
      if (!post) {
        this.removeFromQueue(item.id);
        return;
      }

      let success = false;

      switch (item.action) {
        case 'publish':
          const publishedPost = await bloggerService.createPost({
            title: item.payload.title,
            content: item.payload.content,
            labels: item.payload.labels,
            isDraft: item.payload.isDraft,
          });

          usePostsStore.getState().updatePost(item.postId, {
            status: 'published',
            bloggerPostId: publishedPost.id,
            bloggerUrl: publishedPost.url,
            publishedAt: Date.now(),
          });

          success = true;
          break;

        case 'update':
          await bloggerService.updatePost(item.payload.bloggerPostId, {
            title: item.payload.title,
            content: item.payload.content,
            labels: item.payload.labels,
          });

          usePostsStore.getState().updatePost(item.postId, {
            status: 'published',
            updatedAt: Date.now(),
          });

          success = true;
          break;

        case 'delete':
          await bloggerService.deletePost(item.payload.bloggerPostId);
          usePostsStore.getState().deletePost(item.postId);
          success = true;
          break;
      }

      if (success) {
        this.removeFromQueue(item.id);
        useLogsStore.getState().addLog({
          level: 'success',
          message: `Queue item processed: ${item.action}`,
          context: 'QueueService',
          data: { postId: item.postId },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      item.retryCount++;
      item.lastError = errorMessage;

      if (item.retryCount >= item.maxRetries) {
        usePostsStore.getState().updatePostStatus(item.postId, 'failed', errorMessage);
        this.removeFromQueue(item.id);

        useLogsStore.getState().addLog({
          level: 'error',
          message: `Queue item failed after ${item.maxRetries} retries`,
          context: 'QueueService',
          data: { postId: item.postId, error: errorMessage },
        });
      } else {
        useLogsStore.getState().addLog({
          level: 'warning',
          message: `Queue item retry ${item.retryCount}/${item.maxRetries}`,
          context: 'QueueService',
          data: { postId: item.postId },
        });
      }
    }
  }

  /**
   * Remove item from queue
   */
  private removeFromQueue(itemId: string): void {
    this.queue = this.queue.filter((item) => item.id !== itemId);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    totalItems: number;
    isProcessing: boolean;
    items: QueueItem[];
  } {
    return {
      totalItems: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue,
    };
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    try {
      this.queue = [];
      await this.saveQueue();

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Queue cleared',
        context: 'QueueService',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to clear queue',
        context: 'QueueService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Retry failed items
   */
  async retryFailedItems(): Promise<void> {
    try {
      const failedItems = this.queue.filter((item) => item.retryCount > 0);

      for (const item of failedItems) {
        if (item.retryCount < item.maxRetries) {
          item.retryCount = 0;
        }
      }

      await this.saveQueue();
      await this.processQueue();

      useLogsStore.getState().addLog({
        level: 'success',
        message: `Retrying ${failedItems.length} failed items`,
        context: 'QueueService',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Error retrying failed items',
        context: 'QueueService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.networkListener) {
      this.networkListener();
    }
  }
}

export const queueService = QueueService.getInstance();
