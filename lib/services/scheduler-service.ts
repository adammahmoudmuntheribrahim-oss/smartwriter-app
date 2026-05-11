import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { useSchedulerStore, type Schedule, type ScheduleFrequency } from '@/lib/stores/scheduler.store';
import { usePostsStore } from '@/lib/stores/posts.store';
import { bloggerService } from '@/lib/services/blogger-service';
import { useLogsStore } from '@/lib/stores/logs.store';
import { useSettingsStore } from '@/lib/stores/settings.store';
import { queueService } from './queue-service';

const BACKGROUND_PUBLISH_TASK = 'BACKGROUND_PUBLISH_TASK';

TaskManager.defineTask(BACKGROUND_PUBLISH_TASK, async () => {
  try {
    console.log('[BackgroundFetch] Running background publish task');
    await schedulerService.checkAndExecuteSchedules();
    await queueService.processQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundFetch] Task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export interface ScheduleExecutionResult {
  success: boolean;
  postId: string;
  scheduleId: string;
  message: string;
  error?: string;
  timestamp: number;
}

export class SchedulerService {
  private static instance: SchedulerService;
  private executionTimer: any = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  async start() {
    if (this.isRunning) return;

    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PUBLISH_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_PUBLISH_TASK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }

      this.isRunning = true;
      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Scheduler service started with background support',
        context: 'SchedulerService',
      });

      this.executionTimer = setInterval(() => {
        this.checkAndExecuteSchedules();
      }, 60000);

      this.checkAndExecuteSchedules();
    } catch (error) {
      console.error('Failed to start scheduler:', error);
    }
  }

  stop(): void {
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
      this.executionTimer = null;
    }
    this.isRunning = false;
    useLogsStore.getState().addLog({
      level: 'success',
      message: 'Scheduler service stopped',
      context: 'SchedulerService',
    });
  }

  async checkAndExecuteSchedules(): Promise<void> {
    try {
      const upcomingSchedules = useSchedulerStore.getState().getUpcomingSchedules(1);
      for (const schedule of upcomingSchedules) {
        if (schedule.nextPublishTime <= Date.now()) {
          await this.executeSchedule(schedule);
        }
      }
    } catch (error) {
      console.error('Error checking schedules:', error);
    }
  }

  private async executeSchedule(schedule: Schedule): Promise<ScheduleExecutionResult> {
    const result: ScheduleExecutionResult = {
      success: false,
      postId: schedule.postId,
      scheduleId: schedule.id,
      message: '',
      timestamp: Date.now(),
    };

    try {
      const post = usePostsStore.getState().getPost(schedule.postId);
      if (!post) {
        result.message = 'Post not found';
        return result;
      }

      const settings = useSettingsStore.getState().getBloggerSettings();
      if (!settings.blogId) {
        result.message = 'Blogger not configured';
        return result;
      }

      const bloggerPost = await bloggerService.createPost({
        title: post.title,
        content: post.content,
        labels: post.tags,
      }, settings.publishAsDraft);

      usePostsStore.getState().updatePost(schedule.postId, {
        status: settings.publishAsDraft ? 'draft' : 'published',
        bloggerPostId: bloggerPost.id,
        bloggerUrl: bloggerPost.url,
        publishedAt: Date.now(),
      });

      const nextPublishTime = this.calculateNextPublishTime(schedule);
      useSchedulerStore.getState().updateSchedule(schedule.id, {
        nextPublishTime,
        lastPublishedAt: Date.now(),
        failureCount: 0,
      });

      result.success = true;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      useSchedulerStore.getState().incrementFailureCount(schedule.id);
      return result;
    }
  }

  private calculateNextPublishTime(schedule: Schedule): number {
    const intervalMs: Record<ScheduleFrequency, number> = {
      immediate: 0,
      '30min': 30 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '2hours': 2 * 60 * 60 * 1000,
      '4hours': 4 * 60 * 60 * 1000,
      custom: (schedule.customInterval || 60) * 60 * 1000,
    };
    return Date.now() + (intervalMs[schedule.frequency] || 0);
  }

  createSchedule(postId: string, frequency: ScheduleFrequency, customInterval?: number): void {
    const settings = useSettingsStore.getState().getAppSettings();
    const nextTime = this.calculateNextPublishTime({ frequency, customInterval } as any);
    useSchedulerStore.getState().addSchedule({
      postId,
      frequency,
      customInterval,
      timezone: settings.timezone,
      nextPublishTime: nextTime,
      isActive: true,
      failureCount: 0,
      maxRetries: 5,
    });
  }

  deleteSchedule(scheduleId: string): void {
    useSchedulerStore.getState().deleteSchedule(scheduleId);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeSchedules: useSchedulerStore.getState().getActiveSchedules().length,
    };
  }
}

export const schedulerService = SchedulerService.getInstance();
