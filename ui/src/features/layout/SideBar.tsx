import React, { useState } from "react";
import { NavLink, useLocation, Navigate } from "react-router-dom";
import styled, { css } from "styled-components";
import { darkgrey, primary } from "../../shared/theme/colors";
import MenuIcon from "@mui/icons-material/Menu";

// Sidebar container
const Sidebar = styled.nav<{ open: boolean }>`
  position: fixed;
  background: rgba(0, 0, 0, 0.7);
  top: 0;
  left: 0;
  height: 100vh;
  width: 240px;
  z-index: 200;
  padding-top: 3.5rem;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(${(p) => (p.open ? "0" : "-110%")});
  display: flex;
  flex-direction: column;

  @media (max-height: 800px) {
    padding-top: 2.5rem;
  }

  @media (max-height: 600px) {
    padding-top: 1.5rem;
  }

  @media (max-height: 450px) {
    padding-top: 1rem;
  }
`;

const HamburgerBtn = styled.button`
  position: fixed;
  top: 1.1rem;
  left: 1.1rem;
  background: none;
  border: none;
  z-index: 210;
  color: ${darkgrey};
  cursor: pointer;
  font-size: 2rem;
  padding: 0.5rem;
  transition: background 0.2s;
  border-radius: 50%;
  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  @media (max-height: 800px) {
    top: 0.6rem;
    left: 0.6rem;
    padding: 0.2rem;
    font-size: 1.6rem;
  }

  @media (max-height: 600px) {
    top: 0.4rem;
    left: 0.4rem;
    padding: 0.15rem;
    font-size: 1.4rem;
  }

  @media (max-height: 450px) {
    top: 0.25rem;
    left: 0.25rem;
    padding: 0.1rem;
    font-size: 1.2rem;
  }
`;

const SidebarLinks = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  margin: 1rem;
  list-style: none;

  @media (max-height: 800px) {
    padding: 0.75rem;
    margin: 0.75rem;
    gap: 0.2rem;
  }

  @media (max-height: 600px) {
    padding: 0.5rem;
    margin: 0.5rem;
    gap: 0.15rem;
  }

  @media (max-height: 450px) {
    padding: 0.25rem;
    margin: 0.25rem;
    gap: 0.1rem;
  }
`;

const SidebarItem = styled.li``;

const sidebarLinkBase = css`
  display: block;
  width: 90%;
  margin: 0.2rem auto;
  padding: 0.75rem 1.25rem;
  color: ${primary};
  text-decoration: none;
  font-weight: 600;
  font-size: 1.08rem;

  &:hover {
    color: #0ff;
    text-shadow:
      0 0 2px #0ff,
      0 0 5px #0ff,
      0 0 10px #0ff;
    transform: scale(1.04);
  }

  &.active {
    color: #0ff;
    text-shadow:
      0 0 2px #0ff,
      0 0 5px #0ff,
      0 0 15px #0ff,
      0 0 24px rgba(40, 0, 255, 0.4),
      0 0 40px rgba(40, 0, 255, 0.18);
    transform: scale(1.025);
  }

  @media (max-height: 800px) {
    margin: 0.15rem auto;
    padding: 0.6rem 1rem;
    font-size: 1rem;
  }

  @media (max-height: 600px) {
    margin: 0.1rem auto;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }

  @media (max-height: 450px) {
    margin: 0.05rem auto;
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const SidebarLink = styled(NavLink)`
  ${sidebarLinkBase}
`;

// Main sidebar component
const SidebarNav: React.FC = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Redirect if at root
  if (location.pathname === "/") {
    return <Navigate to="/posts" replace />;
  }

  return (
    <>
      <HamburgerBtn aria-label="Toggle menu" onClick={() => setOpen(!open)}>
        <MenuIcon fontSize="inherit" />
      </HamburgerBtn>

      <Sidebar open={open} aria-label="Sidebar navigation">
        <SidebarLinks>
          <SidebarItem>
            <SidebarLink to="/about" onClick={() => setOpen(false)}>
              ABOUT
            </SidebarLink>
          </SidebarItem>
          <SidebarItem>
            <SidebarLink to="/posts" onClick={() => setOpen(false)}>
              POSTS
            </SidebarLink>
          </SidebarItem>
          <SidebarItem>
            <SidebarLink to="/profile" onClick={() => setOpen(false)}>
              LOGIN
            </SidebarLink>
          </SidebarItem>
        </SidebarLinks>
      </Sidebar>
    </>
  );
};

export default SidebarNav;
