import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSettingsStore } from '@/lib/stores/settings.store';
import { useLogsStore } from '@/lib/stores/logs.store';
import { bloggerService } from '@/lib/services/blogger-service';
import { useState, useEffect } from 'react';
import { useColors } from '@/hooks/use-colors';

export default function BloggerSettingsScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuthStore();
  const { blogger: bloggerSettings, updateBloggerSettings } = useSettingsStore();
  const { addLog } = useLogsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [blogId, setBlogId] = useState(bloggerSettings.blogId);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    bloggerService.loadCredentials();
  }, []);

  const handleOAuthLogin = async () => {
    if (!clientId) {
      Alert.alert('Error', 'Please enter your Google Client ID');
      return;
    }
    setIsLoading(true);
    try {
      const success = await bloggerService.login(clientId);
      if (success) {
        Alert.alert('Success', 'Logged in successfully');
      } else {
        Alert.alert('Error', 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBlogId = async () => {
    if (!blogId) {
      Alert.alert('Error', 'Please enter a Blog ID');
      return;
    }
    await bloggerService.setBlogId(blogId);
    updateBloggerSettings({ blogId });
    Alert.alert('Success', 'Blog ID saved');
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Blogger Settings</Text>
            <Text className="text-base text-muted">Configure your Blogger account</Text>
          </View>

          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">Authentication</Text>
            
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Google Client ID</Text>
              <TextInput
                value={clientId}
                onChangeText={setClientId}
                placeholder="Enter your Google Client ID"
                className="bg-background border border-border rounded-lg p-3 text-foreground"
                placeholderTextColor={colors.muted}
              />
            </View>

            {isAuthenticated ? (
              <Pressable
                onPress={() => bloggerService.logout()}
                className="bg-error rounded-lg p-4 items-center"
              >
                <Text className="text-white font-semibold">Logout from Google</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleOAuthLogin}
                disabled={isLoading}
                className="bg-primary rounded-lg p-4 items-center"
              >
                {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Login with Google</Text>}
              </Pressable>
            )}
          </View>

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
              />
            </View>
            <Pressable
              onPress={handleSaveBlogId}
              className="bg-success rounded-lg p-3 items-center"
            >
              <Text className="text-white font-semibold">Save Blog ID</Text>
            </Pressable>
          </View>

          <View className="bg-surface rounded-2xl p-4 gap-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">Publishing Settings</Text>
            <Pressable
              onPress={() => updateBloggerSettings({ publishAsDraft: !bloggerSettings.publishAsDraft })}
              className="flex-row items-center justify-between p-3 bg-background rounded-lg"
            >
              <Text className="text-base font-medium text-foreground">Publish as Draft</Text>
              <View className={`w-12 h-7 rounded-full ${bloggerSettings.publishAsDraft ? 'bg-primary' : 'bg-border'}`} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
