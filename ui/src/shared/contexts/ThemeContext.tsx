import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { userPreferencesService } from '../../services/userPreferencesService';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

const STORAGE_KEY = 'theme';

function readLocalTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
}

interface ThemeProviderProps {
  userEmail?: string | null;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ userEmail, children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const resolved = readLocalTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    return resolved;
  });

  // Track previous email to detect login/logout transitions
  const prevEmailRef = useRef<string | null | undefined>(undefined);

  // Apply theme to DOM synchronously before paint
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
