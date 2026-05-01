import { useState, useEffect } from 'react';

const checkFontSync = (fontFamily: string): boolean => {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.check) {
    return false;
  }
  try {
    return document.fonts.check(`1em "${fontFamily}"`);
  } catch {
    return false;
  }
};

export const useFontLoaded = (fontFamily: string, timeout: number = 3000): boolean => {
  // Lazy initial state: if the font is already loaded (e.g. on remount after
  // initial page load), skip the one-frame "false" flash that conditional
  // renders gated on this hook produce.
  const [isLoaded, setIsLoaded] = useState(() => checkFontSync(fontFamily));

  useEffect(() => {
    if (isLoaded) return;

    // Check if font is already loaded
    if (document.fonts && document.fonts.check) {
      const checkFont = () => {
        const isReady = document.fonts.check(`1em "${fontFamily}"`);
        if (isReady) {
          setIsLoaded(true);
          return true;
        }
        return false;
      };

      // Check immediately
      if (checkFont()) {
        return;
      }

      // Set up font loading detection
      const timeoutId = setTimeout(() => {
        // Fallback: assume loaded after timeout
        setIsLoaded(true);
      }, timeout);

      // Listen for font load events
      const handleFontLoad = () => {
        if (checkFont()) {
          clearTimeout(timeoutId);
        }
      };

      if (document.fonts.ready) {
        document.fonts.ready.then(handleFontLoad);
      }

      // Also check periodically
      const intervalId = setInterval(() => {
        if (checkFont()) {
          clearTimeout(timeoutId);
          clearInterval(intervalId);
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    } else {
      // Fallback for browsers without font loading API
      const fallbackTimeout = setTimeout(() => {
        setIsLoaded(true);
      }, 1000);

      return () => clearTimeout(fallbackTimeout);
    }
  }, [fontFamily, timeout, isLoaded]);

  return isLoaded;
};