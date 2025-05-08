import React from "react";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import { neon, primary, secondary } from "./components/Styled";

const Nav = styled.nav`
  position: sticky;
  top: 0;
  z-index: 2;
`;

const NavList = styled.ul`
  list-style: none;
  display: flex;
  justify-content: left;
  gap: 2rem;
  margin: 5;
  padding: 5;
`;

const NavItem = styled.li``;

const StyledLink = styled(NavLink)`
  color: ${primary};
  text-decoration: none;
  font-size: 1.2rem;
  position: relative;
  padding: 0.25rem 0;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -4px;
    width: 0%;
    height: 2px;
    background: ${secondary};
    transition: width 0.3s ease;
  }

  &:hover {
    color: ${secondary};
  }

  &:hover::after {
    width: 100%;
  }

  &.active::after {
    width: 100%;
  }
`;

const Header: React.FC = () => (
  <Nav>
    <NavList>
      <NavItem>
        <StyledLink to="/">Home</StyledLink>
      </NavItem>
      <NavItem>
        <StyledLink to="/posts">Posts</StyledLink>
      </NavItem>
    </NavList>
  </Nav>
);

export default Header;
