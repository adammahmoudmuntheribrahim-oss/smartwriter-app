import { ScrollView, Text, View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { usePostsStore } from '@/lib/stores/posts.store';
import { useLogsStore } from '@/lib/stores/logs.store';
import { queueService } from '@/lib/services/queue-service';
import { useState, useEffect } from 'react';
import { useColors } from '@/hooks/use-colors';

export default function QueueStatusScreen() {
  const colors = useColors();
  const { getQueuedPosts, getFailedPosts, updatePostStatus } = usePostsStore();
  const { addLog } = useLogsStore();

  const [queuedPosts, setQueuedPosts] = useState<any[]>([]);
  const [failedPosts, setFailedPosts] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    loadQueueStatus();
    const interval = setInterval(loadQueueStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadQueueStatus = async () => {
    try {
      const queued = getQueuedPosts();
      const failed = getFailedPosts();
      setQueuedPosts(queued);
      setFailedPosts(failed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog({
        level: 'error',
        message: 'Failed to load queue status',
        context: 'QueueStatus',
        data: { error: errorMessage },
      });
    }
  };

  const handleProcessQueue = async () => {
    try {
      setIsProcessing(true);
      await queueService.processQueue();
      await loadQueueStatus();

      addLog({
        level: 'success',
        message: 'Queue processing started',
        context: 'QueueStatus',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog({
        level: 'error',
        message: 'Failed to process queue',
        context: 'QueueStatus',
        data: { error: errorMessage },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setIsRetrying(true);
      await queueService.retryFailedItems();
      await loadQueueStatus();

      addLog({
        level: 'success',
        message: 'Retry process started',
        context: 'QueueStatus',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog({
        level: 'error',
        message: 'Failed to retry items',
        context: 'QueueStatus',
        data: { error: errorMessage },
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClearQueue = async () => {
    try {
      await queueService.clearQueue();
      await loadQueueStatus();

      addLog({
        level: 'success',
        message: 'Queue cleared',
        context: 'QueueStatus',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog({
        level: 'error',
        message: 'Failed to clear queue',
        context: 'QueueStatus',
        data: { error: errorMessage },
      });
    }
  };

  const handleRefresh = async () => {
    await loadQueueStatus();
  };

  const QueueItemCard = ({ item, isFailure }: any) => (
    <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View
          className={`px-2 py-1 rounded-full ${
            isFailure ? 'bg-error/20' : 'bg-warning/20'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              isFailure ? 'text-error' : 'text-warning'
            }`}
          >
            {isFailure ? 'Failed' : 'Queued'}
          </Text>
        </View>
      </View>

      {isFailure && item.failureReason && (
        <View className="mb-2 bg-background rounded p-2">
          <Text className="text-xs text-error">{item.failureReason}</Text>
        </View>
      )}

      <Text className="text-xs text-muted">
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </View>
  );

  const stats = {
    queued: queuedPosts.length,
    failed: failedPosts.length,
    total: queuedPosts.length + failedPosts.length,
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="p-4"
      >
        <View className="gap-4">
          {/* Header */}
          <Pressable onPress={handleRefresh}>
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">Queue Status</Text>
              <Text className="text-base text-muted">Monitor pending and failed posts (Pull to refresh)</Text>
            </View>
          </Pressable>

          {/* Stats Cards */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border items-center">
              <Text className="text-2xl font-bold text-primary">{stats.queued}</Text>
              <Text className="text-xs text-muted mt-1">Queued</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border items-center">
              <Text className="text-2xl font-bold text-error">{stats.failed}</Text>
              <Text className="text-xs text-muted mt-1">Failed</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border items-center">
              <Text className="text-2xl font-bold text-foreground">{stats.total}</Text>
              <Text className="text-xs text-muted mt-1">Total</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-2">
            <Pressable
              onPress={handleProcessQueue}
              disabled={isProcessing || stats.queued === 0}
              style={({ pressed }) => [
                {
                  backgroundColor: stats.queued === 0 ? '#E5E7EB' : '#0a7ea4',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg p-3 items-center"
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className={
                    stats.queued === 0
                      ? 'text-muted font-semibold'
                      : 'text-white font-semibold'
                  }
                >
                  Process Queue
                </Text>
              )}
            </Pressable>

            {stats.failed > 0 && (
              <Pressable
                onPress={handleRetryFailed}
                disabled={isRetrying}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#F59E0B',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg p-3 items-center"
              >
                {isRetrying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Retry Failed ({stats.failed})</Text>
                )}
              </Pressable>
            )}

            {stats.total > 0 && (
              <Pressable
                onPress={handleClearQueue}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#EF4444',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg p-3 items-center"
              >
                <Text className="text-white font-semibold">Clear Queue</Text>
              </Pressable>
            )}
          </View>

          {/* Queued Posts Section */}
          {stats.queued > 0 && (
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">Pending Posts ({stats.queued})</Text>
              <FlatList
                scrollEnabled={false}
                data={queuedPosts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <QueueItemCard item={item} isFailure={false} />}
              />
            </View>
          )}

          {/* Failed Posts Section */}
          {stats.failed > 0 && (
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">Failed Posts ({stats.failed})</Text>
              <FlatList
                scrollEnabled={false}
                data={failedPosts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <QueueItemCard item={item} isFailure={true} />}
              />
            </View>
          )}

          {/* Empty State */}
          {stats.total === 0 && (
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-lg text-muted">No items in queue</Text>
              <Text className="text-sm text-muted mt-2">All posts are up to date</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
