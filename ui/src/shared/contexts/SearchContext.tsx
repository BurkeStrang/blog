import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { Post } from "../../app/AppContent";
import { apiService } from "../../services/api";

export type SortCriteria = "pageViews" | "date" | "trending";
export type SortDirection = "asc" | "desc";

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
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

// Calculate trending score based on recent views and recency
const calculateTrendingScore = (post: Post): number => {
  const recentViews = post.recentViews || 0;
  // Base score from recent views
  const score = recentViews;
  return score;
};

// Sorting functions
const sortPosts = (
  posts: Post[],
  sortBy: SortCriteria,
  direction: SortDirection,
): Post[] => {
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
      const aTrending = calculateTrendingScore(a);
      const bTrending = calculateTrendingScore(b);
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

  // Track timeouts for proper cleanup
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Debounce search query - reduced from 1000ms to 500ms for better responsiveness
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

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

  // Track post views and update trending data
  const trackPostView = useCallback((slug: string) => {
    // Update local state
    setAllPosts((prevPosts) => {
      return prevPosts.map((post) => {
        if (post.slug === slug) {
          const now = new Date();
          const lastViewed = post.lastViewed ? new Date(post.lastViewed) : null;
          
          // Only increment recent views if it's been more than 5 minutes since last view
          // to avoid inflating views from page refreshes
          const shouldIncrementView = !lastViewed || 
            (now.getTime() - lastViewed.getTime()) > 5 * 60 * 1000;
          
          return {
            ...post,
            lastViewed: now,
            recentViews: shouldIncrementView ? (post.recentViews || 0) + 1 : post.recentViews,
          };
        }
        return post;
      });
    });
    
    // Also track the view in the API
    apiService.trackPostView(slug).catch((error) => {
      console.warn('Failed to track post view in API:', error);
    });
  }, []);

  // Memoize filtered and sorted posts to avoid unnecessary recalculations
  const filteredPosts = useMemo(() => {
    const searched = searchPosts(allPosts, debouncedQuery);
    return sortPosts(searched, sortBy, sortDirection);
  }, [allPosts, debouncedQuery, sortBy, sortDirection]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, sortBy, sortDirection]);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      filteredPosts,
      setAllPosts,
      sortBy,
      setSortBy,
      sortDirection,
      setSortDirection,
      toggleSortDirection,
      cycleSortCriteria,
      isSorting,
      trackPostView,
      currentPage,
      setCurrentPage,
    }),
    [query, filteredPosts, sortBy, sortDirection, isSorting, trackPostView, currentPage],
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

