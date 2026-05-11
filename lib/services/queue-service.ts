import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePostsStore, type Post } from '@/lib/stores/posts.store';
import { bloggerService } from '@/lib/services/blogger-service';
import { useLogsStore } from '@/lib/stores/logs.store';
import { useSettingsStore } from '@/lib/stores/settings.store';
import { useAnalyticsStore } from '@/lib/stores/analytics.store';
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

  private initializeNetworkListener(): void {
    this.networkListener = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  async loadQueue(): Promise<void> {
    try {
      const storedQueue = await AsyncStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  async addToQueue(
    postId: string,
    action: 'publish' | 'update' | 'delete',
    payload: Record<string, any>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    const queueItem: QueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      action,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 5,
      priority,
    };

    this.queue.push(queueItem);
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    await this.saveQueue();
    this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    this.isProcessing = true;
    try {
      const itemsToProcess = this.queue.slice(0, this.BATCH_SIZE);
      for (const item of itemsToProcess) {
        await this.processQueueItem(item);
      }
      await this.saveQueue();
    } finally {
      this.isProcessing = false;
    }
  }

  private async processQueueItem(item: QueueItem): Promise<void> {
    try {
      const post = usePostsStore.getState().getPost(item.postId);
      if (!post) {
        this.removeFromQueue(item.id);
        return;
      }

      if (item.action === 'publish') {
        const settings = useSettingsStore.getState().getBloggerSettings();
        const publishedPost = await bloggerService.createPost({
          title: item.payload.title,
          content: item.payload.content,
          labels: item.payload.labels,
        }, settings.publishAsDraft);

        usePostsStore.getState().updatePost(item.postId, {
          status: settings.publishAsDraft ? 'draft' : 'published',
          bloggerPostId: publishedPost.id,
          bloggerUrl: publishedPost.url,
          publishedAt: Date.now(),
        });
        
        useAnalyticsStore.getState().incrementPublished();
      }

      this.removeFromQueue(item.id);
    } catch (error) {
      item.retryCount++;
      item.lastError = error instanceof Error ? error.message : String(error);
      
      if (item.retryCount >= item.maxRetries) {
        usePostsStore.getState().updatePost(item.postId, { status: 'failed' });
        useAnalyticsStore.getState().incrementFailed();
        this.removeFromQueue(item.id);
      }
    }
  }

  private removeFromQueue(itemId: string): void {
    this.queue = this.queue.filter((item) => item.id !== itemId);
  }

  getQueueStatus() {
    return {
      totalItems: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue,
    };
  }
}

export const queueService = QueueService.getInstance();
