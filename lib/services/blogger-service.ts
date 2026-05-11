import axios, { AxiosInstance, AxiosError } from 'axios';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { secureStorage } from '@/lib/_core/secure-store';
import { useLogsStore } from '@/lib/stores/logs.store';
import { useAuthStore } from '@/lib/stores/auth.store';

WebBrowser.maybeCompleteAuthSession();

export interface BloggerPost {
  id?: string;
  title: string;
  content: string;
  labels?: string[];
  status?: 'LIVE' | 'DRAFT' | 'SCHEDULED';
  published?: string;
  url?: string;
}

export class BloggerService {
  private static instance: BloggerService;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private blogId: string | null = null;

  private readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly SCOPES = ['https://www.googleapis.com/auth/blogger'];

  private constructor() {
    this.client = axios.create({
      baseURL: 'https://www.googleapis.com/blogger/v3',
      timeout: 15000,
    });

    this.client.interceptors.request.use(async (config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): BloggerService {
    if (!BloggerService.instance) {
      BloggerService.instance = new BloggerService();
    }
    return BloggerService.instance;
  }

  async setBlogId(id: string) {
    this.blogId = id;
    await secureStorage.setItem('blogger_blog_id', id);
  }

  async getBlogId() {
    if (!this.blogId) {
      this.blogId = await secureStorage.getItem('blogger_blog_id');
    }
    return this.blogId;
  }

  async loadCredentials() {
    this.accessToken = await secureStorage.getItem('blogger_access_token');
    this.blogId = await secureStorage.getItem('blogger_blog_id');
    if (this.accessToken) {
      useAuthStore.getState().setAuthenticated(true);
    }
  }

  async login(clientId: string) {
    try {
      const redirectUri = AuthSession.makeRedirectUri();
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: this.SCOPES,
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
      });

      const result = await request.promptAsync({ authorizationEndpoint: this.GOOGLE_AUTH_URL });

      if (result.type === 'success') {
        this.accessToken = result.params.access_token;
        await secureStorage.setItem('blogger_access_token', this.accessToken!);
        useAuthStore.getState().setAuthenticated(true);
        useLogsStore.getState().addLog({
          level: 'success',
          message: 'Blogger login successful',
          context: 'BloggerService',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async createPost(post: { title: string; content: string; labels?: string[] }, isDraft: boolean = false): Promise<BloggerPost> {
    if (!this.blogId) throw new Error('Blog ID not set');
    
    const response = await this.client.post(`/blogs/${this.blogId}/posts`, {
      ...post,
      kind: 'blogger#post',
      blog: { id: this.blogId },
    }, {
      params: { isDraft }
    });

    useLogsStore.getState().addLog({
      level: 'success',
      message: `Post created: ${post.title}`,
      context: 'BloggerService',
      data: { postId: response.data.id }
    });

    return response.data;
  }

  async updatePost(postId: string, post: Partial<BloggerPost>): Promise<BloggerPost> {
    if (!this.blogId) throw new Error('Blog ID not set');
    const response = await this.client.patch(`/blogs/${this.blogId}/posts/${postId}`, post);
    return response.data;
  }

  async deletePost(postId: string): Promise<void> {
    if (!this.blogId) throw new Error('Blog ID not set');
    await this.client.delete(`/blogs/${this.blogId}/posts/${postId}`);
  }

  async listPosts(maxResults: number = 10): Promise<BloggerPost[]> {
    if (!this.blogId) throw new Error('Blog ID not set');
    const response = await this.client.get(`/blogs/${this.blogId}/posts`, {
      params: { maxResults }
    });
    return response.data.items || [];
  }

  private handleError(error: AxiosError) {
    const status = error.response?.status;
    let message = 'Blogger API Error';
    
    if (status === 401) {
      message = 'Unauthorized: Please login again';
      useAuthStore.getState().setAuthenticated(false);
    } else if (status === 403) {
      message = 'Forbidden: Check your Blog ID and permissions';
    } else if (status === 404) {
      message = 'Blog not found';
    }

    useLogsStore.getState().addLog({
      level: 'error',
      message,
      context: 'BloggerService',
      data: { status, detail: error.response?.data }
    });
  }

  async logout() {
    this.accessToken = null;
    await secureStorage.removeItem('blogger_access_token');
    useAuthStore.getState().setAuthenticated(false);
  }
}

export const bloggerService = BloggerService.getInstance();
