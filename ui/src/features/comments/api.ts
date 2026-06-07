import type { Comment, CreateCommentRequest, CommentLikeResponse } from "./model";

class CommentService {
  private baseURL = `${import.meta.env.VITE_API_URL || 'https://api.brxstrng.com'}/api`;

  async getComments(postId: number): Promise<Comment[]> {
    try {
      const response = await fetch(`${this.baseURL}/comments?post_id=${postId}`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  async createComment(comment: CreateCommentRequest): Promise<Comment> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required to post comments');
      }

      const response = await fetch(`${this.baseURL}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(comment),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Comment creation failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Failed to create comment: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async likeComment(commentOrId: Comment | number | string): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required to like comments');
      }

      // Determine the ID parameter and post ID based on input type
      let idParam: string;
      let postId: number | undefined;
      if (typeof commentOrId === 'object') {
        // It's a Comment object - use cosmos_id if available
        idParam = commentOrId.cosmos_id || `comment-${commentOrId.id}`;
        postId = commentOrId.post_id;
      } else if (typeof commentOrId === 'string' && commentOrId.startsWith('comment-')) {
        // Already a properly formatted ID
        idParam = commentOrId;
      } else {
        // It's a number or string without prefix
        idParam = `comment-${commentOrId}`;
      }

      // Include postId as query parameter if available for faster lookup
      const url = postId !== undefined
        ? `${this.baseURL}/comments/${idParam}/like?postId=post-${postId}`
        : `${this.baseURL}/comments/${idParam}/like`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Like failed:', {
          status: response.status,
          statusText: response.statusText,
          url,
        });
        // Return specific error for 409 Conflict (already liked)
        if (response.status === 409) {
          const error = new Error('Already liked this comment');
          (error as Error & { status: number }).status = 409;
          throw error;
        }
        throw new Error(`Failed to like comment: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  }

  async unlikeComment(commentOrId: Comment | number | string): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required to unlike comments');
      }

      // Determine the ID parameter and post ID based on input type
      let idParam: string;
      let postId: number | undefined;
      if (typeof commentOrId === 'object') {
        // It's a Comment object - use cosmos_id if available
        idParam = commentOrId.cosmos_id || `comment-${commentOrId.id}`;
        postId = commentOrId.post_id;
      } else if (typeof commentOrId === 'string' && commentOrId.startsWith('comment-')) {
        // Already a properly formatted ID
        idParam = commentOrId;
      } else {
        // It's a number or string without prefix
        idParam = `comment-${commentOrId}`;
      }

      // Include postId as query parameter if available for faster lookup
      const url = postId !== undefined
        ? `${this.baseURL}/comments/${idParam}/like?postId=post-${postId}`
        : `${this.baseURL}/comments/${idParam}/like`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Unlike failed:', {
          status: response.status,
          statusText: response.statusText,
          url,
        });
        // Return specific error for 404 Not Found (not liked)
        if (response.status === 404) {
          const error = new Error('Comment was not liked');
          (error as Error & { status: number }).status = 404;
          throw error;
        }
        throw new Error(`Failed to unlike comment: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Error unliking comment:', error);
      throw error;
    }
  }

  async getCommentLikes(commentOrId: Comment | number | string): Promise<CommentLikeResponse> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Determine the ID parameter and post ID based on input type
      let idParam: string;
      let postId: number | undefined;
      if (typeof commentOrId === 'object') {
        // It's a Comment object - use cosmos_id if available
        idParam = commentOrId.cosmos_id || `comment-${commentOrId.id}`;
        postId = commentOrId.post_id;
      } else if (typeof commentOrId === 'string' && commentOrId.startsWith('comment-')) {
        // Already a properly formatted ID
        idParam = commentOrId;
      } else {
        // It's a number or string without prefix
        idParam = `comment-${commentOrId}`;
      }

      // Include postId as query parameter if available for faster lookup
      const url = postId !== undefined
        ? `${this.baseURL}/comments/${idParam}/likes?postId=post-${postId}`
        : `${this.baseURL}/comments/${idParam}/likes`;

      const response = await fetch(url, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get comment likes: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting comment likes:', error);
      throw error;
    }
  }

  async updateComment(commentOrId: Comment | number | string, content: string): Promise<Comment> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required to update comments');
      }

      // Determine the ID parameter and post ID based on input type
      let idParam: string;
      let postId: number | undefined;
      if (typeof commentOrId === 'object') {
        // It's a Comment object - use cosmos_id if available
        idParam = commentOrId.cosmos_id || `comment-${commentOrId.id}`;
        postId = commentOrId.post_id;
      } else if (typeof commentOrId === 'string' && commentOrId.startsWith('comment-')) {
        // Already a properly formatted ID
        idParam = commentOrId;
      } else {
        // It's a number or string without prefix
        idParam = `comment-${commentOrId}`;
      }

      // Include postId as query parameter if available for faster lookup
      const url = postId !== undefined
        ? `${this.baseURL}/comments/${idParam}?postId=post-${postId}`
        : `${this.baseURL}/comments/${idParam}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update comment: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentOrId: Comment | number | string): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required to delete comments');
      }

      // Determine the ID parameter and post ID based on input type
      let idParam: string;
      let postId: number | undefined;
      if (typeof commentOrId === 'object') {
        // It's a Comment object - use cosmos_id if available
        idParam = commentOrId.cosmos_id || `comment-${commentOrId.id}`;
        postId = commentOrId.post_id;
      } else if (typeof commentOrId === 'string' && commentOrId.startsWith('comment-')) {
        // Already a properly formatted ID
        idParam = commentOrId;
      } else {
        // It's a number or string without prefix
        idParam = `comment-${commentOrId}`;
      }

      // Include postId as query parameter if available for faster lookup
      const url = postId !== undefined
        ? `${this.baseURL}/comments/${idParam}?postId=post-${postId}`
        : `${this.baseURL}/comments/${idParam}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete comment: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async replyToComment(parentCommentOrId: Comment | number | string, reply: { content: string }): Promise<Comment> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required to reply to comments');
      }

      // Determine the ID parameter and post ID based on input type
      let idParam: string;
      let postId: number | undefined;
      if (typeof parentCommentOrId === 'object') {
        // It's a Comment object - use cosmos_id if available
        idParam = parentCommentOrId.cosmos_id || `comment-${parentCommentOrId.id}`;
        postId = parentCommentOrId.post_id;
      } else if (typeof parentCommentOrId === 'string' && parentCommentOrId.startsWith('comment-')) {
        // Already a properly formatted ID
        idParam = parentCommentOrId;
      } else {
        // It's a number or string without prefix
        idParam = `comment-${parentCommentOrId}`;
      }

      // Include postId as query parameter if available for faster lookup
      const url = postId !== undefined
        ? `${this.baseURL}/comments/${idParam}/reply?postId=post-${postId}`
        : `${this.baseURL}/comments/${idParam}/reply`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(reply),
      });

      if (!response.ok) {
        throw new Error(`Failed to reply to comment: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error replying to comment:', error);
      throw error;
    }
  }
}

export const commentService = new CommentService();
