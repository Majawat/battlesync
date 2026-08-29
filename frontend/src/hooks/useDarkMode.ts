import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface UseDarkModeReturn {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

export function useDarkMode(): UseDarkModeReturn {
  // Dark mode is default - check stored preference first, then system preference
  const getInitialTheme = (): boolean => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      return stored === 'dark';
    }
    
    // Check system preference, default to dark for battle app
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    return true; // Default to dark mode
  };

  const [isDark, setIsDarkState] = useState<boolean>(getInitialTheme);

  const setDark = (dark: boolean) => {
    setIsDarkState(dark);
  };

  const toggle = () => {
    setDark(!isDark);
  };

  // Sync the document class + localStorage whenever the theme changes.
  // Also runs on mount to apply the initial theme.
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        setDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return {
    isDark,
    toggle,
    setDark,
  };
}