import React, { useState } from "react";
import { NavLink, useLocation, Navigate } from "react-router-dom";
import styled, { css } from "styled-components";
import { darkgrey, primary } from "../../shared/theme/colors";
import { User } from "../../shared/types/user";
import { apiService } from "../../services/api";
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
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 6px;
  
  &:hover {
    background: rgba(255, 107, 107, 0.1);
    color: #ff5252;
    border-color: #ff5252;
    text-shadow:
      0 0 2px #ff5252,
      0 0 5px #ff5252;
  }
`;

interface SidebarNavProps {
  onPostsClick?: () => void;
  user?: User | null;
  onLogout?: () => void;
  onLogin?: (user: User, token: string) => void;
}

// Main sidebar component
const SidebarNav: React.FC<SidebarNavProps> = ({ onPostsClick, user, onLogout, onLogin }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Detect mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Handle Google OAuth login (popup for desktop, redirect for mobile)
  const handleGoogleLogin = async () => {
    if (!onLogin || loginLoading) return;
    
    try {
      setLoginLoading(true);
      setOpen(false);

      // Get the Google OAuth URL from our API
      const response = await apiService.getGoogleAuthUrl();
      
      if (isMobile) {
        // Mobile: Use redirect flow
        localStorage.setItem('returnTo', location.pathname);
        window.location.href = response.url;
      } else {
        // Desktop: Use popup flow to preserve app state
        const popup = window.open(
          response.url,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          // Fallback to redirect if popup is blocked
          localStorage.setItem('returnTo', location.pathname);
          window.location.href = response.url;
          return;
        }

        // Listen for popup to close
        const checkClosed = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(checkClosed);
              setLoginLoading(false);
              // Check if authentication was successful by checking localStorage
              const token = localStorage.getItem('authToken');
              const savedUser = localStorage.getItem('user');
              if (token && savedUser) {
                onLogin(JSON.parse(savedUser), token);
              }
            }
          } catch {
            // Popup closed or cross-origin error
            clearInterval(checkClosed);
            setLoginLoading(false);
          }
        }, 1000);
      }

    } catch (error) {
      console.error('Failed to initiate Google login:', error);
      setLoginLoading(false);
    }
  };

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
            <SidebarLink 
              to="/posts" 
              onClick={() => {
                setOpen(false);
                onPostsClick?.();
              }}
            >
              POSTS
            </SidebarLink>
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
                  // Save current location for return after login
                  localStorage.setItem('returnTo', location.pathname);
                  handleGoogleLogin();
                }}
                disabled={loginLoading}
              >
                {loginLoading ? 'LOGGING IN...' : 'LOGIN'}
              </SidebarButton>
            )}
          </SidebarItem>
          {user && onLogout && (
            <SidebarItem>
              <LogoutButton onClick={() => {
                setOpen(false);
                onLogout();
              }}>
                LOGOUT
              </LogoutButton>
            </SidebarItem>
          )}
        </SidebarLinks>
      </Sidebar>
    </>
  );
};

export default SidebarNav;
