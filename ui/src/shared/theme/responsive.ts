import { useState, useEffect } from 'react';

// Centralized breakpoints - no more magic numbers scattered everywhere
export const breakpoints = {
  mobile: '480px',
  tablet: '768px', 
  small: '390px',
  desktop: '1024px'
} as const;

// Media query helpers
export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
  small: `@media (max-width: ${breakpoints.small})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`
} as const;

// Common responsive patterns used throughout the app
export const responsivePatterns = {
  // Container widths
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    [media.tablet]: {
      padding: '0 15px'
    },
    [media.mobile]: {
      padding: '0 10px'
    }
  },

  // Text sizes
  headingLarge: {
    fontSize: '2.5rem',
    [media.tablet]: {
      fontSize: '2rem'
    },
    [media.mobile]: {
      fontSize: '1.75rem'
    }
  },

  headingMedium: {
    fontSize: '2rem',
    [media.tablet]: {
      fontSize: '1.75rem'
    },
    [media.mobile]: {
      fontSize: '1.5rem'
    }
  },

  // Button sizes
  buttonLarge: {
    padding: '12px 24px',
    fontSize: '1rem',
    [media.mobile]: {
      padding: '10px 20px',
      fontSize: '0.9rem'
    }
  },

  buttonSmall: {
    padding: '8px 16px',
    fontSize: '0.875rem',
    [media.mobile]: {
      padding: '6px 12px',
      fontSize: '0.8rem'
    }
  },

  // Form elements
  input: {
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
    [media.mobile]: {
      padding: '10px',
      fontSize: '16px' // Prevents zoom on iOS
    }
  },

  // Modal patterns
  modal: {
    maxWidth: '600px',
    margin: '20px',
    [media.tablet]: {
      maxWidth: '90vw',
      margin: '10px'
    },
    [media.mobile]: {
      maxWidth: '95vw',
      margin: '5px'
    }
  }
};

// Utility function to create responsive styles
export const createResponsiveStyles = <T extends Record<string, unknown>>(
  styles: T
): T => {
  return styles;
};

// Hook for detecting screen size
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width <= parseInt(breakpoints.mobile)) {
        setScreenSize('mobile');
      } else if (width <= parseInt(breakpoints.tablet)) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
};