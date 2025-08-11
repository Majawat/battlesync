import { renderHook, act } from '@testing-library/react';
import { useDarkMode } from './useDarkMode';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock matchMedia for system preference detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('useDarkMode', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    document.documentElement.className = '';
  });

  test('should default to system preference (dark)', () => {
    const { result } = renderHook(() => useDarkMode());
    
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('should toggle dark mode', () => {
    const { result } = renderHook(() => useDarkMode());
    
    act(() => {
      result.current.toggle();
    });
    
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(mockLocalStorage.getItem('theme')).toBe('light');
  });

  test('should persist theme preference in localStorage', () => {
    mockLocalStorage.setItem('theme', 'light');
    
    const { result } = renderHook(() => useDarkMode());
    
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('should set dark mode explicitly', () => {
    const { result } = renderHook(() => useDarkMode());
    
    act(() => {
      result.current.setDark(false);
    });
    
    expect(result.current.isDark).toBe(false);
    expect(mockLocalStorage.getItem('theme')).toBe('light');
  });

  test('should set light mode explicitly', () => {
    const { result } = renderHook(() => useDarkMode());
    
    act(() => {
      result.current.setDark(true);
    });
    
    expect(result.current.isDark).toBe(true);
    expect(mockLocalStorage.getItem('theme')).toBe('dark');
  });

  test('should update document class when theme changes', () => {
    const { result } = renderHook(() => useDarkMode());
    
    // Start dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Toggle to light
    act(() => {
      result.current.setDark(false);
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Toggle back to dark
    act(() => {
      result.current.setDark(true);
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});