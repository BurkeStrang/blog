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
const Sidebar = styled.nav`
  position: fixed;
  background: color-mix(in srgb, var(--color-bg) 72%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-right: 1px solid var(--color-md-blockquote-border);
  box-shadow: 0 0 0 1px rgba(0, 220, 200, 0.06);
  top: 0;
  left: 0;
  height: 100vh;
  width: 10vw;
  z-index: 200;
  padding: 4rem;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(-110%);
  contain: paint;
  isolation: isolate;
  backface-visibility: hidden;
  will-change: transform;
  display: flex;
  flex-direction: column;

  &[data-open="true"] {
    transform: translateX(0);
  }

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
  color: var(--color-readable-lightgrey);
  cursor: pointer;
  font-size: 2rem;
  padding: 0.5rem;
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.3s ease;
  border-radius: 50%;
  backface-visibility: hidden;

  &:hover {
    background: rgba(0, 220, 200, 0.07);
    color: var(--color-primary);
    transform: scale(1.1);
    box-shadow: 0 0 18px rgba(0, 220, 200, 0.24);
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
  gap: 0.5rem;
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
  margin: 0.35rem auto;
  padding: 0.8rem 1rem;
  color: var(--color-readable-lightgrey);
  font-family: var(--font-family-display);
  text-decoration: none;
  font-weight: 800;
  font-size: 1.05rem;
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    text-shadow 0.2s ease;

  &:hover {
    color: color-mix(in srgb, var(--color-accent) 65%, black);
    background: rgba(0, 220, 200, 0.07);
    border-color: rgba(0, 220, 200, 0.16);
  }

  &.active {
    color: var(--color-primary);
    text-shadow:
      0 0 18px rgba(0, 220, 200, 0.35);
    background: rgba(0, 220, 200, 0.08);
    border-color: rgba(0, 220, 200, 0.18);
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
  font-family: var(--font-family);
  font-weight: 500;
  color: var(--color-readable-lightgrey);
  font-size: 0.9rem;
  line-height: 1.3;
`;

const LogoutButton = styled(SidebarButton)`
  color: #b06e6e;
  font-size: 1rem;
  margin-top: 0.5rem;
  font-weight: 800;

  &:hover {
    color: #b06e6e;
    border-color: rgba(176, 110, 110, 0.32);
    background: rgba(176, 110, 110, 0.08);
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

      <Sidebar ref={sidebarRef} data-open={open} aria-label="Sidebar navigation">
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
