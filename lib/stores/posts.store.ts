import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateCreator } from 'zustand';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'queued';
export type PostTemplate = 'seo' | 'affiliate' | 'review' | 'tutorial' | 'news' | 'rewrite' | 'humanized';

export interface ContentScores {
  seoScore: number;
  humanScore: number;
  readabilityScore: number;
  engagementScore: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  tags: string[];
  keywords: string[];
  featuredImage?: string;
  status: PostStatus;
  template: PostTemplate;
  scores?: ContentScores;
  bloggerPostId?: string;
  bloggerUrl?: string;
  publishedAt?: number;
  scheduledFor?: number;
  createdAt: number;
  updatedAt: number;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  isDraft: boolean;
  suggestedTitles?: string[];
  suggestedTags?: string[];
  suggestedKeywords?: string[];
}

export interface PostsState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  selectedPostId: string | null;

  // Methods
  addPost: (post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  getPost: (id: string) => Post | undefined;
  getAllPosts: () => Post[];
  getPostsByStatus: (status: PostStatus) => Post[];
  getPostsByTemplate: (template: PostTemplate) => Post[];
  getPublishedPosts: () => Post[];
  getDraftPosts: () => Post[];
  getScheduledPosts: () => Post[];
  getFailedPosts: () => Post[];
  getQueuedPosts: () => Post[];
  updatePostStatus: (id: string, status: PostStatus, reason?: string) => void;
  updatePostScores: (id: string, scores: ContentScores) => void;
  incrementRetryCount: (id: string) => void;
  setSelectedPost: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearPosts: () => void;
  getPostStats: () => {
    total: number;
    published: number;
    scheduled: number;
    draft: number;
    failed: number;
    queued: number;
  };
}

const generateId = () => `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const usePostsStore = create<PostsState>()(
  persist(
    (set, get) => ({
      posts: [],
      isLoading: false,
      error: null,
      selectedPostId: null,

      addPost: (post) => {
        const newPost: Post = {
          ...post,
          id: generateId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
        };

        set((state) => ({
          posts: [newPost, ...state.posts],
        }));
      },

      updatePost: (id: string, updates: Partial<Post>) => {
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === id
              ? { ...post, ...updates, updatedAt: Date.now() }
              : post
          ),
        }));
      },

      deletePost: (id: string) => {
        set((state) => ({
          posts: state.posts.filter((post) => post.id !== id),
          selectedPostId: state.selectedPostId === id ? null : state.selectedPostId,
        }));
      },

      getPost: (id: string) => {
        return get().posts.find((post) => post.id === id);
      },

      getAllPosts: () => {
        return get().posts;
      },

      getPostsByStatus: (status: PostStatus) => {
        return get().posts.filter((post) => post.status === status);
      },

      getPostsByTemplate: (template: PostTemplate) => {
        return get().posts.filter((post) => post.template === template);
      },

      getPublishedPosts: () => {
        return get().getPostsByStatus('published');
      },

      getDraftPosts: () => {
        return get().getPostsByStatus('draft');
      },

      getScheduledPosts: () => {
        return get().getPostsByStatus('scheduled');
      },

      getFailedPosts: () => {
        return get().getPostsByStatus('failed');
      },

      getQueuedPosts: () => {
        return get().getPostsByStatus('queued');
      },

      updatePostStatus: (id: string, status: PostStatus, reason?: string) => {
        const post = get().getPost(id);
        if (post) {
          get().updatePost(id, {
            status,
            failureReason: reason,
            publishedAt: status === 'published' ? Date.now() : post.publishedAt,
          });
        }
      },

      updatePostScores: (id: string, scores: ContentScores) => {
        get().updatePost(id, { scores });
      },

      incrementRetryCount: (id: string) => {
        const post = get().getPost(id);
        if (post) {
          const newRetryCount = post.retryCount + 1;
          get().updatePost(id, {
            retryCount: newRetryCount,
            status: newRetryCount >= post.maxRetries ? 'failed' : post.status,
          });
        }
      },

      setSelectedPost: (id: string | null) => {
        set({ selectedPostId: id });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearPosts: () => {
        set({ posts: [], selectedPostId: null });
      },

      getPostStats: () => {
        const posts = get().posts;
        return {
          total: posts.length,
          published: posts.filter((p) => p.status === 'published').length,
          scheduled: posts.filter((p) => p.status === 'scheduled').length,
          draft: posts.filter((p) => p.status === 'draft').length,
          failed: posts.filter((p) => p.status === 'failed').length,
          queued: posts.filter((p) => p.status === 'queued').length,
        };
      },
    }),
    {
      name: 'posts-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
