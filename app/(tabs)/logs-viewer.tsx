import { ScrollView, Text, View, Pressable, TextInput, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useLogsStore } from '@/lib/stores/logs.store';
import { useState, useEffect } from 'react';
import { useColors } from '@/hooks/use-colors';

export default function LogsViewerScreen() {
  const colors = useColors();
  const { getRecentLogs, getLogsByLevel, searchLogs, clearLogs, exportLogs, getLogStats } =
    useLogsStore();

  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, selectedLevel, searchQuery]);

  const loadLogs = () => {
    const recentLogs = getRecentLogs(100);
    setLogs(recentLogs);
    setStats(getLogStats());
  };

  const filterLogs = () => {
    let filtered = logs;

    if (selectedLevel) {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    if (searchQuery) {
      filtered = searchLogs(searchQuery);
    }

    setFilteredLogs(filtered);
  };

  const handleClearLogs = () => {
    clearLogs();
    loadLogs();
  };

  const handleExportLogs = () => {
    const csv = exportLogs();
    // TODO: Implement file sharing
    console.log('Exported logs:', csv);
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      info: '#0a7ea4',
      warning: '#F59E0B',
      error: '#EF4444',
      debug: '#6B7280',
      success: '#22C55E',
    };
    return colors[level] || '#6B7280';
  };

  const getLevelBgColor = (level: string) => {
    const colors: Record<string, string> = {
      info: '#0a7ea4/10',
      warning: '#F59E0B/10',
      error: '#EF4444/10',
      debug: '#6B7280/10',
      success: '#22C55E/10',
    };
    return colors[level] || '#6B7280/10';
  };

  const LogEntry = ({ item }: any) => (
    <View className="bg-surface rounded-lg p-3 mb-2 border border-border">
      <View className="flex-row items-start justify-between mb-1">
        <View className="flex-row items-center gap-2 flex-1">
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getLevelColor(item.level) }}
          />
          <Text className="text-xs font-semibold text-foreground uppercase">
            {item.level}
          </Text>
          {item.context && (
            <Text className="text-xs text-muted">{item.context}</Text>
          )}
        </View>
        <Text className="text-xs text-muted">
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>

      <Text className="text-sm text-foreground mb-1">{item.message}</Text>

      {item.data && (
        <View className="bg-background rounded p-2 mt-1">
          <Text className="text-xs text-muted font-mono">
            {JSON.stringify(item.data, null, 2)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="gap-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">System Logs</Text>
            <Text className="text-base text-muted">Monitor application events and errors</Text>
          </View>

          {/* Stats */}
          {stats && (
            <View className="flex-row gap-2">
              <View className="flex-1 bg-surface rounded-lg p-3 border border-border items-center">
                <Text className="text-lg font-bold text-foreground">{stats.total}</Text>
                <Text className="text-xs text-muted">Total</Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-3 border border-border items-center">
                <Text className="text-lg font-bold text-error">{stats.error}</Text>
                <Text className="text-xs text-muted">Errors</Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-3 border border-border items-center">
                <Text className="text-lg font-bold text-warning">{stats.warning}</Text>
                <Text className="text-xs text-muted">Warnings</Text>
              </View>
            </View>
          )}

          {/* Search */}
          <View className="gap-2">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search logs..."
              className="bg-surface border border-border rounded-lg p-3 text-foreground"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Level Filter */}
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Filter by Level</Text>
            <View className="flex-row gap-2 flex-wrap">
              {['info', 'success', 'warning', 'error', 'debug'].map((level) => (
                <Pressable
                  key={level}
                  onPress={() =>
                    setSelectedLevel(selectedLevel === level ? null : level)
                  }
                  style={({ pressed }) => [
                    {
                      backgroundColor:
                        selectedLevel === level
                          ? getLevelColor(level)
                          : '#E5E7EB',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  className="px-3 py-2 rounded-full"
                >
                  <Text
                    className={
                      selectedLevel === level
                        ? 'text-white text-xs font-semibold capitalize'
                        : 'text-foreground text-xs font-medium capitalize'
                    }
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Logs List */}
          {filteredLogs.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                {filteredLogs.length} Log Entries
              </Text>
              <FlatList
                scrollEnabled={false}
                data={filteredLogs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <LogEntry item={item} />}
              />
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-lg text-muted">No logs found</Text>
              {searchQuery && (
                <Text className="text-sm text-muted mt-2">
                  Try adjusting your search query
                </Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-2 mt-4">
            <Pressable
              onPress={handleExportLogs}
              style={({ pressed }) => [
                {
                  backgroundColor: '#0a7ea4',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg p-3 items-center"
            >
              <Text className="text-white font-semibold">Export Logs</Text>
            </Pressable>

            {logs.length > 0 && (
              <Pressable
                onPress={handleClearLogs}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#EF4444',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg p-3 items-center"
              >
                <Text className="text-white font-semibold">Clear All Logs</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
