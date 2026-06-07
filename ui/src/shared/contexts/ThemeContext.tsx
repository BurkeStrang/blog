import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { userPreferencesService } from '../services/userPreferencesService';
import { useAuth } from './AuthContext';

type Theme = 'dark' | 'light';

const META_THEME_COLORS: Record<Theme, string> = {
  dark: '#010101',
  light: '#e6e6e6',
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

const STORAGE_KEY = 'theme';

function readLocalTheme(): Theme | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : null;
}

function readSystemTheme(): Theme {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }

  return 'dark';
}

function resolveInitialTheme(): Theme {
  return readLocalTheme() ?? readSystemTheme();
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', META_THEME_COLORS[theme]);
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const userEmail = useAuth().user?.email;
  const [theme, setTheme] = useState<Theme>(() => {
    const resolved = resolveInitialTheme();
    applyTheme(resolved);
    return resolved;
  });

  // Track previous email to detect login/logout transitions
  const prevEmailRef = useRef<string | null | undefined>(undefined);

  // Apply theme to DOM synchronously before paint
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Persist to single localStorage key on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // When user logs in, fetch their DB preference and apply it
  useEffect(() => {
    const prevEmail = prevEmailRef.current;
    prevEmailRef.current = userEmail;

    // Only fetch on login (null/undefined → email)
    if (!userEmail || userEmail === prevEmail) return;

    userPreferencesService.get().then(prefs => {
      if (prefs) {
        setTheme(prefs.theme);
      }
    });
  }, [userEmail]);

  const toggleTheme = useCallback(() => {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      // Save to DB if logged in (fire and forget)
      if (userEmail) {
        userPreferencesService.save(next);
      }
      return next;
    });
  }, [userEmail]);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
