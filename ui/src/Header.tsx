import React from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import styled from "styled-components";
import { lightgrey, primary } from "./theme/GlobalStyles";

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
  color: ${lightgrey};
  text-shadow:
    0 0 0px #0ff,
    0 0 1px #0ff,
    0 0 2px #0ff,
    0 0 0px #0ff,
    0 0 0px #0ff;
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
    background: rgba(150, 150, 255, 0.2);
    color: ${primary};
    text-shadow:
      0 0 1px #fff,
      0 0 2px #0ff,
      0 0 4px #0ff,
      0 0 8px #0ff,
      0 0 16px #0ff;
    box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.2); /* Even shadow on all sides */
    border-radius: 8px;
    transform: translateY(-2px) scale(1.1);
  }

  &.active {
    background: rgba(150, 150, 255, 0.08);
    color: #0ff;
    text-shadow:
      0 0 1px #0ff,
      0 0 2px #0ff,
      0 0 4px #0ff,
      /* purple outer glow */
      0 0 20px  rgba(40,0,255,0.8),
      0 0 30px  rgba(40,0,255,0.3),
      0 0 40px  rgba(40,0,255,0.2);
    box-shadow: 2px 2px 8px rgba(150, 150, 255, 0.1); /* Even shadow on all sides */
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
          <StyledLink to="/about">ABOUT</StyledLink>
        </NavItem>
        <NavItem>
          <StyledLink to="/posts">POSTS</StyledLink>
        </NavItem>
        <NavItem>
          <StyledLink to="/profile">LOGIN</StyledLink>
        </NavItem>
      </NavList>
    </Nav>
  );
};

export default Header;
