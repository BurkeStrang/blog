import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAuthenticationReturn extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  validateToken: () => Promise<boolean>;
}

/**
 * Centralized authentication hook to eliminate duplicate OAuth logic
 * Used by: AppContent, PostDetail, SideBar, Comments
 */
export const useAuthentication = (): UseAuthenticationReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null
  });

  // Mobile detection - consolidated logic
  const isMobile = useCallback(() => {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Validate existing token
  const validateToken = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('github_token');
    if (!token) return false;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          user: {
            id: userData.id.toString(),
            username: userData.login,
            avatar_url: userData.avatar_url
          },
          isLoading: false,
          error: null
        });
        return true;
      } else {
        localStorage.removeItem('github_token');
        return false;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('github_token');
      return false;
    }
  }, []);

  // Login with OAuth popup/redirect logic
  const login = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'user:email';
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    try {
      if (isMobile()) {
        // Mobile: use redirect
        window.location.href = authUrl;
      } else {
        // Desktop: use popup
        const popup = window.open(
          authUrl,
          'github-oauth',
          'width=600,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          throw new Error('Popup blocked - please allow popups for authentication');
        }

        // Listen for popup completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // Check if token was set by callback
            const token = localStorage.getItem('github_token');
            if (token) {
              validateToken();
            } else {
              setAuthState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: 'Authentication was cancelled' 
              }));
            }
          }
        }, 1000);
      }
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }));
    }
  }, [isMobile, validateToken]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('github_token');
    setAuthState({
      user: null,
      isLoading: false,
      error: null
    });
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    validateToken().then(isValid => {
      if (!isValid) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });
  }, [validateToken]);

  return {
    ...authState,
    login,
    logout,
    validateToken
  };
};