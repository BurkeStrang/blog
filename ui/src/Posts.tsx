import React, { useState, useCallback } from "react";
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
} from "./theme/GlobalStyles";
import { Post } from "./AppContent";
import cloudImg from "./textures/darkcloud.png";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { Navigate } from "react-router-dom";

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

const SearchBarMemo = React.memo(function SearchBarMemo({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (v: string) => void;
}) {
  return (
    <SearchBar>
      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
  const [query, setQuery] = useState("");
  const [isSortUp, setIsSortUp] = useState(true);

  const toggleSort = useCallback(() => setIsSortUp((prev) => !prev), []);

  return (
    <Page>
      {!selectedPost && (
        <>
          <Header>
            <Cloud src={cloudImg} alt="" />
            <h1>BRXSTNG BLG</h1>
          </Header>
          <SearchBarMemo query={query} setQuery={setQuery} />
          <SortButton />
          <SortIcon isUp={isSortUp} onClick={toggleSort} />
        </>
      )}
      {selectedPost && (
        <>
          <Navigate to={`/posts/${selectedPost.slug}`} replace />
        </>
      )}
    </Page>
  );
};

export default Posts;
