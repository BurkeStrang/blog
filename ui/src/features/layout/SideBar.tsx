import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, Navigate } from "react-router-dom";
import styled, { css } from "styled-components";
import { primary } from "../../shared/theme/colors";
import MenuIcon from "@mui/icons-material/Menu";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useTheme } from "../../shared/contexts/ThemeContext";
import { useAuth } from "../../shared/contexts/AuthContext";

// Sidebar container
const Sidebar = styled.nav<{ open: boolean }>`
  position: fixed;
  background: var(--color-sidebar-bg);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.18);
  top: 0;
  left: 0;
  height: 100vh;
  width: 10vw;
  z-index: 200;
  padding: 4rem;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(${(p) => (p.open ? "0" : "-110%")});
  display: flex;
  flex-direction: column;

  /* Responsive width */
  @media (max-width: 768px) {
    width: 25vw; /* Slightly wider on mobile for better touch targets */
  }
  @media (max-width: 480px) {
    width: 35vw; /* 90% of viewport width on small screens */
    max-width: 320px; /* But never exceed 320px */
  }
  @media (max-width: 320px) {
    width: 50vw; /* Even more width on very small screens */
  }

  @media (max-height: 800px) {
    padding: 4rem;
  }
  @media (max-height: 600px) {
    padding: 3rem;
  }
  @media (max-height: 450px) {
    padding: 2rem;
  }
`;

const HamburgerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100px;
  height: 100px;
  z-index: 210;
`;

const HamburgerBtn = styled.button`
  position: absolute;
  top: 1.1rem;
  left: 1.1rem;
  background: none;
  border: none;
  color: var(--color-sidebar-link);
  cursor: pointer;
  font-size: 2rem;
  padding: 0.5rem;
  transition: all 0.3s ease;
  border-radius: 50%;

  &:hover {
    background: var(--color-sidebar-glow-far);
    color: var(--color-sidebar-link);
    transform: scale(1.1);
    box-shadow: 0 0 10px var(--color-sidebar-glow-near);
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
  margin:1rem auto;
  padding: 0.75rem 1.25rem;
  color: var(--color-sidebar-link);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.08rem;

  &:hover {
    color: var(--color-sidebar-link);
    text-shadow:
      0 0 2px var(--color-sidebar-glow-near),
      0 0 5px var(--color-sidebar-glow-near),
      0 0 10px var(--color-sidebar-glow-near);
    background: var(--color-sidebar-hover-bg);
    border-radius: 6px;
    transform: scale(1.04);
  }

  &.active {
    color: var(--color-sidebar-link);
    text-shadow:
      0 0 2px var(--color-sidebar-glow-near),
      0 0 5px var(--color-sidebar-glow-near),
      0 0 15px var(--color-sidebar-glow-near),
      0 0 24px var(--color-sidebar-glow-far),
      0 0 40px var(--color-sidebar-glow-far);
    background: var(--color-sidebar-active-bg);
    border-radius: 6px;
    transform: scale(1.025);
  }

  @media (max-height: 800px) {
    margin: 0.75rem auto;
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }

  @media (max-height: 600px) {
    margin: 0.75rem auto;
    padding: 0.7rem 0.75rem;
    font-size: 0.9rem;
  }

  @media (max-height: 450px) {
    margin: 0.5rem auto;
    padding: 0.5rem 0.5rem;
    font-size: 0.8rem;
  }
`;

const SidebarLink = styled(NavLink)`
  ${sidebarLinkBase}
`;

const SidebarButton = styled.button`
  ${sidebarLinkBase}
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: inherit;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const ProfileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ProfilePicture = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${primary};
  object-fit: cover;
`;

const UserName = styled.span`
  font-weight: 500;
  color: ${primary};
  font-size: 0.9rem;
`;

const LogoutButton = styled(SidebarButton)`
  color: #ff6b6b;
  font-size: 1rem;
  margin-top: 0.5rem;
  font-weight: 600;

  &:hover {
    color: #ff5252;
    text-shadow:
      0 0 2px #ff5252,
      0 0 5px #ff5252;
  }
`;

interface SidebarNavProps {
  onNavigateStart?: (path: string) => void;
}

const SidebarNav: React.FC<SidebarNavProps> = React.memo(({ onNavigateStart }) => {
  const location = useLocation();
  const { user, loginLoading, logout, loginWithGoogle } = useAuth();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const sidebarRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        sidebarRef.current &&
        hamburgerRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Redirect if at root
  if (location.pathname === "/") {
    return <Navigate to="/posts" replace />;
  }

  return (
    <>
      <HamburgerContainer ref={hamburgerRef}>
        <HamburgerBtn aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          <MenuIcon fontSize="inherit" />
        </HamburgerBtn>
      </HamburgerContainer>

      <Sidebar ref={sidebarRef} open={open} aria-label="Sidebar navigation">
        <SidebarLinks>
          <SidebarItem>
            <SidebarLink
              to="/about"
              onClick={() => {
                onNavigateStart?.("/about");
                setOpen(false);
              }}
            >
              ABOUT
            </SidebarLink>
          </SidebarItem>
          <SidebarItem>
            <SidebarLink
              to="/posts"
              onClick={() => {
                onNavigateStart?.("/posts");
                setOpen(false);
              }}
            >
              POSTS
            </SidebarLink>
          </SidebarItem>
          <SidebarItem>
            <SidebarButton onClick={toggleTheme}>
              {theme === 'dark' ? (
                <LightModeIcon sx={{ fontSize: '1rem', marginRight: '0.4rem', verticalAlign: 'middle' }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: '1rem', marginRight: '0.4rem', verticalAlign: 'middle' }} />
              )}
              {theme === 'dark' ? 'LIGHT' : 'DARK'}
            </SidebarButton>
          </SidebarItem>
          <SidebarItem>
            {user ? (
              <div style={{ padding: '0.75rem 1.25rem', margin: '0.2rem auto', width: '90%' }}>
                <ProfileSection>
                  <ProfileInfo>
                    <ProfilePicture
                      src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0ff&color=000`}
                      alt={user.name}
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0ff&color=000`;
                      }}
                    />
                    <UserName>{user.name}</UserName>
                  </ProfileInfo>
                </ProfileSection>
              </div>
            ) : (
              <SidebarButton
                onClick={() => {
                  localStorage.setItem('returnTo', location.pathname);
                  setOpen(false);
                  loginWithGoogle();
                }}
                disabled={loginLoading}
              >
                {loginLoading ? 'LOGGING IN...' : 'LOGIN'}
              </SidebarButton>
            )}
          </SidebarItem>
          {user && (
            <SidebarItem>
              <LogoutButton onClick={() => {
                setOpen(false);
                logout();
              }}>
                LOGOUT
              </LogoutButton>
            </SidebarItem>
          )}
        </SidebarLinks>
      </Sidebar>
    </>
  );
});

SidebarNav.displayName = "SidebarNav";

export default SidebarNav;
