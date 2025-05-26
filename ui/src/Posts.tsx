import React, { useState } from "react";
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
  handleClose: () => void;
}

const SortIcon = ({
  isUp,
  onClick,
}: {
  isUp: boolean;
  onClick: () => void;
}) => (
  <SortDirectionButton isUp$={isUp} onClick={onClick}>
    {isUp ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
  </SortDirectionButton>
);

const Posts: React.FC<PostsProps> = ({ selectedPost }) => {
  const [query, setQuery] = useState("");
  const [isSortUp, setIsSortUp] = useState(true);
  return (
    <Page>
      {!selectedPost && (
        <>
          <Header>
            <Cloud src={cloudImg} alt="" />
            <h1>BRXSTNG BLG</h1>
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
                <ClearButton
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </ClearButton>
              )}
            </SearchContainer>
          </SearchBar>
          <SortButton />
          <SortIcon
            isUp={isSortUp}
            onClick={() => setIsSortUp((prev) => !prev)}
          />
        </>
      )}
      {selectedPost && <Navigate to={`/posts/${selectedPost.slug}`} replace />}
    </Page>
  );
};

export default Posts;
