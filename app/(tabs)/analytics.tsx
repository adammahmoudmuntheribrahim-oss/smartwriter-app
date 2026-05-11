import { ScrollView, Text, View, Pressable, Dimensions } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { usePostsStore } from '@/lib/stores/posts.store';
import { useColors } from '@/hooks/use-colors';
import { useState, useEffect } from 'react';

export default function AnalyticsScreen() {
  const colors = useColors();
  const { getAllPosts, getPostStats } = usePostsStore();
  const [stats, setStats] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = () => {
    const postStats = getPostStats();
    const allPosts = getAllPosts();

    // Filter by time range
    const now = Date.now();
    const rangeMs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity,
    };

    const filteredPosts = allPosts.filter(
      (p) => now - p.createdAt <= rangeMs[timeRange]
    );

    // Calculate metrics
    const publishedPosts = filteredPosts.filter((p) => p.status === 'published');
    const avgSeoScore =
      publishedPosts.length > 0
        ? Math.round(
            publishedPosts.reduce((sum, p) => sum + (p.scores?.seoScore || 0), 0) /
              publishedPosts.length
          )
        : 0;

    const avgReadability =
      publishedPosts.length > 0
        ? Math.round(
            publishedPosts.reduce((sum, p) => sum + (p.scores?.readabilityScore || 0), 0) /
              publishedPosts.length
          )
        : 0;

    const avgEngagement =
      publishedPosts.length > 0
        ? Math.round(
            publishedPosts.reduce((sum, p) => sum + (p.scores?.engagementScore || 0), 0) /
              publishedPosts.length
          )
        : 0;

    setStats({
      ...postStats,
      avgSeoScore,
      avgReadability,
      avgEngagement,
      publishedInRange: publishedPosts.length,
      topTemplates: getTopTemplates(filteredPosts),
    });
  };

  const getTopTemplates = (posts: any[]) => {
    const templates: Record<string, number> = {};
    posts.forEach((p) => {
      templates[p.template] = (templates[p.template] || 0) + 1;
    });

    return Object.entries(templates)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([template, count]) => ({ template, count }));
  };

  const StatCard = ({ label, value, unit = '', color = 'primary' }: any) => (
    <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
      <Text className="text-xs text-muted mb-1">{label}</Text>
      <View className="flex-row items-baseline gap-1">
        <Text className={`text-2xl font-bold text-${color}`}>{value}</Text>
        {unit && <Text className="text-xs text-muted">{unit}</Text>}
      </View>
    </View>
  );

  if (!stats) {
    return (
      <ScreenContainer className="bg-background items-center justify-center">
        <Text className="text-muted">Loading analytics...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="gap-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Analytics</Text>
            <Text className="text-base text-muted">Track your publishing performance</Text>
          </View>

          {/* Time Range Selector */}
          <View className="flex-row gap-2">
            {(['week', 'month', 'all'] as const).map((range) => (
              <Pressable
                key={range}
                onPress={() => setTimeRange(range)}
                style={({ pressed }) => [
                  {
                    backgroundColor: timeRange === range ? '#0a7ea4' : '#E5E7EB',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="flex-1 rounded-lg p-2 items-center"
              >
                <Text
                  className={
                    timeRange === range
                      ? 'text-white font-semibold text-sm'
                      : 'text-foreground font-medium text-sm'
                  }
                >
                  {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All Time'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Overview Stats */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-foreground">Overview</Text>
            <View className="flex-row gap-2">
              <StatCard label="Total Posts" value={stats.total} />
              <StatCard label="Published" value={stats.published} color="success" />
            </View>
            <View className="flex-row gap-2">
              <StatCard label="Scheduled" value={stats.scheduled} color="warning" />
              <StatCard label="Failed" value={stats.failed} color="error" />
            </View>
          </View>

          {/* Quality Metrics */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-foreground">Quality Metrics</Text>
            <View className="flex-row gap-2">
              <StatCard label="Avg SEO Score" value={stats.avgSeoScore} unit="/100" />
              <StatCard label="Avg Readability" value={stats.avgReadability} unit="/100" />
            </View>
            <View className="flex-row gap-2">
              <StatCard label="Avg Engagement" value={stats.avgEngagement} unit="/100" />
              <StatCard label="Published (Range)" value={stats.publishedInRange} />
            </View>
          </View>

          {/* Top Templates */}
          {stats.topTemplates && stats.topTemplates.length > 0 && (
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">Top Templates</Text>
              <View className="bg-surface rounded-lg p-4 border border-border gap-3">
                {stats.topTemplates.map((item: any, index: number) => (
                  <View key={index} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <View className="w-2 h-2 rounded-full bg-primary" />
                      <Text className="text-sm font-medium text-foreground capitalize">
                        {item.template}
                      </Text>
                    </View>
                    <View className="bg-primary/20 px-2 py-1 rounded">
                      <Text className="text-sm font-semibold text-primary">
                        {item.count} posts
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Status Breakdown */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-foreground">Status Breakdown</Text>
            <View className="bg-surface rounded-lg p-4 border border-border gap-3">
              {[
                { label: 'Published', value: stats.published, color: '#22C55E' },
                { label: 'Scheduled', value: stats.scheduled, color: '#F59E0B' },
                { label: 'Draft', value: stats.draft, color: '#6B7280' },
                { label: 'Failed', value: stats.failed, color: '#EF4444' },
                { label: 'Queued', value: stats.queued, color: '#0a7ea4' },
              ].map((item, index) => {
                const percentage =
                  stats.total > 0
                    ? Math.round((item.value / stats.total) * 100)
                    : 0;

                return (
                  <View key={index} className="gap-1">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <Text className="text-sm font-medium text-foreground">
                          {item.label}
                        </Text>
                      </View>
                      <Text className="text-sm font-semibold text-foreground">
                        {item.value} ({percentage}%)
                      </Text>
                    </View>
                    <View className="h-2 bg-border rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Insights */}
          <View className="gap-2">
            <Text className="text-lg font-semibold text-foreground">Insights</Text>
            <View className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <Text className="text-sm text-foreground leading-relaxed">
                {stats.published > 0
                  ? `You've published ${stats.published} posts with an average SEO score of ${stats.avgSeoScore}/100. Keep creating quality content!`
                  : 'Start publishing posts to see your analytics here.'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
