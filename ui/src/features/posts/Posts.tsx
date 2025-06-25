import React from "react";
import {
  Page,
  Header,
  SearchContainer,
  SearchInput,
  ClearButton,
  SearchBar,
  Cloud,
  FilterContainer,
  FilterButton,
  FilterDropdown,
  FilterOption,
} from "../../shared/theme/GlobalStyles";
import { Post } from "../../app/AppContent";
import cloudImg from "../../assets/textures/darkcloud.avif";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useSearch } from "../../shared/contexts/SearchContext";

interface PostsProps {
  selectedPost: Post | null;
}

const FilterDropdownComponent = React.memo(function FilterDropdownComponent() {
  const { sortBy, sortDirection, toggleSortDirection, cycleSortCriteria } = useSearch();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOptionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <FilterContainer>
      <FilterButton onClick={() => setIsOpen(!isOpen)} aria-label="Filter options">
        <FilterListIcon 
          sx={{ 
            fontSize: {
              '@media (max-height: 800px)': '1rem',
              '@media (max-height: 600px)': '0.9rem', 
              '@media (max-height: 450px)': '0.8rem'
            }
          }}
        />
      </FilterButton>
      <FilterDropdown $isOpen={isOpen}>
        <FilterOption onClick={() => handleOptionClick(cycleSortCriteria)}>
          Sort by {sortBy === 'pageViews' ? 'DATE' : 'VIEWS'}
        </FilterOption>
        <FilterOption onClick={() => handleOptionClick(toggleSortDirection)}>
          Order: {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </FilterOption>
      </FilterDropdown>
    </FilterContainer>
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
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

  return (
    <Page>
      <Header style={{ display: selectedPost ? 'none' : 'block' }}>
        <Cloud src={cloudImg} alt="" />
        <h1>BRXSTNG BLG</h1>
      </Header>
      <div style={{ display: selectedPost ? 'none' : 'block' }}>
        <SearchBarMemo />
        <FilterDropdownComponent />
      </div>
    </Page>
  );
};

export default Posts;
