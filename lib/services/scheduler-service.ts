import { useSchedulerStore, type Schedule, type ScheduleFrequency } from '@/lib/stores/scheduler.store';
import { usePostsStore } from '@/lib/stores/posts.store';
import { bloggerService } from '@/lib/services/blogger-service';
import { useLogsStore } from '@/lib/stores/logs.store';
import { useSettingsStore } from '@/lib/stores/settings.store';

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

  /**
   * Start the scheduler service
   */
  start(): void {
    if (this.isRunning) {
      useLogsStore.getState().addLog({
        level: 'warning',
        message: 'Scheduler already running',
        context: 'SchedulerService',
      });
      return;
    }

    this.isRunning = true;
    useLogsStore.getState().addLog({
      level: 'success',
      message: 'Scheduler service started',
      context: 'SchedulerService',
    });

    // Check every minute for scheduled posts
    this.executionTimer = setInterval(() => {
      this.checkAndExecuteSchedules();
    }, 60000) as any; // 1 minute

    // Initial check
    this.checkAndExecuteSchedules();
  }

  /**
   * Stop the scheduler service
   */
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

  /**
   * Check and execute due schedules
   */
  private async checkAndExecuteSchedules(): Promise<void> {
    try {
      const upcomingSchedules = useSchedulerStore.getState().getUpcomingSchedules(1); // Next hour

      for (const schedule of upcomingSchedules) {
        if (schedule.nextPublishTime <= Date.now()) {
          await this.executeSchedule(schedule);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Error checking schedules',
        context: 'SchedulerService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Execute a single schedule
   */
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
        result.error = 'Post not found';
        useLogsStore.getState().addLog({
          level: 'warning',
          message: 'Scheduled post not found',
          context: 'SchedulerService',
          data: { postId: schedule.postId },
        });
        return result;
      }

      // Check if Blogger is configured
      const settings = useSettingsStore.getState().getBloggerSettings();
      if (!settings.blogId) {
        result.message = 'Blogger not configured';
        result.error = 'Blogger not configured';
        useLogsStore.getState().addLog({
          level: 'warning',
          message: 'Cannot execute schedule: Blogger not configured',
          context: 'SchedulerService',
        });
        return result;
      }

      // Publish the post
      const bloggerPost = await bloggerService.createPost({
        title: post.title,
        content: post.content,
        labels: post.tags,
        isDraft: settings.publishAsDraft,
      });

      // Update post with published info
      usePostsStore.getState().updatePost(schedule.postId, {
        status: settings.publishAsDraft ? 'draft' : 'published',
        bloggerPostId: bloggerPost.id,
        bloggerUrl: bloggerPost.url,
        publishedAt: Date.now(),
      });

      // Update schedule
      const nextPublishTime = this.calculateNextPublishTime(schedule);
      useSchedulerStore.getState().updateSchedule(schedule.id, {
        nextPublishTime,
        lastPublishedAt: Date.now(),
        failureCount: 0,
      });

      result.success = true;
      result.message = 'Post published successfully';

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Scheduled post published',
        context: 'SchedulerService',
        data: { postId: schedule.postId, bloggerPostId: bloggerPost.id },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      result.message = `Failed to publish: ${errorMessage}`;

      // Increment failure count
      useSchedulerStore.getState().incrementFailureCount(schedule.id);

      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to execute schedule',
        context: 'SchedulerService',
        data: { postId: schedule.postId, error: errorMessage },
      });

      return result;
    }
  }

  /**
   * Calculate next publish time based on frequency
   */
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

  /**
   * Create a new schedule
   */
  createSchedule(
    postId: string,
    frequency: ScheduleFrequency,
    customInterval?: number
  ): void {
    try {
      const settings = useSettingsStore.getState().getAppSettings();

      const nextTime = this.calculateNextPublishTime({ postId, frequency, customInterval, timezone: settings.timezone, isActive: true, failureCount: 0, maxRetries: 3, nextPublishTime: 0, createdAt: Date.now() } as any);
      useSchedulerStore.getState().addSchedule({
        postId,
        frequency,
        customInterval,
        timezone: settings.timezone,
        nextPublishTime: nextTime,
        isActive: true,
        failureCount: 0,
        maxRetries: 3,
      });

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Schedule created',
        context: 'SchedulerService',
        data: { postId, frequency },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to create schedule',
        context: 'SchedulerService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(scheduleId: string): void {
    try {
      useSchedulerStore.getState().deleteSchedule(scheduleId);

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Schedule deleted',
        context: 'SchedulerService',
        data: { scheduleId },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to delete schedule',
        context: 'SchedulerService',
        data: { error: errorMessage },
      });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    activeSchedules: number;
    upcomingSchedules: number;
  } {
    return {
      isRunning: this.isRunning,
      activeSchedules: useSchedulerStore.getState().getActiveSchedules().length,
      upcomingSchedules: useSchedulerStore.getState().getUpcomingSchedules(24).length,
    };
  }

  /**
   * Retry failed schedules
   */
  async retryFailedSchedules(): Promise<void> {
    try {
      const schedules = useSchedulerStore.getState().getActiveSchedules();
      const failedSchedules = schedules.filter((s) => s.failureCount > 0);

      for (const schedule of failedSchedules) {
        if (schedule.failureCount < schedule.maxRetries) {
          await this.executeSchedule(schedule);
        }
      }

      useLogsStore.getState().addLog({
        level: 'success',
        message: `Retried ${failedSchedules.length} failed schedules`,
        context: 'SchedulerService',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Error retrying failed schedules',
        context: 'SchedulerService',
        data: { error: errorMessage },
      });
    }
  }
}

export const schedulerService = SchedulerService.getInstance();
