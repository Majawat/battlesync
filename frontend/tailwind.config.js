/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Battle-themed dark colors for high visibility
        'battle-bg': {
          light: '#f8fafc',
          dark: '#0f0f0f', // Deep black for reduced eye strain
        },
        'battle-surface': {
          light: '#ffffff',
          dark: '#1a1a1a', // Dark charcoal for cards/surfaces
        },
        'battle-border': {
          light: '#e2e8f0',
          dark: '#2d2d2d', // Visible borders in dark
        },
        'battle-text': {
          primary: {
            light: '#1e293b',
            dark: '#f1f5f9', // High contrast white
          },
          secondary: {
            light: '#64748b',
            dark: '#94a3b8', // Muted but visible
          },
          muted: {
            light: '#94a3b8',
            dark: '#64748b',
          },
        },
        // Status colors optimized for both themes
        'battle-status': {
          normal: '#10b981', // Bright green - visible in both themes
          shaken: '#f59e0b', // Bright yellow - visible in both themes  
          routed: '#ef4444', // Bright red - visible in both themes
          health: {
            full: '#10b981',
            damaged: '#f59e0b',
            critical: '#ef4444',
          }
        },
        // Theme-aware accent colors
        'battle-accent': {
          primary: {
            light: '#dc2626', // Red for light theme
            dark: '#f87171', // Lighter red for dark theme
          },
          secondary: {
            light: '#64748b',
            dark: '#94a3b8',
          }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}