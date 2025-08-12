import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import DarkModeToggle from './DarkModeToggle';

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
      ? 'nav-link nav-link-active'
      : 'nav-link nav-link-inactive';
  };

  return (
    <div className="min-h-screen bg-battle-bg-light dark:bg-battle-bg-dark transition-colors duration-300">
      {/* Navigation */}
      <nav className="bg-battle-surface-light dark:bg-battle-surface-dark shadow-sm border-b border-battle-border-light dark:border-battle-border-dark transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-battle-accent-primary-light dark:text-battle-accent-primary-dark">BattleSync</span>
                <span className="ml-2 text-sm text-battle-text-muted-light dark:text-battle-text-muted-dark">v2.11.1</span>
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
              
              {/* Dark Mode Toggle */}
              <DarkModeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-battle-surface-light dark:bg-battle-surface-dark border-t border-battle-border-light dark:border-battle-border-dark mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-battle-text-muted-light dark:text-battle-text-muted-dark">
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