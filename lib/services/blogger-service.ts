import axios, { AxiosInstance, AxiosError } from 'axios';
import { useLogsStore } from '@/lib/stores/logs.store';
import { secureStorage } from '@/lib/_core/secure-store';

export interface BloggerPost {
  id: string;
  title: string;
  content: string;
  published: string;
  updated: string;
  url: string;
  status: 'LIVE' | 'DRAFT';
  labels?: string[];
}

export interface CreatePostRequest {
  title: string;
  content: string;
  labels?: string[];
  isDraft?: boolean;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  labels?: string[];
}

export class BloggerService {
  private static instance: BloggerService;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private blogId: string | null = null;

  private constructor() {
    this.client = axios.create({
      baseURL: 'https://www.googleapis.com/blogger/v3',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for SSL-only and auth
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      // Ensure HTTPS
      if (config.url && !config.url.startsWith('https')) {
        config.url = config.url.replace(/^http:/, 'https:');
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
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

  /**
   * Initialize the service with access token and blog ID
   */
  async initialize(accessToken: string, blogId: string): Promise<void> {
    try {
      this.accessToken = accessToken;
      this.blogId = blogId;

      // Store token securely
      await secureStorage.setItem('blogger_access_token', accessToken);
      await secureStorage.setItem('blogger_blog_id', blogId);

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Blogger service initialized',
        context: 'BloggerService',
        data: { blogId },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to initialize Blogger service',
        context: 'BloggerService',
        data: { error: errorMessage },
      });
      throw error;
    }
  }

  /**
   * Load stored credentials
   */
  async loadCredentials(): Promise<boolean> {
    try {
      const token = await secureStorage.getItem('blogger_access_token');
      const blogId = await secureStorage.getItem('blogger_blog_id');

      if (token && blogId) {
        this.accessToken = token;
        this.blogId = blogId;
        return true;
      }
      return false;
    } catch (error) {
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to load Blogger credentials',
        context: 'BloggerService',
      });
      return false;
    }
  }

  /**
   * Validate connection to Blogger API
   */
  async validateConnection(): Promise<boolean> {
    try {
      if (!this.accessToken || !this.blogId) {
        return false;
      }

      const response = await this.client.get(`/blogs/${this.blogId}`);
      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Blogger connection validated',
        context: 'BloggerService',
      });
      return !!response.data;
    } catch (error) {
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Blogger connection validation failed',
        context: 'BloggerService',
      });
      return false;
    }
  }

  /**
   * Create a new blog post
   */
  async createPost(request: CreatePostRequest): Promise<BloggerPost> {
    try {
      if (!this.blogId) {
        throw new Error('Blog ID not set');
      }

      const payload = {
        title: request.title,
        content: request.content,
        labels: request.labels || [],
      };

      const url = request.isDraft
        ? `/blogs/${this.blogId}/posts?isDraft=true`
        : `/blogs/${this.blogId}/posts`;

      const response = await this.client.post(url, payload);

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Blog post created',
        context: 'BloggerService',
        data: { postId: response.data.id, isDraft: request.isDraft },
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to create blog post',
        context: 'BloggerService',
        data: { error: errorMessage, title: request.title },
      });
      throw error;
    }
  }

  /**
   * Update an existing blog post
   */
  async updatePost(
    postId: string,
    request: UpdatePostRequest
  ): Promise<BloggerPost> {
    try {
      if (!this.blogId) {
        throw new Error('Blog ID not set');
      }

      const payload = {
        title: request.title,
        content: request.content,
        labels: request.labels || [],
      };

      const response = await this.client.put(
        `/blogs/${this.blogId}/posts/${postId}`,
        payload
      );

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Blog post updated',
        context: 'BloggerService',
        data: { postId },
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to update blog post',
        context: 'BloggerService',
        data: { error: errorMessage, postId },
      });
      throw error;
    }
  }

  /**
   * Publish a draft post
   */
  async publishPost(postId: string): Promise<BloggerPost> {
    try {
      if (!this.blogId) {
        throw new Error('Blog ID not set');
      }

      const response = await this.client.post(
        `/blogs/${this.blogId}/posts/${postId}/publish`
      );

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Blog post published',
        context: 'BloggerService',
        data: { postId },
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to publish blog post',
        context: 'BloggerService',
        data: { error: errorMessage, postId },
      });
      throw error;
    }
  }

  /**
   * Get a specific blog post
   */
  async getPost(postId: string): Promise<BloggerPost> {
    try {
      if (!this.blogId) {
        throw new Error('Blog ID not set');
      }

      const response = await this.client.get(
        `/blogs/${this.blogId}/posts/${postId}`
      );

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to get blog post',
        context: 'BloggerService',
        data: { error: errorMessage, postId },
      });
      throw error;
    }
  }

  /**
   * Get all blog posts
   */
  async listPosts(maxResults: number = 10): Promise<BloggerPost[]> {
    try {
      if (!this.blogId) {
        throw new Error('Blog ID not set');
      }

      const response = await this.client.get(
        `/blogs/${this.blogId}/posts?maxResults=${maxResults}`
      );

      return response.data.items || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to list blog posts',
        context: 'BloggerService',
        data: { error: errorMessage },
      });
      throw error;
    }
  }

  /**
   * Delete a blog post
   */
  async deletePost(postId: string): Promise<void> {
    try {
      if (!this.blogId) {
        throw new Error('Blog ID not set');
      }

      await this.client.delete(`/blogs/${this.blogId}/posts/${postId}`);

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Blog post deleted',
        context: 'BloggerService',
        data: { postId },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to delete blog post',
        context: 'BloggerService',
        data: { error: errorMessage, postId },
      });
      throw error;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): void {
    const status = error.response?.status;
    const data = error.response?.data as any;

    let errorMessage = 'Unknown error';
    let level: 'warning' | 'error' = 'error';

    switch (status) {
      case 401:
        errorMessage = 'Unauthorized: Access token expired or invalid';
        break;
      case 403:
        errorMessage = 'Forbidden: Insufficient permissions';
        break;
      case 404:
        errorMessage = 'Not found: Blog or post not found';
        level = 'warning';
        break;
      case 429:
        errorMessage = 'Rate limited: Too many requests';
        break;
      case 500:
        errorMessage = 'Server error: Blogger API error';
        break;
      default:
        errorMessage = data?.error?.message || error.message || 'Unknown error';
    }

    useLogsStore.getState().addLog({
      level,
      message: `Blogger API Error: ${errorMessage}`,
      context: 'BloggerService',
      data: {
        status,
        error: data?.error?.message,
      },
    });
  }

  /**
   * Clear credentials
   */
  async clearCredentials(): Promise<void> {
    try {
      await secureStorage.removeItem('blogger_access_token');
      await secureStorage.removeItem('blogger_blog_id');
      this.accessToken = null;
      this.blogId = null;

      useLogsStore.getState().addLog({
        level: 'success',
        message: 'Blogger credentials cleared',
        context: 'BloggerService',
      });
    } catch (error) {
      useLogsStore.getState().addLog({
        level: 'error',
        message: 'Failed to clear Blogger credentials',
        context: 'BloggerService',
      });
    }
  }
}

export const bloggerService = BloggerService.getInstance();
