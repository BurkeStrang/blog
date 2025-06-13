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
} from "../../shared/theme/GlobalStyles";
import { Post } from "../../app/AppContent";
import cloudImg from "../../assets/textures/darkcloud.png";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

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
      {/* Navigation is handled by AppContent, no need for additional Navigate */}
    </Page>
  );
};

export default Posts;
