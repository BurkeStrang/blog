import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Post } from '../../app/AppContent';

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  filteredPosts: Post[];
  setAllPosts: (posts: Post[]) => void;
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

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  // Memoize filtered posts to avoid unnecessary recalculations
  const filteredPosts = useMemo(() => {
    return searchPosts(allPosts, query);
  }, [allPosts, query]);

  const value = useMemo(() => ({
    query,
    setQuery,
    filteredPosts,
    setAllPosts,
  }), [query, filteredPosts]);

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