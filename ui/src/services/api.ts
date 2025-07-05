import type { Post } from '../app/AppContent';
import type { User } from '../shared/types/user';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// API response types (for future use with wrapped responses)
// interface ApiResponse<T> {
//   data: T;
//   error?: string;
// }

// API service class with caching
class ApiService {
  private baseUrl: string;
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

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
      cache?: boolean; // Allow disabling cache for specific requests
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `${endpoint}-${JSON.stringify(options?.headers || {})}-${options?.body || ''}`;
    
    // Check cache for GET requests (unless cache is explicitly disabled)
    if ((!options?.method || options.method === 'GET') && options?.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data as T;
      }
    }
    
    try {
      const { cache, ...fetchOptions } = options || {};
      void cache; // Explicitly void the cache variable to avoid unused variable warning
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...fetchOptions,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache successful GET requests
      if ((!options?.method || options.method === 'GET') && options?.cache !== false) {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Method to clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get all posts
  async getPosts(): Promise<Post[]> {
    return this.fetch<Post[]>('/api/posts');
  }

  // Get a single post by slug
  async getPost(slug: string): Promise<Post> {
    return this.fetch<Post>(`/api/posts/${slug}`);
  }

  // Track post view (if the Go API supports this)
  async trackPostView(slug: string): Promise<void> {
    try {
      await this.fetch(`/api/posts/${slug}/view`, {
        method: 'POST',
      });
    } catch (error) {
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
    return this.fetch<{ url: string }>('/auth/google');
  }

  async loginWithGoogle(code: string, state: string): Promise<{ token: string; user: User }> {
    return this.fetch<{ token: string; user: User }>(`/auth/google/callback?code=${code}&state=${state}`);
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
