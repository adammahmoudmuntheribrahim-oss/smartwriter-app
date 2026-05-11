import { ScrollView, Text, View, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { usePostsStore } from '@/lib/stores/posts.store';
import { useAnalyticsStore } from '@/lib/stores/analytics.store';
import { useSchedulerStore } from '@/lib/stores/scheduler.store';
import { useState, useEffect } from 'react';

export default function AnalyticsScreen() {
  const { getAllPosts } = usePostsStore();
  const { publishedPosts, failedPosts, successRate, totalArticlesGenerated } = useAnalyticsStore();
  const { schedules } = useSchedulerStore();
  const [stats, setStats] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    const allPosts = getAllPosts();
    const activeSchedules = schedules.filter(s => s.isActive).length;
    
    setStats({
      total: allPosts.length,
      published: publishedPosts,
      failed: failedPosts,
      scheduled: activeSchedules,
      successRate,
      totalGenerated: totalArticlesGenerated
    });
  }, [publishedPosts, failedPosts, schedules, timeRange]);

  const StatCard = ({ label, value, unit = '', color = 'primary' }: any) => (
    <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
      <Text className="text-xs text-muted mb-1">{label}</Text>
      <View className="flex-row items-baseline gap-1">
        <Text className={`text-2xl font-bold text-${color}`}>{value}</Text>
        {unit && <Text className="text-xs text-muted">{unit}</Text>}
      </View>
    </View>
  );

  if (!stats) return null;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Analytics</Text>
            <Text className="text-base text-muted">Track your publishing performance</Text>
          </View>

          <View className="gap-2">
            <Text className="text-lg font-semibold text-foreground">Overview</Text>
            <View className="flex-row gap-2">
              <StatCard label="Total Generated" value={stats.totalGenerated} />
              <StatCard label="Published" value={stats.published} color="success" />
            </View>
            <View className="flex-row gap-2">
              <StatCard label="Scheduled" value={stats.scheduled} color="warning" />
              <StatCard label="Failed" value={stats.failed} color="error" />
            </View>
            <View className="flex-row gap-2">
              <StatCard label="Success Rate" value={stats.successRate.toFixed(1)} unit="%" color="primary" />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-lg font-semibold text-foreground">Insights</Text>
            <View className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <Text className="text-sm text-foreground leading-relaxed">
                {stats.published > 0
                  ? `You've published ${stats.published} posts with a success rate of ${stats.successRate.toFixed(1)}%. Keep it up!`
                  : 'Start publishing posts to see your analytics here.'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
