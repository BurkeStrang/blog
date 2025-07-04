import { useState, useEffect, useCallback } from 'react';
import { apiService, handleApiError } from '../../services/api';
import type { Post } from '../../app/AppContent';

interface UsePostsApiState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePostsApi = (): UsePostsApiState => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedPosts = await apiService.getPosts();
      setPosts(fetchedPosts);
    } catch (err) {
      const errorMessage = handleApiError(err, 'Failed to load posts from API');
      setError(errorMessage);
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    refetch,
  };
};

// Hook for fetching a single post
interface UsePostApiState {
  post: Post | null;
  loading: boolean;
  error: string | null;
}

export const usePostApi = (slug: string): UsePostApiState => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fetchedPost = await apiService.getPost(slug);
        setPost(fetchedPost);
      } catch (err) {
        const errorMessage = handleApiError(err, `Failed to load post: ${slug}`);
        setError(errorMessage);
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  return {
    post,
    loading,
    error,
  };
};

// Hook for tracking post views
export const usePostViewTracker = () => {
  const trackView = useCallback(async (slug: string) => {
    try {
      await apiService.trackPostView(slug);
    } catch (err) {
      // Non-critical, just log
      console.warn('Failed to track post view:', err);
    }
  }, []);

  return { trackView };
};