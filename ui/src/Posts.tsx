import React, { useState } from "react";
import {
  Page,
  Content,
  PostCard,
  MinimalButton,
  Header,
  SearchContainer,
  SearchInput,
  ClearButton,
  SortButton,
  SearchBar,
  SortDirectionButton,
} from "./components/Styled";
import { Post } from "./App";

import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

interface PostsProps {
  selectedPost: Post | null;
  handleClose: () => void;
}

const SortIcon = ({
  isUp,
  onClick,
}: {
  isUp: boolean;
  onClick: () => void;
}) => (
  <SortDirectionButton isUp={isUp} onClick={onClick}>
    {isUp ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
  </SortDirectionButton>
);

const Posts: React.FC<PostsProps> = ({ selectedPost, handleClose }) => {
  const [query, setQuery] = useState("");
  const [isSortUp, setIsSortUp] = useState(true);
  return (
    <Page>
      <Header>
        <h1>Brutalist Blog</h1>
      </Header>
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
      <SortButton />
      <SortIcon isUp={isSortUp} onClick={() => setIsSortUp((prev) => !prev)} />
      {selectedPost && (
        <Content>
          <PostCard>
            <h2>{selectedPost.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: selectedPost.body }} />
            <MinimalButton onClick={handleClose}>Close</MinimalButton>
          </PostCard>
        </Content>
      )}
    </Page>
  );
};

export default Posts;
