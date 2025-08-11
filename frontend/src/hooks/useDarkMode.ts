import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface UseDarkModeReturn {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

export function useDarkMode(): UseDarkModeReturn {
  // Check system preference first, then localStorage, default to dark
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

  // Update document class and localStorage when theme changes
  const setDark = (dark: boolean) => {
    setIsDarkState(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggle = () => {
    setDark(!isDark);
  };

  // Initialize theme on mount
  useEffect(() => {
    setDark(isDark);
  }, []);

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