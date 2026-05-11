import React from "react";
import styled from "styled-components";
import {
  Page,
  Header,
  SearchContainer,
  SearchInput,
  ClearButton,
  SearchBar,
  FilterButton,
  FilterDropdown,
  FilterOption,
} from "../../shared/theme/GlobalStyles";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import { useSort, useSearchQuery } from "../../shared/contexts/SearchContext";
import { useAuth } from "../../shared/contexts/AuthContext";
import { isAdmin } from "../../shared/types/user";
import { useNavigate } from "react-router-dom";
import { accent, backgroundColor } from "../../shared/theme/colors";

const ControlsContainer = styled.div`
  position: relative;
  width: 100%;
  height: 120px; /* Provide space for absolutely positioned elements */

  @media (max-height: 800px) {
    height: 110px;
  }

  @media (max-height: 600px) {
    height: 90px;
  }

  @media (max-height: 450px) {
    height: 70px;
  }

  @media (max-width: 768px) {
    height: 90px;
  }

  @media (max-width: 480px) {
    height: 70px;
  }
`;

const AddPostButton = styled.button`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 56px;
  height: 56px;
  background: ${accent};
  color: ${backgroundColor};
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
  transition: all 0.2s ease;
  z-index: 1000;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 255, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 1.5rem;
  }
`;

const FilterDropdownComponent = React.memo(function FilterDropdownComponent() {
  const { sortBy, sortDirection, toggleSortDirection, cycleSortCriteria } =
    useSort();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleOptionClick = React.useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  const handleToggleOpen = React.useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Get display text and next action for sort criteria
  const criteriaDisplay = React.useMemo(() => {
    switch (sortBy) {
      case "pageViews":
        return { current: "VIEWS", next: "DATE" };
      case "date":
        return { current: "DATE", next: "TRENDING" };
      case "trending":
        return { current: "TRENDING", next: "VIEWS" };
      default:
        return { current: "TRENDING", next: "VIEWS" };
    }
  }, [sortBy]);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <FilterButton
        onClick={handleToggleOpen}
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
      <FilterDropdown data-open={isOpen}>
        <FilterOption onClick={() => handleOptionClick(cycleSortCriteria)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              <CheckIcon
                sx={{
                  fontSize: "0.8rem",
                  marginRight: "0.5rem",
                  color: "var(--color-filter-icon-active)",
                }}
              />
              Sort by: {criteriaDisplay.current}
            </span>
            <span
              style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: "1rem" }}
            >
              → {criteriaDisplay.next}
            </span>
          </div>
        </FilterOption>
        <FilterOption onClick={() => handleOptionClick(toggleSortDirection)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              {sortDirection === "desc" ? (
                <ArrowDownwardIcon
                  sx={{
                    fontSize: "0.8rem",
                    marginRight: "0.5rem",
                    color: "var(--color-filter-icon-active)",
                  }}
                />
              ) : (
                <ArrowUpwardIcon
                  sx={{
                    fontSize: "0.8rem",
                    marginRight: "0.5rem",
                    color: "var(--color-filter-icon-active)",
                  }}
                />
              )}
              Order: {sortDirection === "desc" ? "Descending" : "Ascending"}
            </span>
            <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>
              {sortDirection === "desc" ? "↑" : "↓"}
            </span>
          </div>
        </FilterOption>
      </FilterDropdown>
    </div>
  );
});

const SearchBarMemo = React.memo(function SearchBarMemo() {
  const { query, setQuery } = useSearchQuery();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, [setQuery]);

  const handleClear = React.useCallback(() => {
    setQuery("");
  }, [setQuery]);

  React.useEffect(() => {
    const isMobile = window.matchMedia('(hover: none)').matches;
    if (!isMobile) {
      inputRef.current?.focus();
    }
  }, []);

  return (
    <SearchBar>
      <SearchContainer>
        <SearchInput
          ref={inputRef}
          id="search-posts"
          name="search"
          type="text"
          placeholder="Search"
          value={query}
          onChange={handleChange}
        />
        {query && (
          <ClearButton onClick={handleClear} aria-label="Clear search">
            ×
          </ClearButton>
        )}
      </SearchContainer>
    </SearchBar>
  );
});

const PostsHeader = React.memo(function PostsHeader() {
  return (
    <>
      <Header>
        <h1>BRXSTRNGBLG</h1>
      </Header>
      <ControlsContainer>
        <SearchBarMemo />
        <FilterDropdownComponent />
      </ControlsContainer>
    </>
  );
});

const AdminAddPostButton = React.memo(function AdminAddPostButton() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAddPost = React.useCallback(() => {
    navigate("/posts/new");
  }, [navigate]);

  if (!isAdmin(user)) return null;

  return (
    <AddPostButton onClick={handleAddPost}>
      <AddIcon />
    </AddPostButton>
  );
});

const Posts: React.FC = React.memo(() => {
  return (
    <Page>
      <PostsHeader />
      <AdminAddPostButton />
    </Page>
  );
});

Posts.displayName = "Posts";

export default Posts;
