import type { Post } from '../app/AppContent';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// API response types (for future use with wrapped responses)
// interface ApiResponse<T> {
//   data: T;
//   error?: string;
// }

// API service class
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic fetch method with error handling
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
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