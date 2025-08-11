import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinkClass = (path: string) => {
    return isActive(path)
      ? 'text-red-600 bg-red-50 px-3 py-2 rounded-md text-sm font-medium'
      : 'text-gray-600 hover:text-red-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-red-600">BattleSync</span>
                <span className="ml-2 text-sm text-gray-500">v2.10.0</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-1">
              <Link to="/" className={navLinkClass('/')}>
                Home
              </Link>
              <Link to="/armies" className={navLinkClass('/armies')}>
                Armies
              </Link>
              <Link to="/battles" className={navLinkClass('/battles')}>
                Battles
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>BattleSync v2 - Simple OPR Battle Tracker</p>
            <p className="mt-1">
              Built with React + TypeScript + Express + SQLite
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}