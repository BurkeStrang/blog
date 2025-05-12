import React from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import styled from "styled-components";
import { primary, secondary } from "./components/Styled";

const Nav = styled.nav`
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 0.5rem 1rem;
`;

const StyledLink = styled(NavLink)`
  display: inline-block;
  padding: 0.5rem 1rem;
  margin: 0 0.5rem;
  color: ${primary};
  text-decoration: none;

  box-shadow: 0 0 1.5px 0 rgba(0, 0, 0.3, 0.3);
  border-radius: 8px;
  transform: translateY(-2px) scale(1.02);

  transition:
    background 0.3s ease,
    box-shadow 0.3s ease,
    color 0.3s ease,
    transform 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: ${secondary};
    box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.2); /* Even shadow on all sides */
    border-radius: 8px;
    transform: translateY(-2px) scale(1.1);
  }

  &.active {
    color: ${secondary};
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2); /* Even shadow on all sides */
    border-radius: 8px; /* Rounded edges */
    transform: translateY(-2px) scale(1.02);
  }
`;

const NavList = styled.ul`
  list-style: none;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
`;

const NavItem = styled.li`
  &:last-child {
    margin-left: auto;
  }
`;

const Header: React.FC = () => {
  const location = useLocation();

  // Redirect to "/posts" if no path is specified
  if (location.pathname === "/") {
    return <Navigate to="/posts" replace />;
  }

  return (
    <Nav>
      <NavList>
        <NavItem>
          <StyledLink to="/about">About</StyledLink>
        </NavItem>
        <NavItem>
          <StyledLink to="/posts">Posts</StyledLink>
        </NavItem>
        <NavItem>
          <StyledLink to="/profile">Sign In</StyledLink>
        </NavItem>
      </NavList>
    </Nav>
  );
};

export default Header;
