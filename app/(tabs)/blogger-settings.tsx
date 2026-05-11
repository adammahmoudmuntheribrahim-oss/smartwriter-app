import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSettingsStore } from '@/lib/stores/settings.store';
import { useLogsStore } from '@/lib/stores/logs.store';
import { bloggerService } from '@/lib/services/blogger-service';
import { useState, useEffect } from 'react';
import { useColors } from '@/hooks/use-colors';
import * as WebBrowser from 'expo-web-browser';

export default function BloggerSettingsScreen() {
  const colors = useColors();
  const { bloggerAccount, setBloggerAccount, setLoading, setError } = useAuthStore();
  const { blogger: bloggerSettings, updateBloggerSettings } = useSettingsStore();
  const { addLog } = useLogsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [blogId, setBlogId] = useState(bloggerSettings.blogId);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    loadBloggerAccount();
  }, []);

  const loadBloggerAccount = async () => {
    try {
      setIsLoading(true);
      const loaded = await bloggerService.loadCredentials();
      if (loaded) {
        addLog({
          level: 'info',
          message: 'Blogger credentials loaded',
          context: 'BloggerSettings',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog({
        level: 'error',
        message: 'Failed to load Blogger credentials',
        context: 'BloggerSettings',
        data: { error: errorMessage },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement OAuth flow with expo-auth-session
      // For now, show a placeholder
      addLog({
        level: 'info',
        message: 'OAuth login initiated',
        context: 'BloggerSettings',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      addLog({
        level: 'error',
        message: 'OAuth login failed',
        context: 'BloggerSettings',
        data: { error: errorMessage },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateConnection = async () => {
    try {
      setIsValidating(true);

      if (!blogId) {
        setError('Please enter a Blog ID');
        return;
      }

      // Initialize service with current credentials
      const loaded = await bloggerService.loadCredentials();
      if (!loaded) {
        setError('No credentials found. Please login first.');
        return;
      }
      const isValid = await bloggerService.validateConnection();

      if (isValid) {
        updateBloggerSettings({ blogId });
        addLog({
          level: 'success',
          message: 'Blogger connection validated',
          context: 'BloggerSettings',
        });
      } else {
        setError('Connection validation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      addLog({
        level: 'error',
        message: 'Connection validation error',
        context: 'BloggerSettings',
        data: { error: errorMessage },
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleToggleAutoPublish = () => {
    updateBloggerSettings({
      enableAutoPublish: !bloggerSettings.enableAutoPublish,
    });
  };

  const handleTogglePublishAsDraft = () => {
    updateBloggerSettings({
      publishAsDraft: !bloggerSettings.publishAsDraft,
    });
  };

  const handleToggleRetryFailedPosts = () => {
    updateBloggerSettings({
      retryFailedPosts: !bloggerSettings.retryFailedPosts,
    });
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await bloggerService.clearCredentials();
      setBloggerAccount(null);
      setBlogId('');
      updateBloggerSettings({ blogId: '' });

      addLog({
        level: 'success',
        message: 'Blogger account disconnected',
        context: 'BloggerSettings',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Blogger Settings</Text>
            <Text className="text-base text-muted">
              Configure your Blogger account for auto-publishing
            </Text>
          </View>

          {/* Authentication Section */}
          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">Authentication</Text>

            {bloggerAccount ? (
              <View className="gap-3">
                <View className="bg-background rounded-lg p-3">
                  <Text className="text-sm text-muted">Connected Account</Text>
                  <Text className="text-base font-medium text-foreground">{bloggerAccount.email}</Text>
                </View>

                <View className="bg-background rounded-lg p-3">
                  <Text className="text-sm text-muted">Blog Title</Text>
                  <Text className="text-base font-medium text-foreground">{bloggerAccount.blogTitle}</Text>
                </View>

                <Pressable
                  onPress={handleDisconnect}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    {
                      backgroundColor: '#EF4444',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  className="rounded-lg p-3 items-center"
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold">Disconnect Account</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleOAuthLogin}
                disabled={isLoading}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#0a7ea4',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="rounded-lg p-4 items-center"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">Login with Google</Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Blog Configuration */}
          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">Blog Configuration</Text>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Blog ID</Text>
              <TextInput
                value={blogId}
                onChangeText={setBlogId}
                placeholder="Enter your Blogger Blog ID"
                className="bg-background border border-border rounded-lg p-3 text-foreground"
                placeholderTextColor={colors.muted}
                editable={!isLoading}
              />
            </View>

            <Pressable
              onPress={handleValidateConnection}
              disabled={isLoading || isValidating}
              style={({ pressed }) => [
                {
                  backgroundColor: '#22C55E',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              className="rounded-lg p-3 items-center"
            >
              {isValidating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Validate Connection</Text>
              )}
            </Pressable>
          </View>

          {/* Publishing Settings */}
          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">Publishing Settings</Text>

            {/* Auto Publish Toggle */}
            <Pressable
              onPress={handleToggleAutoPublish}
              className="flex-row items-center justify-between p-3 bg-background rounded-lg"
            >
              <View className="gap-1">
                <Text className="text-base font-medium text-foreground">Enable Auto Publish</Text>
                <Text className="text-sm text-muted">Automatically publish scheduled posts</Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full items-center justify-center ${
                  bloggerSettings.enableAutoPublish ? 'bg-primary' : 'bg-border'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white transform ${
                    bloggerSettings.enableAutoPublish ? 'translate-x-2' : '-translate-x-2'
                  }`}
                />
              </View>
            </Pressable>

            {/* Publish as Draft Toggle */}
            <Pressable
              onPress={handleTogglePublishAsDraft}
              className="flex-row items-center justify-between p-3 bg-background rounded-lg"
            >
              <View className="gap-1">
                <Text className="text-base font-medium text-foreground">Publish as Draft</Text>
                <Text className="text-sm text-muted">Save posts as drafts instead of publishing</Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full items-center justify-center ${
                  bloggerSettings.publishAsDraft ? 'bg-primary' : 'bg-border'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white transform ${
                    bloggerSettings.publishAsDraft ? 'translate-x-2' : '-translate-x-2'
                  }`}
                />
              </View>
            </Pressable>

            {/* Retry Failed Posts Toggle */}
            <Pressable
              onPress={handleToggleRetryFailedPosts}
              className="flex-row items-center justify-between p-3 bg-background rounded-lg"
            >
              <View className="gap-1">
                <Text className="text-base font-medium text-foreground">Retry Failed Posts</Text>
                <Text className="text-sm text-muted">Automatically retry failed publishes</Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full items-center justify-center ${
                  bloggerSettings.retryFailedPosts ? 'bg-primary' : 'bg-border'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white transform ${
                    bloggerSettings.retryFailedPosts ? 'translate-x-2' : '-translate-x-2'
                  }`}
                />
              </View>
            </Pressable>
          </View>

          {/* Max Retries Setting */}
          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">Retry Configuration</Text>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                Max Retries: {bloggerSettings.maxRetries}
              </Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 5].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => updateBloggerSettings({ maxRetries: num })}
                    style={({ pressed }) => [
                      {
                        backgroundColor:
                          bloggerSettings.maxRetries === num ? '#0a7ea4' : '#E5E7EB',
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    className="flex-1 rounded-lg p-2 items-center"
                  >
                    <Text
                      className={
                        bloggerSettings.maxRetries === num
                          ? 'text-white font-semibold'
                          : 'text-foreground font-medium'
                      }
                    >
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
