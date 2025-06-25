import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Post } from '../../app/AppContent';

export type SortCriteria = 'pageViews' | 'date';
export type SortDirection = 'asc' | 'desc';

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
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface SearchProviderProps {
  children: React.ReactNode;
}

// Helper function to strip HTML tags and search full text
const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

// Full-text search function
const searchPosts = (posts: Post[], query: string): Post[] => {
  if (!query.trim()) {
    return posts;
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/);
  
  return posts.filter(post => {
    const titleText = post.title.toLowerCase();
    const bodyText = stripHtmlTags(post.body).toLowerCase();
    const combinedText = `${titleText} ${bodyText}`;
    
    // All search terms must be found in the combined text
    return searchTerms.every(term => combinedText.includes(term));
  });
};

// Sorting functions
const sortPosts = (posts: Post[], sortBy: SortCriteria, direction: SortDirection): Post[] => {
  const sorted = [...posts].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'pageViews') {
      const aViews = a.pageViews || 0;
      const bViews = b.pageViews || 0;
      comparison = aViews - bViews;
    } else if (sortBy === 'date') {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      comparison = aDate - bDate;
    }
    
    return direction === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
};

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [sortBy, setSortBy] = useState<SortCriteria>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isSorting, setIsSorting] = useState(false);
  
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
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  // Toggle sort direction - memoize with useCallback
  const toggleSortDirection = useCallback(() => {
    setIsSorting(true);
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    // Reset sorting state after animation time
    const timeoutId = setTimeout(() => setIsSorting(false), 1000);
    timeoutRefs.current.add(timeoutId);
  }, []);

  // Cycle through sort criteria - memoize with useCallback
  const cycleSortCriteria = useCallback(() => {
    setIsSorting(true);
    setSortBy(prev => prev === 'pageViews' ? 'date' : 'pageViews');
    // Reset sorting state after animation time
    const timeoutId = setTimeout(() => setIsSorting(false), 1000);
    timeoutRefs.current.add(timeoutId);
  }, []);

  // Memoize filtered and sorted posts to avoid unnecessary recalculations
  const filteredPosts = useMemo(() => {
    const searched = searchPosts(allPosts, debouncedQuery);
    return sortPosts(searched, sortBy, sortDirection);
  }, [allPosts, debouncedQuery, sortBy, sortDirection]);

  const value = useMemo(() => ({
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
  }), [query, filteredPosts, sortBy, sortDirection, isSorting]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};