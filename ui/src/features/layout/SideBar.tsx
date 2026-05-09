import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, Navigate } from "react-router-dom";
import styled, { css } from "styled-components";
import { primary } from "../../shared/theme/colors";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useTheme } from "../../shared/contexts/ThemeContext";
import { useAuth } from "../../shared/contexts/AuthContext";

// Sidebar container
const Sidebar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: clamp(296px, 22vw, 360px);
  padding: 1.1rem 1rem;
  background: color-mix(in srgb, var(--color-bg) 94%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--color-sidebar-link) 16%, transparent);
  border-radius: 0;
  z-index: 200;
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.24s ease;
  transform: translateX(-100%);
  opacity: 0;
  contain: paint;
  isolation: isolate;
  backface-visibility: hidden;
  will-change: transform;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &[data-open="true"] {
    transform: translateX(0);
    opacity: 1;
  }

  @media (max-width: 768px) {
    width: min(248px, 68vw);
    padding: 0.9rem 0.75rem;
  }

  @media (max-width: 480px) {
    width: min(196px, 58vw);
    padding: 0.7rem 0.55rem;
  }

  @media (max-width: 320px) {
    width: min(176px, 56vw);
    padding: 0.6rem 0.5rem;
  }

  @media (max-height: 600px) {
    padding: 0.9rem 0.85rem;
  }

  @media (max-height: 450px) {
    padding: 0.75rem;
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

const HamburgerBtn = styled.button<{ $open: boolean }>`
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-bg) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-link) 18%, transparent);
  color: var(--color-lightgrey);
  cursor: pointer;
  font-size: 1.7rem;
  padding: 0;
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease,
    opacity 0.2s ease;
  border-radius: 14px;
  backface-visibility: hidden;
  opacity: ${({ $open }) => ($open ? 0 : 1)};
  pointer-events: ${({ $open }) => ($open ? "none" : "auto")};

  &:hover {
    background: color-mix(in srgb, var(--color-sidebar-hover-bg) 85%, transparent);
    color: var(--color-primary);
    border-color: color-mix(in srgb, var(--color-sidebar-link) 28%, transparent);
  }

  @media (max-height: 800px) {
    top: 0.6rem;
    left: 0.6rem;
    width: 48px;
    height: 48px;
    font-size: 1.55rem;
  }

  @media (max-height: 600px) {
    top: 0.4rem;
    left: 0.4rem;
    width: 44px;
    height: 44px;
    font-size: 1.35rem;
  }

  @media (max-height: 450px) {
    top: 0.25rem;
    left: 0.25rem;
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  @media (max-width: 768px) {
    top: 0.7rem;
    left: 0.7rem;
    width: 42px;
    height: 42px;
    font-size: 1.3rem;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    top: 0.45rem;
    left: 0.45rem;
    width: 34px;
    height: 34px;
    font-size: 1.05rem;
    border-radius: 10px;
  }

  @media (max-width: 320px) {
    top: 0.35rem;
    left: 0.35rem;
    width: 30px;
    height: 30px;
    font-size: 0.95rem;
    border-radius: 9px;
  }
`;

const SidebarContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const SidebarHeader = styled.div`
  padding: 0.5rem 0.5rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-sidebar-link) 12%, transparent);
  margin-bottom: 1rem;

  @media (max-width: 480px) {
    padding: 0.35rem 0.35rem 0.65rem;
    margin-bottom: 0.7rem;
  }
`;

const SidebarEyebrow = styled.span`
  display: inline-block;
  font-family: var(--font-family);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-sidebar-link) 65%, var(--color-readable-lightgrey));
  margin-bottom: 0.4rem;
`;

const SidebarTitle = styled.h2`
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--color-readable-lightgrey);

  @media (max-width: 480px) {
    font-size: 0.92rem;
  }
`;

const SidebarLinks = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0 0.35rem 0.2rem;
  margin: 0;
  list-style: none;
  flex: 1;
  min-height: 0;
  justify-content: flex-start;
  overflow-y: auto;

  @media (max-height: 800px) {
    gap: 0.45rem;
  }

  @media (max-height: 600px) {
    gap: 0.35rem;
  }

  @media (max-height: 450px) {
    gap: 0.25rem;
  }

  @media (max-width: 480px) {
    gap: 0.35rem;
    padding: 0 0.15rem 0.15rem;
  }
`;

const SidebarItem = styled.li`
  margin: 0;
`;

const SidebarGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AccountSection = styled(SidebarSection)`
  margin-top: 0.25rem;
`;

const SidebarSectionLabel = styled.span`
  padding: 0 0.9rem;
  font-family: var(--font-family);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-sidebar-link) 54%, var(--color-readable-lightgrey));

  @media (max-width: 480px) {
    padding: 0 0.55rem;
    font-size: 0.56rem;
    letter-spacing: 0.12em;
  }
`;

const SidebarActionContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
`;

const SidebarActionIcon = styled.span`
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--color-sidebar-link);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 1.45rem;
    height: 1.45rem;
    border-radius: 8px;
  }
`;

const SidebarActionText = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.08rem;
  min-width: 0;
`;

const SidebarActionLabel = styled.span`
  font-family: var(--font-family-display);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: inherit;
  text-transform: uppercase;

  @media (max-width: 480px) {
    font-size: 0.7rem;
  }
`;

const sidebarLinkBase = css`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 0.85rem 0.95rem;
  color: var(--color-readable-lightgrey);
  font-family: var(--font-family-display);
  text-decoration: none;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.05;
  letter-spacing: 0.02em;
  border: 1px solid color-mix(in srgb, var(--color-sidebar-link) 10%, transparent);
  border-radius: 14px;
  background: transparent;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    text-shadow 0.2s ease;

  &:hover {
    color: color-mix(in srgb, var(--color-sidebar-link) 38%, white 26%);
    background: color-mix(in srgb, var(--color-sidebar-hover-bg) 72%, transparent);
    border-color: color-mix(in srgb, var(--color-sidebar-link) 20%, transparent);
  }

  &.active {
    color: var(--color-primary);
    text-shadow: none;
    background: color-mix(in srgb, var(--color-sidebar-active-bg) 82%, transparent);
    border-color: color-mix(in srgb, var(--color-sidebar-link) 28%, transparent);
  }

  @media (max-height: 800px) {
    padding: 0.78rem 0.9rem;
  }

  @media (max-height: 600px) {
    padding: 0.68rem 0.8rem;
    font-size: 0.9rem;
  }

  @media (max-height: 450px) {
    padding: 0.56rem 0.7rem;
    font-size: 0.8rem;
  }

  @media (max-width: 480px) {
    gap: 0.45rem;
    padding: 0.5rem 0.55rem;
    font-size: 0.72rem;
    border-radius: 10px;
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
  text-align: left;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ProfileSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.7rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.85rem 0.95rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--color-sidebar-link) 14%, transparent);
  border-radius: 14px;
  margin: 0 auto;

  @media (max-width: 480px) {
    gap: 0.45rem;
    padding: 0.55rem;
    border-radius: 10px;
  }
`;

const ProfileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const ProfilePicture = styled.img`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid ${primary};
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);

  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
  }
`;

const ProfileMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
`;

const ProfileLabel = styled.span`
  font-family: var(--font-family);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-sidebar-link) 54%, var(--color-readable-lightgrey));
`;

const UserName = styled.span`
  font-family: var(--font-family-display);
  font-weight: 700;
  color: var(--color-readable-lightgrey);
  font-size: 0.92rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 480px) {
    font-size: 0.72rem;
  }
`;

const LogoutButton = styled(SidebarButton)`
  color: #b06e6e;

  &:hover {
    color: #b06e6e;
    border-color: rgba(176, 110, 110, 0.28);
    background:
      linear-gradient(180deg, rgba(176, 110, 110, 0.08), transparent),
      rgba(176, 110, 110, 0.08);
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

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Redirect if at root
  if (location.pathname === "/") {
    return <Navigate to="/posts" replace />;
  }

  return (
    <>
      <HamburgerContainer ref={hamburgerRef}>
        <HamburgerBtn $open={open} aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          <MenuRoundedIcon fontSize="inherit" />
        </HamburgerBtn>
      </HamburgerContainer>

      <Sidebar ref={sidebarRef} data-open={open} aria-label="Sidebar navigation">
        <SidebarContent>
          <SidebarHeader>
            <SidebarEyebrow>BRXSTNG</SidebarEyebrow>
            <SidebarTitle>Navigation</SidebarTitle>
          </SidebarHeader>

          <SidebarLinks>
            <SidebarGroup>
              <SidebarSection>
                <SidebarSectionLabel>Explore</SidebarSectionLabel>
                <SidebarItem>
                  <SidebarLink
                    to="/about"
                    onClick={() => {
                      onNavigateStart?.("/about");
                      setOpen(false);
                    }}
                  >
                    <SidebarActionContent>
                      <SidebarActionIcon>
                        <InfoOutlinedIcon sx={{ fontSize: "1.1rem" }} />
                      </SidebarActionIcon>
                      <SidebarActionText>
                        <SidebarActionLabel>About</SidebarActionLabel>
                      </SidebarActionText>
                    </SidebarActionContent>
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
                    <SidebarActionContent>
                      <SidebarActionIcon>
                        <ArticleOutlinedIcon sx={{ fontSize: "1.1rem" }} />
                      </SidebarActionIcon>
                      <SidebarActionText>
                        <SidebarActionLabel>Posts</SidebarActionLabel>
                      </SidebarActionText>
                    </SidebarActionContent>
                  </SidebarLink>
                </SidebarItem>
              </SidebarSection>

              <SidebarSection>
                <SidebarSectionLabel>Preferences</SidebarSectionLabel>
                <SidebarItem>
                  <SidebarButton type="button" onClick={toggleTheme}>
                    <SidebarActionContent>
                      <SidebarActionIcon>
                        {theme === "dark" ? (
                          <LightModeIcon sx={{ fontSize: "1.1rem" }} />
                        ) : (
                          <DarkModeIcon sx={{ fontSize: "1.1rem" }} />
                        )}
                      </SidebarActionIcon>
                      <SidebarActionText>
                        <SidebarActionLabel>{theme === "dark" ? "Light mode" : "Dark mode"}</SidebarActionLabel>
                      </SidebarActionText>
                    </SidebarActionContent>
                  </SidebarButton>
                </SidebarItem>
              </SidebarSection>
            </SidebarGroup>

            <AccountSection>
              <SidebarSectionLabel>Account</SidebarSectionLabel>
              <SidebarItem>
                {user ? (
                  <ProfileSection>
                    <ProfileInfo>
                      <ProfilePicture
                        src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0ff&color=000`}
                        alt={user.name}
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0ff&color=000`;
                        }}
                      />
                      <ProfileMeta>
                        <ProfileLabel>Signed in</ProfileLabel>
                        <UserName>{user.name}</UserName>
                      </ProfileMeta>
                    </ProfileInfo>
                  </ProfileSection>
                ) : (
                  <SidebarButton
                    type="button"
                    onClick={() => {
                      localStorage.setItem("returnTo", location.pathname);
                      setOpen(false);
                      loginWithGoogle();
                    }}
                    disabled={loginLoading}
                    >
                      <SidebarActionContent>
                        <SidebarActionIcon>
                          <LoginRoundedIcon sx={{ fontSize: "1.1rem" }} />
                        </SidebarActionIcon>
                        <SidebarActionText>
                          <SidebarActionLabel>{loginLoading ? "Logging in..." : "Google OAuth login"}</SidebarActionLabel>
                        </SidebarActionText>
                      </SidebarActionContent>
                    </SidebarButton>
                )}
              </SidebarItem>
              {user && (
                <SidebarItem>
                  <LogoutButton
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                  >
                    <SidebarActionContent>
                      <SidebarActionIcon>
                        <LogoutRoundedIcon sx={{ fontSize: "1.1rem" }} />
                      </SidebarActionIcon>
                      <SidebarActionText>
                        <SidebarActionLabel>Logout</SidebarActionLabel>
                      </SidebarActionText>
                    </SidebarActionContent>
                  </LogoutButton>
                </SidebarItem>
              )}
            </AccountSection>
          </SidebarLinks>
        </SidebarContent>
      </Sidebar>
    </>
  );
});

SidebarNav.displayName = "SidebarNav";

export default SidebarNav;
