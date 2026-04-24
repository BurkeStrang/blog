import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
} from "react";
import type { Post } from "../../app/AppContent";
import { apiService } from "../../services/api";

export type SortCriteria = "pageViews" | "date" | "trending";
export type SortDirection = "asc" | "desc";

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  allPosts: Post[];
  filteredPosts: Post[];
  setAllPosts: (posts: Post[]) => void;
  sortBy: SortCriteria;
  setSortBy: (criteria: SortCriteria) => void;
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  toggleSortDirection: () => void;
  cycleSortCriteria: () => void;
  isSorting: boolean;
  trackPostView: (slug: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface SearchProviderProps {
  children: React.ReactNode;
}

// Helper function to strip HTML tags and search full text
const stripHtmlTags = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Full-text search function
const searchPosts = (posts: Post[], query: string): Post[] => {
  if (!query.trim()) {
    return posts;
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/);

  return posts.filter((post) => {
    const titleText = post.title.toLowerCase();
    const bodyText = stripHtmlTags(post.body).toLowerCase();
    const combinedText = `${titleText} ${bodyText}`;

    // All search terms must be found in the combined text
    return searchTerms.every((term) => combinedText.includes(term));
  });
};

// Calculate trending score based on recent views, recency, and comment count
const calculateTrendingScore = (post: Post): number => {
  const recentViews = post.recentViews || 0;
  const commentCount = post.commentCount || 0;
  
  // Base score from recent views (weight: 1x)
  let score = recentViews;
  
  // Add comment count with higher weight (weight: 3x)
  score += commentCount * 3;
  
  const now = Date.now();
  if (post.lastViewed) {
    // If last viewed is more than 24 hours ago, reduce score
    const hoursSinceLastViewed =
      (now - new Date(post.lastViewed).getTime()) / (1000 * 60 * 60);
    // Reduce score based on how stale the view is
    score -= Math.floor(hoursSinceLastViewed / 24) * recentViews;
  }
  
  return score;
};

// Sorting functions - optimized to reduce re-renders
const sortPosts = (
  posts: Post[],
  sortBy: SortCriteria,
  direction: SortDirection,
  trendingSnapshot?: Post[],
): Post[] => {
  // Remove frequent debug logging that causes re-renders
  
  const sorted = [...posts].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "pageViews") {
      const aViews = a.pageViews || 0;
      const bViews = b.pageViews || 0;
      comparison = aViews - bViews;
    } else if (sortBy === "date") {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      comparison = aDate - bDate;
    } else if (sortBy === "trending") {
      // Use snapshot for trending to prevent re-sorting during session
      const snapshotA = trendingSnapshot?.find((p) => p.slug === a.slug) || a;
      const snapshotB = trendingSnapshot?.find((p) => p.slug === b.slug) || b;
      const aTrending = calculateTrendingScore(snapshotA);
      const bTrending = calculateTrendingScore(snapshotB);
      comparison = aTrending - bTrending;
    }

    return direction === "desc" ? -comparison : comparison;
  });


  return sorted;
};

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [sortBy, setSortBy] = useState<SortCriteria>("trending");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isSorting, setIsSorting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Keep a snapshot of initial posts for trending calculation to prevent re-sorting during session
  const [initialPostsSnapshot, setInitialPostsSnapshot] = useState<Post[]>([]);

  // Track timeouts for proper cleanup
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Debounce search query - reduced from 1000ms to 300ms for better responsiveness
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  // Toggle sort direction - memoize with useCallback
  const toggleSortDirection = useCallback(() => {
    setIsSorting(true);
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    // Reset sorting state after animation time
    const timeoutId = setTimeout(() => setIsSorting(false), 1000);
    timeoutRefs.current.add(timeoutId);
  }, []);

  // Cycle through sort criteria - memoize with useCallback
  const cycleSortCriteria = useCallback(() => {
    setIsSorting(true);
    setSortBy((prev) => {
      if (prev === "pageViews") return "date";
      if (prev === "date") return "trending";
      return "pageViews";
    });
    // Reset sorting state after animation time
    const timeoutId = setTimeout(() => setIsSorting(false), 1000);
    timeoutRefs.current.add(timeoutId);
  }, []);

  // Track recent API calls to prevent duplicates (for React.StrictMode and rapid navigation)
  const recentApiCalls = useRef<Map<string, number>>(new Map());

  // Cleanup old API call timestamps periodically
  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        recentApiCalls.current.forEach((timestamp, slug) => {
          if (timestamp < fiveMinutesAgo) {
            recentApiCalls.current.delete(slug);
          }
        });
      },
      5 * 60 * 1000,
    ); // Run cleanup every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Track post views and update trending data
  const trackPostView = useCallback((slug: string) => {
    const now = Date.now();
    const lastApiCall = recentApiCalls.current.get(slug) || 0;
    const timeSinceLastCall = now - lastApiCall;

    // Prevent duplicate API calls within 5 minutes (same logic as local state)
    const shouldCallAPI = timeSinceLastCall > 5 * 60 * 1000;

    // Update local state (optimistic update)
    // Always increment on each navigation for immediate UI feedback
    setAllPosts((prevPosts) => {
      return prevPosts.map((post) => {
        if (post.slug === slug) {
          return {
            ...post,
            lastViewed: new Date(now),
            recentViews: (post.recentViews || 0) + 1,
            pageViews: (post.pageViews || 0) + 1,
          };
        }
        return post;
      });
    });

    // Only call API if enough time has passed since last call for this slug
    if (shouldCallAPI) {
      recentApiCalls.current.set(slug, now);
      apiService.trackPostView(slug).catch((error) => {
        // Only warn for non-404 errors since 404s are expected for missing posts
        if (!error?.message?.includes('404')) {
          console.warn("Failed to track post view in API:", error);
          // Remove from recent calls on error so it can be retried
          recentApiCalls.current.delete(slug);
        }
      });
    }
  }, []);

  // Use deferred values for expensive operations to prevent blocking UI
  const deferredSortBy = useDeferredValue(sortBy);
  const deferredSortDirection = useDeferredValue(sortDirection);

  // Memoize filtered and sorted posts to avoid unnecessary recalculations
  const filteredPosts = useMemo(() => {
    const searched = searchPosts(allPosts, debouncedQuery);
    const result = sortPosts(
      searched,
      deferredSortBy,
      deferredSortDirection,
      initialPostsSnapshot,
    );
    
    
    return result;
  }, [
    allPosts,
    debouncedQuery,
    deferredSortBy,
    deferredSortDirection,
    initialPostsSnapshot,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, sortBy, sortDirection]);

  // Enhanced setAllPosts that captures initial snapshot for trending
  const setAllPostsWithSnapshot = useCallback(
    (posts: Post[]) => {
      setAllPosts(posts);
      
      // If we have a query that hasn't been debounced yet, apply it immediately
      if (query && query !== debouncedQuery) {
        setDebouncedQuery(query);
      }
      
      // Only set snapshot if it's empty (first load) - use callback to avoid dependency
      setInitialPostsSnapshot(prevSnapshot => {
        if (prevSnapshot.length === 0) {
          return posts;
        }
        return prevSnapshot;
      });
    },
    [debouncedQuery, sortBy, query], // Add dependencies to track filter state
  );

  // Split context value to prevent unnecessary re-renders
  const stableHandlers = useMemo(() => ({
    setQuery,
    setAllPosts: setAllPostsWithSnapshot,
    setSortBy,
    setSortDirection,
    toggleSortDirection,
    cycleSortCriteria,
    trackPostView,
    setCurrentPage,
  }), [setAllPostsWithSnapshot, toggleSortDirection, cycleSortCriteria, trackPostView]);

  const value = useMemo(
    () => ({
      query,
      allPosts,
      filteredPosts,
      sortBy,
      sortDirection,
      isSorting,
      currentPage,
      ...stableHandlers,
    }),
    [
      query,
      allPosts,
      filteredPosts,
      sortBy,
      sortDirection,
      isSorting,
      currentPage,
      stableHandlers,
    ],
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};
