import React, { useState, useEffect } from 'react';

export const DiagnosticFooter: React.FC = () => {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Update viewport dimensions
  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Initial measurement
    updateViewport();

    // Listen for resize events
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Get current theme (assuming dark theme based on BattleSync styling)
  const getCurrentTheme = () => {
    // Check if dark mode class exists or system preference
    if (document.documentElement.classList.contains('dark')) {
      return 'Dark';
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'Dark (System)';
    } else {
      return 'Light';
    }
  };

  // Get responsive breakpoint info
  const getBreakpointInfo = () => {
    const width = viewport.width;
    if (width < 640) return 'Mobile (< 640px)';
    if (width < 768) return 'Small Tablet (640-767px)';
    if (width < 1024) return 'Tablet (768-1023px)';
    if (width < 1280) return 'Desktop (1024-1279px)';
    if (width < 1536) return 'Large Desktop (1280-1535px)';
    return 'XL Desktop (≥ 1536px)';
  };

  const theme = getCurrentTheme();
  const breakpoint = getBreakpointInfo();

  return (
    <>
      {/* Toggle Button - Fixed position */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 backdrop-blur-sm transition-colors"
        title="Toggle diagnostic info"
      >
        📊
      </button>

      {/* Diagnostic Footer - Only show when toggled */}
      {isVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-t border-gray-600 text-gray-300 text-xs py-2 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-blue-400 font-medium">Viewport:</span>
              <span>{viewport.width} × {viewport.height}px</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-green-400 font-medium">Breakpoint:</span>
              <span>{breakpoint}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-purple-400 font-medium">Theme:</span>
              <span>{theme}</span>
            </div>

            {/* Gaming tablet indicator */}
            {viewport.width === 800 && viewport.height === 1100 && (
              <div className="text-yellow-400 font-medium">
                🎮 Gaming Tablet (Perfect!)
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};