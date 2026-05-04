import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { User } from "../types/user";
import { apiService } from "../../services/api";

interface AuthContextValue {
  user: User | null;
  loginLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isMobileUA = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const loginIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loginListenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // Track current pathname in a ref so callbacks below can read it without
  // re-creating their identity on every navigation (which would re-render
  // every useAuth consumer in the tree).
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Initial auth check on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupt storage — ignore
      }
    }
  }, []);

  const login = useCallback(
    (userData: User, token: string) => {
      setUser(userData);
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(userData));

      const currentPath = pathnameRef.current;
      const returnTo = localStorage.getItem("returnTo");
      if (returnTo && returnTo !== currentPath) {
        localStorage.removeItem("returnTo");
        navigate(returnTo);
      } else if (!returnTo && currentPath === "/") {
        navigate("/posts");
      } else {
        localStorage.removeItem("returnTo");
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }, []);

  // Periodic token validation
  useEffect(() => {
    const checkTokenPeriodically = () => {
      const token = localStorage.getItem("authToken");
      if (!token || !user) return;

      try {
        const parts = token.split(".");
        if (parts.length !== 3) {
          logout();
          return;
        }

        const payload = JSON.parse(atob(parts[1]));

        if (payload.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = payload.exp - currentTime;

          if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
            console.warn("Token expires soon, user should re-authenticate");
          }

          if (timeUntilExpiry <= 0) {
            window.dispatchEvent(
              new CustomEvent("auth-error", {
                detail: {
                  message: "Your session has expired. Please sign in again.",
                  reason: "token_expired",
                },
              }),
            );
          }
        }
      } catch (error) {
        console.warn("Failed to parse JWT token during periodic check:", error);
        logout();
      }
    };

    const interval = setInterval(checkTokenPeriodically, 60000);
    checkTokenPeriodically();

    return () => clearInterval(interval);
  }, [user, logout]);

  // OAuth success event (from popup or redirect callback)
  useEffect(() => {
    const handleOAuthSuccess = (event: CustomEvent) => {
      setUser(event.detail.user);
    };
    window.addEventListener(
      "oauth-success",
      handleOAuthSuccess as EventListener,
    );
    return () =>
      window.removeEventListener(
        "oauth-success",
        handleOAuthSuccess as EventListener,
      );
  }, []);

  // Auth error event — clear user silently.
  useEffect(() => {
    const handleAuthError = () => {
      setUser(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    };
    window.addEventListener("auth-error", handleAuthError as EventListener);
    return () =>
      window.removeEventListener(
        "auth-error",
        handleAuthError as EventListener,
      );
  }, []);

  // Cleanup any in-flight OAuth resources on unmount
  useEffect(() => {
    return () => {
      if (loginIntervalRef.current) clearInterval(loginIntervalRef.current);
      if (loginListenerRef.current)
        window.removeEventListener("message", loginListenerRef.current);
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (loginLoading) return;

    try {
      setLoginLoading(true);
      const response = await apiService.getGoogleAuthUrl();

      if (isMobileUA()) {
        localStorage.setItem("returnTo", pathnameRef.current);
        window.location.href = response.url;
        return;
      }

      const popup = window.open(
        response.url,
        "google-oauth",
        "width=500,height=600,scrollbars=yes,resizable=yes",
      );

      if (!popup) {
        // Popup blocked — fall back to redirect
        localStorage.setItem("returnTo", pathnameRef.current);
        window.location.href = response.url;
        return;
      }

      const cleanup = () => {
        if (loginIntervalRef.current) {
          clearInterval(loginIntervalRef.current);
          loginIntervalRef.current = null;
        }
        if (loginListenerRef.current) {
          window.removeEventListener("message", loginListenerRef.current);
          loginListenerRef.current = null;
        }
      };

      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "OAUTH_SUCCESS") {
          cleanup();
          setLoginLoading(false);
          login(event.data.user, event.data.token);
        }

        if (event.data.type === "OAUTH_ERROR") {
          cleanup();
          setLoginLoading(false);
          console.error("OAuth error:", event.data.error);
        }
      };

      loginListenerRef.current = messageListener;
      window.addEventListener("message", messageListener);

      // localStorage polling fallback (popup.closed unreliable under COOP)
      const popupStartTime = Date.now();
      loginIntervalRef.current = setInterval(() => {
        const token = localStorage.getItem("authToken");
        const savedUser = localStorage.getItem("user");
        if (token && savedUser) {
          cleanup();
          setLoginLoading(false);
          try {
            login(JSON.parse(savedUser), token);
          } catch {
            // ignore parse error
          }
          return;
        }

        if (Date.now() - popupStartTime > 300000) {
          cleanup();
          setLoginLoading(false);
          console.warn(
            "OAuth popup timeout - authentication may have failed",
          );
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to initiate Google login:", error);
      setLoginLoading(false);
    }
  }, [loginLoading, login]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loginLoading, login, logout, loginWithGoogle }),
    [user, loginLoading, login, logout, loginWithGoogle],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
