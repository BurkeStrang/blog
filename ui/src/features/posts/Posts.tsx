import React, { useMemo } from "react";
import styled from "styled-components";
import {
  Page,
  Header,
  SearchContainer,
  SearchInput,
  ClearButton,
  SearchBar,
  Cloud,
  FilterButton,
  FilterDropdown,
  FilterOption,
} from "../../shared/theme/GlobalStyles";
import { Post } from "../../app/AppContent";
import cloudImg from "../../assets/textures/darkcloud.avif";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useSearch } from "../../shared/contexts/SearchContext";
import { useFontLoaded } from "../../shared/hooks";

interface PostsProps {
  selectedPost: Post | null;
}

const StableContainer = styled.div<{ $isVisible: boolean; $fontLoaded: boolean }>`
  opacity: ${({ $isVisible, $fontLoaded }) => ($isVisible && $fontLoaded ? 1 : 0)};
  visibility: ${({ $isVisible, $fontLoaded }) => ($isVisible && $fontLoaded ? 'visible' : 'hidden')};
  transition: opacity 0.15s ease-out, visibility 0.15s ease-out;
  pointer-events: ${({ $isVisible }) => ($isVisible ? 'auto' : 'none')};
`;

const FilterDropdownComponent = React.memo(function FilterDropdownComponent() {
  const { sortBy, sortDirection, toggleSortDirection, cycleSortCriteria } =
    useSearch();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOptionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <FilterButton
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Filter options"
      >
        <FilterListIcon
          sx={{
            fontSize: {
              "@media (maxHeight: 800px)": "1rem",
              "@media (maxHeight: 600px)": "0.9rem",
              "@media (maxHeight: 450px)": "0.8rem",
            },
          }}
        />
      </FilterButton>
      <FilterDropdown $isOpen={isOpen}>
        <FilterOption onClick={() => handleOptionClick(cycleSortCriteria)}>
          Sort by {sortBy === "pageViews" ? "DATE" : sortBy === "date" ? "TRENDING" : "VIEWS"}
        </FilterOption>
        <FilterOption onClick={() => handleOptionClick(toggleSortDirection)}>
          Order: {sortDirection === "asc" ? "Ascending" : "Descending"}
        </FilterOption>
      </FilterDropdown>
    </div>
  );
});

const SearchBarMemo = React.memo(function SearchBarMemo() {
  const { query, setQuery } = useSearch();

  return (
    <SearchBar>
      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value)
          }
        />
        {query && (
          <ClearButton onClick={() => setQuery("")} aria-label="Clear search">
            ×
          </ClearButton>
        )}
      </SearchContainer>
    </SearchBar>
  );
});

const Posts: React.FC<PostsProps> = ({ selectedPost }) => {
  // Memoize visibility to prevent unnecessary re-renders
  const isVisible = useMemo(() => !selectedPost, [selectedPost]);
  
  // Wait for the mega font to load before showing the title
  const isFontLoaded = useFontLoaded('mega');
  
  return (
    <Page>
      <StableContainer $isVisible={isVisible} $fontLoaded={isFontLoaded}>
        <Header>
          <Cloud src={cloudImg} alt="" />
          <h1>BRXSTNG BLG</h1>
        </Header>
        <div>
          <SearchBarMemo />
          <FilterDropdownComponent />
        </div>
      </StableContainer>
    </Page>
  );
};

export default Posts;
