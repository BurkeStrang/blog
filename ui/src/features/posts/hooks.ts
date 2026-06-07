import { useState, useEffect, useCallback } from "react";
import { handleApiError } from "../../shared/services/api";
import { fetchPost, fetchPosts, trackPostView } from "./api";
import type { Post } from "./model";

interface UsePostsState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePosts = (): UsePostsState => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPosts(await fetchPosts());
    } catch (err) {
      setError(handleApiError(err, "Failed to load posts from API"));
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, error, refetch };
};

interface UsePostState {
  post: Post | null;
  loading: boolean;
  error: string | null;
}

export const usePost = (slug: string): UsePostState => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setPost(await fetchPost(slug));
      } catch (err) {
        setError(handleApiError(err, `Failed to load post: ${slug}`));
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  return { post, loading, error };
};

export const usePostViewTracker = () => {
  const track = useCallback(async (slug: string) => {
    try {
      await trackPostView(slug);
    } catch (err) {
      console.warn("Failed to track post view:", err);
    }
  }, []);

  return { trackView: track };
};
