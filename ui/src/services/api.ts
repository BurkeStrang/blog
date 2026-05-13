import type { Post } from '../app/AppContent';
import type { User } from '../shared/types/user';
import { postsCache, analyticsCache, cacheInvalidation } from './cache/CacheManager';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.brxstrng.com';

// API service class with caching
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic fetch method with error handling and caching
  private async fetch<T>(
    endpoint: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      cache?: boolean | 'posts' | 'analytics' | 'none';
      ttl?: number;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `${endpoint}-${JSON.stringify(options?.headers || {})}-${options?.body || ''}`;

    // Determine cache manager based on cache option
    let cacheManager = null;
    if (options?.cache === 'posts') {
      cacheManager = postsCache;
    } else if (options?.cache === 'analytics') {
      cacheManager = analyticsCache;
    } else if (options?.cache !== 'none' && options?.cache !== false && (!options?.method || options.method === 'GET')) {
      // Default to posts cache for GET requests
      cacheManager = postsCache;
    }

    // Check cache for GET requests
    if (cacheManager && (!options?.method || options.method === 'GET')) {
      const cached = cacheManager.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }


    try {
      // Extract ttl and cache from options to prevent them from being passed to fetch
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { ttl, cache, ...fetchOptions } = options || {};
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...fetchOptions,
      });

      // Always validate content type first, regardless of status
      const contentType = response.headers.get('content-type');
      
      // Clone response immediately for error debugging
      const responseClone = response.clone();
      
      if (!response.ok) {
        const errorText = await responseClone.text();
        console.error(`HTTP ${response.status} error for ${endpoint}:`, {
          status: response.status,
          contentType,
          errorText: errorText.substring(0, 500) + (errorText.length > 500 ? '...' : '')
        });
        
        // Handle authentication errors - trigger automatic sign out
        if (response.status === 401 || response.status === 403) {
          this.handleAuthenticationError();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Validate response is JSON before parsing
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await responseClone.text();
        console.error(`Non-JSON response for ${endpoint}:`, {
          contentType,
          responseLength: responseText.length,
          responseStart: responseText.substring(0, 200),
          responseEnd: responseText.substring(Math.max(0, responseText.length - 200)),
          position48527: responseText.substring(48520, 48535)
        });
        throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
      }

      let data;
      try {
        // Temporarily simplified - direct JSON parsing with basic validation
        const text = await response.text();
        
        // JSON.parse will handle validation - if it parses successfully, the JSON is valid
        
        data = JSON.parse(text);
      } catch (jsonError) {
        // Enhanced error logging 
        const responseText = await responseClone.text();
        console.error(`JSON parse error for ${endpoint}:`, {
          error: jsonError,
          contentType,
          responseLength: responseText.length,
          responseAt48527: responseText.substring(48520, 48535),
          responseAroundError: responseText.substring(48500, 48550)
        });
        throw jsonError;
      }

      // Cache successful GET responses
      if (cacheManager && (!options?.method || options.method === 'GET')) {
        const etag = response.headers.get('ETag');
        cacheManager.set(cacheKey, data, ttl, etag || undefined);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get all posts with caching (legacy format for backward compatibility)
  async getPosts(): Promise<Post[]> {
    const response = await this.fetch<{
      posts: Post[];
      pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      search?: string;
      sort?: { field: string; order: string };
    }>('/api/posts?limit=150', {
      cache: 'posts',
      ttl: 15 * 60 * 1000 // 15 minutes
    });
    return response.posts || [];
  }

  // Get all posts bypassing all caches (for immediate updates)
  async getPostsUncached(): Promise<Post[]> {
    // Add timestamp to URL to bypass server-side caches
    const timestamp = Date.now();
    const response = await this.fetch<{
      posts: Post[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/api/posts?limit=150&_t=${timestamp}`, {
      cache: false
    });
    return response.posts;
  }

  // Get posts with enhanced search, sort, and pagination
  async getPostsEnhanced(options?: {
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{
    posts: Post[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    search?: string;
    sort: {
      field: string;
      order: string;
    };
  }> {
    const params = new URLSearchParams();
    
    if (options?.search) params.append('search', options.search);
    if (options?.sort) params.append('sort', options.sort);
    if (options?.order) params.append('order', options.order);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const endpoint = `/api/posts${params.toString() ? '?' + params.toString() : ''}`;
    return this.fetch(endpoint);
  }

  // Get a single post by slug with caching
  async getPost(slug: string): Promise<Post> {
    return this.fetch<Post>(`/api/posts/${slug}`, {
      cache: 'posts',
      ttl: 15 * 60 * 1000 // 15 minutes
    });
  }

  // Track post view (no caching, invalidates analytics)
  async trackPostView(slug: string): Promise<void> {
    try {
      await this.fetch(`/api/posts/${slug}/view`, {
        method: 'POST',
        cache: 'none'
      });

      // Invalidate analytics cache since view count changed
      cacheInvalidation.invalidateAnalytics();
    } catch (error) {
      // Handle 404 errors silently - post might not exist in database yet
      if (error instanceof Error && error.message.includes('404')) {
        console.warn(`Post view tracking failed - post '${slug}' not found in database`);
        return; // Fail silently for 404s
      }

      // Non-critical operation, just log the error
      console.warn('Failed to track post view:', error);
    }
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: string }> {
    return this.fetch<{ status: string }>('/health');
  }

  // Authentication endpoints
  async getGoogleAuthUrl(): Promise<{ url: string }> {
    return this.fetch<{ url: string }>('/auth/google', {
      cache: 'none'
    });
  }

  async loginWithGoogle(code: string, state: string): Promise<{ token: string; user: User }> {
    return this.fetch<{ token: string; user: User }>(`/auth/google/callback?code=${code}&state=${state}`, {
      cache: 'none'
    });
  }

  // Check if JWT token is expired
  private isTokenExpired(token: string): boolean {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token has exp claim and if it's expired
      if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
      }
      
      // If no exp claim, consider token valid (shouldn't happen with proper JWT)
      return false;
    } catch (error) {
      // If we can't parse the token, consider it expired
      console.warn('Failed to parse JWT token:', error);
      return true;
    }
  }

  // Check token validity before making authenticated requests
  private checkTokenValidity(): boolean {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    if (this.isTokenExpired(token)) {
      this.handleAuthenticationError();
      return false;
    }
    
    return true;
  }

  // Handle authentication errors by clearing user data and dispatching event
  private handleAuthenticationError(): void {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Dispatch event to notify the app about authentication failure
    window.dispatchEvent(new CustomEvent('auth-error', {
      detail: { 
        message: 'Your session has expired. Please sign in again.',
        reason: 'token_expired'
      }
    }));
  }

  // Admin post management endpoints
  async createPost(post: { title: string; body: string; slug: string; previous?: string; next?: string; date?: Date }): Promise<Post> {
    if (!this.checkTokenValidity()) {
      throw new Error('Authentication required');
    }

    const token = localStorage.getItem('authToken');
    return this.fetch<Post>('/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(post),
    });
  }

  async updatePost(id: string, post: { title: string; body: string; slug: string; previous?: string; next?: string; date?: Date }): Promise<Post> {
    if (!this.checkTokenValidity()) {
      throw new Error('Authentication required');
    }

    const token = localStorage.getItem('authToken');
    return this.fetch<Post>(`/api/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(post),
    });
  }

  async deletePost(id: string): Promise<{ message: string; id: number }> {
    if (!this.checkTokenValidity()) {
      throw new Error('Authentication required');
    }

    const token = localStorage.getItem('authToken');
    return this.fetch<{ message: string; id: number }>(`/api/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Comment management endpoints
  async getComments(postId?: number): Promise<unknown[]> {
    const endpoint = postId ? `/api/comments?postId=${postId}` : '/api/comments';
    return this.fetch<unknown[]>(endpoint, {
      cache: 'analytics',
      ttl: 2 * 60 * 1000 // 2 minutes
    });
  }

  async createComment(commentData: unknown): Promise<unknown> {
    if (!this.checkTokenValidity()) {
      throw new Error('Authentication required');
    }

    const token = localStorage.getItem('authToken');
    try {
      const result = await this.fetch<unknown>('/api/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(commentData),
        cache: 'none'
      });

      // Invalidate comments and posts caches so comment counts are fresh
      cacheInvalidation.invalidateByType('analytics');
      cacheInvalidation.invalidatePostCaches();

      return result;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  }

  // Cache management methods
  getCacheStats() {
    return {
      posts: postsCache.getStats(),
      analytics: analyticsCache.getStats()
    };
  }

  clearAllCaches() {
    postsCache.clear();
    analyticsCache.clear();
  }

  // Logout helper to clear caches
  async logout(): Promise<void> {
    // Clear all user-specific caches on logout
    cacheInvalidation.invalidateByType('posts');
    cacheInvalidation.invalidateByType('analytics');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for testing or custom instances
export { ApiService };

// Error types for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Utility function to handle API errors
export const handleApiError = (error: unknown, fallbackMessage: string = 'An unexpected error occurred') => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
};
