import React from "react";
import {
  Page,
  Header,
  SearchContainer,
  SearchInput,
  ClearButton,
  SortButton,
  SearchBar,
  SortDirectionButton,
  Cloud,
} from "../../shared/theme/GlobalStyles";
import { Post } from "../../app/AppContent";
import cloudImg from "../../assets/textures/darkcloud.avif";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useSearch } from "../../shared/contexts/SearchContext";

interface PostsProps {
  selectedPost: Post | null;
}

const SortIcon = React.memo(
  ({ isUp, onClick }: { isUp: boolean; onClick: () => void }) => (
    <SortDirectionButton $isUp={isUp} onClick={onClick}>
      {isUp ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
    </SortDirectionButton>
  ),
);
SortIcon.displayName = "SortIcon";

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
  const { filteredPosts, sortBy, sortDirection, toggleSortDirection, cycleSortCriteria } = useSearch();

  return (
    <Page>
      <Header style={{ display: selectedPost ? 'none' : 'block' }}>
        <Cloud src={cloudImg} alt="" />
        <h1>BRXSTNG BLG</h1>
      </Header>
      <div style={{ display: selectedPost ? 'none' : 'block' }}>
        <SearchBarMemo />
        <SortButton onClick={cycleSortCriteria}>
          {sortBy === 'pageViews' ? 'VIEWS' : 'DATE'}
        </SortButton>
        <SortIcon isUp={sortDirection === 'asc'} onClick={toggleSortDirection} />
        {filteredPosts.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            marginTop: '2rem',
            fontSize: '1.1rem'
          }}>
          </div>
        )}
      </div>
    </Page>
  );
};

export default Posts;
