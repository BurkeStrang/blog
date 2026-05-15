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

// ── context types ─────────────────────────────────────────────────────────────

interface PostsDataContextType {
  allPosts: Post[];
  filteredPosts: Post[];
  setAllPosts: (posts: Post[]) => void;
  updatePost: (postId: number, updates: Partial<Post>) => void;
  isSorting: boolean;
  trackPostView: (slug: string) => void;
}

interface SearchQueryContextType {
  query: string;
  setQuery: (query: string) => void;
}

interface SortContextType {
  sortBy: SortCriteria;
  setSortBy: (criteria: SortCriteria) => void;
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  toggleSortDirection: () => void;
  cycleSortCriteria: () => void;
  isSorting: boolean;
}

interface PaginationContextType {
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

// ── contexts ──────────────────────────────────────────────────────────────────

const PostsDataContext = createContext<PostsDataContextType | undefined>(undefined);
const SearchQueryContext = createContext<SearchQueryContextType | undefined>(undefined);
const SortContext = createContext<SortContextType | undefined>(undefined);
const PaginationContext = createContext<PaginationContextType | undefined>(undefined);

// ── pure helpers (defined outside to avoid re-creation) ───────────────────────

const SERVER_SEARCH_MIN_CHARS = 3;

const stripHtmlTags = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const postSearchText = (post: Post): string =>
  `${post.title} ${post.body || ""}`.toLowerCase();

const searchPosts = (posts: Post[], query: string): Post[] => {
  if (!query.trim()) return posts;
  const terms = query.toLowerCase().trim().split(/\s+/);
  return posts.filter((post) => {
    const text = postSearchText(post);
    return terms.every((t) => text.includes(t));
  });
};

// Tiered match rank. Lower wins:
//   0: literal phrase in title
//   1: literal phrase in body
//   2: all words present in title
//   3: all words present only in body
const literalMatchRank = (post: Post, query: string): number => {
  const phrase = query.toLowerCase().trim();
  if (!phrase) return 0;
  const title = post.title.toLowerCase();
  const body = stripHtmlTags(post.body || "").toLowerCase();
  const isMultiWord = /\s/.test(phrase);

  if (isMultiWord) {
    if (title.includes(phrase)) return 0;
    if (body.includes(phrase)) return 1;
  }

  const terms = phrase.split(/\s+/);
  if (terms.every((t) => title.includes(t))) return 2;
  return 3;
};

const calculateTrendingScore = (post: Post): number => {
  const recentViews = post.recentViews || 0;
  let score = recentViews + (post.commentCount || 0) * 3;
  if (post.lastViewed) {
    const hoursSince = (Date.now() - new Date(post.lastViewed).getTime()) / (1000 * 60 * 60);
    score -= Math.floor(hoursSince / 24) * recentViews;
  }
  return score;
};

const sortPosts = (
  posts: Post[],
  sortBy: SortCriteria,
  direction: SortDirection,
  snapshot?: Post[],
  query?: string,
): Post[] =>
  [...posts].sort((a, b) => {
    if (query && query.trim()) {
      const rankA = literalMatchRank(a, query);
      const rankB = literalMatchRank(b, query);
      if (rankA !== rankB) return rankA - rankB;
    }
    let cmp = 0;
    if (sortBy === "pageViews") {
      cmp = (a.pageViews || 0) - (b.pageViews || 0);
    } else if (sortBy === "date") {
      cmp = (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0);
    } else {
      const sa = snapshot?.find((p) => p.slug === a.slug) ?? a;
      const sb = snapshot?.find((p) => p.slug === b.slug) ?? b;
      cmp = calculateTrendingScore(sa) - calculateTrendingScore(sb);
    }
    return direction === "desc" ? -cmp : cmp;
  });

// ── provider ──────────────────────────────────────────────────────────────────

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [allPosts, setAllPostsRaw] = useState<Post[]>([]);
  const [sortBy, setSortBy] = useState<SortCriteria>("trending");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isSorting, setIsSorting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [initialPostsSnapshot, setInitialPostsSnapshot] = useState<Post[]>([]);
  const [serverSearchPosts, setServerSearchPosts] = useState<Post[] | null>(null);
  const [serverSearchQuery, setServerSearchQuery] = useState("");

  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const recentApiCalls = useRef<Map<string, number>>(new Map());

  // Debounce search query
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current.clear();
    };
  }, []);

  // Cleanup stale API call timestamps
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - 5 * 60 * 1000;
      recentApiCalls.current.forEach((ts, slug) => {
        if (ts < cutoff) recentApiCalls.current.delete(slug);
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Reset pagination when search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, sortBy, sortDirection]);

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim();
    if (normalizedQuery.length < SERVER_SEARCH_MIN_CHARS) {
      setServerSearchPosts(null);
      setServerSearchQuery("");
      return;
    }

    let active = true;
    apiService
      .getPostsEnhanced({ search: normalizedQuery })
      .then((response) => {
        if (!active) return;
        setServerSearchPosts(response.posts || []);
        setServerSearchQuery(normalizedQuery);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Server post search failed:", error);
        setServerSearchPosts(null);
        setServerSearchQuery("");
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Stable setter that captures initial snapshot for trending
  const setAllPosts = useCallback((posts: Post[]) => {
    setAllPostsRaw(posts);
    setInitialPostsSnapshot((prev) => (prev.length === 0 ? posts : prev));
  }, []);

  // Surgical update for a single post — uses functional form, no stale closure
  const updatePost = useCallback((postId: number, updates: Partial<Post>) => {
    setAllPostsRaw((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates } : p))
    );
  }, []);

  const toggleSortDirection = useCallback(() => {
    setIsSorting(true);
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    const id = setTimeout(() => setIsSorting(false), 1000);
    timeoutRefs.current.add(id);
  }, []);

  const cycleSortCriteria = useCallback(() => {
    setIsSorting(true);
    setSortBy((prev) => (prev === "pageViews" ? "date" : prev === "date" ? "trending" : "pageViews"));
    const id = setTimeout(() => setIsSorting(false), 1000);
    timeoutRefs.current.add(id);
  }, []);

  const trackPostView = useCallback((slug: string) => {
    const now = Date.now();
    const lastCall = recentApiCalls.current.get(slug) ?? 0;
    const shouldCallApi = now - lastCall > 5 * 60 * 1000;

    const updateLocalViewCount = () => {
      setAllPostsRaw((prev) =>
        prev.map((p) =>
          p.slug === slug
            ? {
                ...p,
                lastViewed: new Date(now),
                recentViews: (p.recentViews || 0) + 1,
                pageViews: (p.pageViews || 0) + 1,
              }
            : p,
        ),
      );
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        setTimeout(updateLocalViewCount, 0);
      });
    } else {
      setTimeout(updateLocalViewCount, 0);
    }

    if (shouldCallApi) {
      recentApiCalls.current.set(slug, now);
      apiService.trackPostView(slug);
    }
  }, []);

  const deferredSortBy = useDeferredValue(sortBy);
  const deferredSortDirection = useDeferredValue(sortDirection);
  const normalizedDebouncedQuery = debouncedQuery.trim();
  const activePosts =
    serverSearchPosts !== null && serverSearchQuery === normalizedDebouncedQuery
      ? serverSearchPosts
      : allPosts;
  const shouldFilterLocally =
    normalizedDebouncedQuery.length > 0 &&
    normalizedDebouncedQuery.length < SERVER_SEARCH_MIN_CHARS;

  const filteredPosts = useMemo(
    () =>
      sortPosts(
        shouldFilterLocally ? searchPosts(activePosts, debouncedQuery) : activePosts,
        deferredSortBy,
        deferredSortDirection,
        initialPostsSnapshot,
        debouncedQuery,
      ),
    [activePosts, debouncedQuery, deferredSortBy, deferredSortDirection, initialPostsSnapshot, shouldFilterLocally],
  );

  // Each context value is independently memoized — consumers only re-render when
  // their slice of state changes.
  const postsDataValue = useMemo<PostsDataContextType>(
    () => ({ allPosts, filteredPosts, setAllPosts, updatePost, isSorting, trackPostView }),
    [allPosts, filteredPosts, setAllPosts, updatePost, isSorting, trackPostView],
  );

  const searchQueryValue = useMemo<SearchQueryContextType>(
    () => ({ query, setQuery }),
    [query],
  );

  const sortValue = useMemo<SortContextType>(
    () => ({ sortBy, setSortBy, sortDirection, setSortDirection, toggleSortDirection, cycleSortCriteria, isSorting }),
    [sortBy, sortDirection, toggleSortDirection, cycleSortCriteria, isSorting],
  );

  const paginationValue = useMemo<PaginationContextType>(
    () => ({ currentPage, setCurrentPage }),
    [currentPage],
  );

  return (
    <PostsDataContext.Provider value={postsDataValue}>
      <SearchQueryContext.Provider value={searchQueryValue}>
        <SortContext.Provider value={sortValue}>
          <PaginationContext.Provider value={paginationValue}>
            {children}
          </PaginationContext.Provider>
        </SortContext.Provider>
      </SearchQueryContext.Provider>
    </PostsDataContext.Provider>
  );
};

// ── hooks ─────────────────────────────────────────────────────────────────────

const missingProvider = (name: string) => {
  throw new Error(`${name} must be used within a SearchProvider`);
};

export const usePostsData = (): PostsDataContextType => {
  const ctx = useContext(PostsDataContext);
  if (!ctx) missingProvider("usePostsData");
  return ctx!;
};

export const useSearchQuery = (): SearchQueryContextType => {
  const ctx = useContext(SearchQueryContext);
  if (!ctx) missingProvider("useSearchQuery");
  return ctx!;
};

export const useSort = (): SortContextType => {
  const ctx = useContext(SortContext);
  if (!ctx) missingProvider("useSort");
  return ctx!;
};

export const usePagination = (): PaginationContextType => {
  const ctx = useContext(PaginationContext);
  if (!ctx) missingProvider("usePagination");
  return ctx!;
};
