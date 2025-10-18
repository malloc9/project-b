import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { OfflineIndicator } from '../offline/OfflineIndicator';
import { LanguageSelector } from '../i18n/LanguageSelector';
import { useTranslation } from '../../hooks/useTranslation';

interface NavigationItem {
  nameKey: string;
  href: string;
  icon: string;
}

const navigationItems: NavigationItem[] = [
  { nameKey: 'navigation:dashboard', href: '/', icon: '🏠' },
  { nameKey: 'navigation:plantCodex', href: '/plants', icon: '🌱' },
  { nameKey: 'navigation:projects', href: '/projects', icon: '🔨' },
  { nameKey: 'navigation:tasks', href: '/tasks', icon: '✅' },
  { nameKey: 'navigation:calendar', href: '/calendar', icon: '📅' },
];

export function NavigationBar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t, isLoading } = useTranslation();

  // Provide fallback text while translations are loading
  const safeT = (key: string, fallback: string) => {
    if (isLoading) return fallback;
    return t(key, { defaultValue: fallback });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🏡</span>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                {safeT('navigation:householdManagement', 'Household Management')}
              </span>
              <span className="text-xl font-bold text-gray-900 sm:hidden">
                {safeT('common:home', 'Home')}
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.nameKey}
                to={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActiveRoute(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{safeT(item.nameKey, item.nameKey.split(':')[1] || item.nameKey)}</span>
              </Link>
            ))}
          </div>

          {/* User menu and mobile menu button */}
          <div className="flex items-center space-x-4">
            {/* Offline indicator */}
            <OfflineIndicator />
            
            {/* Language selector - tablet and mobile */}
            <div className="hidden md:block lg:hidden">
              <LanguageSelector 
                compact={true}
                showFlag={true}
                showNativeName={true}
                isMobile={false}
              />
            </div>
            
            {/* User info - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-3">
              <span className="text-sm text-gray-700">
                {user?.displayName || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {safeT('navigation:signOut', 'Sign Out')}
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">{safeT('navigation:openMainMenu', 'Open main menu')}</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
            {navigationItems.map((item) => (
              <Link
                key={item.nameKey}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActiveRoute(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{safeT(item.nameKey, item.nameKey.split(':')[1] || item.nameKey)}</span>
              </Link>
            ))}
            
            {/* Mobile language selector */}
            <div className="px-3 py-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-800">{safeT('common:language', 'Language')}</span>
                <LanguageSelector 
                  compact={false}
                  showFlag={true}
                  showNativeName={true}
                  isMobile={true}
                />
              </div>
            </div>
            
            {/* Mobile user menu */}
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="px-3 py-2">
                <div className="text-base font-medium text-gray-800">
                  {user?.displayName || safeT('navigation:user', 'User')}
                </div>
                <div className="text-sm text-gray-500">
                  {user?.email}
                </div>
              </div>
              <div className="px-3">
                <button
                  onClick={handleLogout}
                  className="w-full text-left bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {safeT('navigation:signOut', 'Sign Out')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}