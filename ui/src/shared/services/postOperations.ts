import type { Post } from '../../app/AppContent';

interface PostOperationsConfig {
  apiBaseUrl: string;
  onPostsChange?: (posts: Post[]) => void;
}

/**
 * Centralized post operations to eliminate duplicate CRUD logic
 * Used by: AppContent, PostDetail, SearchContext
 */
export class PostOperations {
  private config: PostOperationsConfig;

  constructor(config: PostOperationsConfig) {
    this.config = config;
  }

  // Create a new post
  async createPost(postData: Omit<Post, 'id' | 'created_at' | 'updated_at'>): Promise<Post> {
    const token = localStorage.getItem('github_token');
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${this.config.apiBaseUrl}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      throw new Error('Failed to create post');
    }

    const newPost = await response.json();
    this.notifyPostsChanged();
    return newPost;
  }

  // Update existing post
  async updatePost(id: string, postData: Partial<Post>): Promise<Post> {
    const token = localStorage.getItem('github_token');
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${this.config.apiBaseUrl}/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      throw new Error('Failed to update post');
    }

    const updatedPost = await response.json();
    this.notifyPostsChanged();
    return updatedPost;
  }

  // Delete post
  async deletePost(id: string): Promise<void> {
    const token = localStorage.getItem('github_token');
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${this.config.apiBaseUrl}/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete post');
    }

    this.notifyPostsChanged();
  }

  // Fetch all posts
  async fetchPosts(): Promise<Post[]> {
    const response = await fetch(`${this.config.apiBaseUrl}/posts`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }

    return response.json();
  }

  // Fetch single post by slug
  async fetchPost(slug: string): Promise<Post> {
    const response = await fetch(`${this.config.apiBaseUrl}/posts/${slug}`);
    
    if (!response.ok) {
      throw new Error('Post not found');
    }

    return response.json();
  }

  // Track post view/interaction
  async trackPostView(slug: string): Promise<void> {
    try {
      await fetch(`${this.config.apiBaseUrl}/posts/${slug}/view`, {
        method: 'POST'
      });
    } catch (error) {
      // Non-critical, don't throw
      console.warn('Failed to track post view:', error);
    }
  }

  // Search posts
  async searchPosts(query: string): Promise<Post[]> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/posts/search?q=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error('Search failed');
    }

    return response.json();
  }

  // Get trending posts
  async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/posts/trending?limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch trending posts');
    }

    return response.json();
  }

  // Private method to notify about post changes
  private notifyPostsChanged(): void {
    if (this.config.onPostsChange) {
      // Refetch posts and notify
      this.fetchPosts().then(posts => {
        this.config.onPostsChange!(posts);
      }).catch(error => {
        console.error('Failed to refresh posts:', error);
      });
    }
  }
}

// Hook wrapper for easier React integration
export const usePostOperations = (config: PostOperationsConfig) => {
  const postOps = new PostOperations(config);

  return {
    createPost: postOps.createPost.bind(postOps),
    updatePost: postOps.updatePost.bind(postOps),
    deletePost: postOps.deletePost.bind(postOps),
    fetchPosts: postOps.fetchPosts.bind(postOps),
    fetchPost: postOps.fetchPost.bind(postOps),
    trackPostView: postOps.trackPostView.bind(postOps),
    searchPosts: postOps.searchPosts.bind(postOps),
    getTrendingPosts: postOps.getTrendingPosts.bind(postOps)
  };
};