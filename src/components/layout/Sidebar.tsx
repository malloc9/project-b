import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface NavigationItem {
  nameKey: string;
  href: string;
  icon: string;
  descriptionKey: string;
}

const navigationItems: NavigationItem[] = [
  {
    nameKey: 'navigation:dashboard',
    href: '/',
    icon: '🏠',
    descriptionKey: 'navigation:overviewAndQuickAccess'
  },
  {
    nameKey: 'navigation:plantCodex',
    href: '/plants',
    icon: '🌱',
    descriptionKey: 'navigation:managePlantsAndPhotos'
  },
  {
    nameKey: 'navigation:projects',
    href: '/projects',
    icon: '🔨',
    descriptionKey: 'navigation:householdProjectsAndSubtasks'
  },
  {
    nameKey: 'navigation:tasks',
    href: '/tasks',
    icon: '✅',
    descriptionKey: 'navigation:simpleTaskManagement'
  },
  {
    nameKey: 'navigation:calendar',
    href: '/calendar',
    icon: '📅',
    descriptionKey: 'navigation:viewAllScheduledItems'
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay - only show on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden z-20"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-white transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:shadow-none lg:border-r lg:border-gray-200
        ${isOpen ? 'fixed inset-y-0 left-0 z-30 shadow-xl translate-x-0' : 'fixed inset-y-0 left-0 z-30 shadow-xl -translate-x-full'}
        lg:block
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2" onClick={onClose}>
              <span className="text-2xl">🏡</span>
              <span className="text-lg font-bold text-gray-900">
                {t('navigation:homeManager')}
              </span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">{t('navigation:closeSidebar')}</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav aria-label="Sidebar Navigation" className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.nameKey}
                to={item.href}
                onClick={onClose}
                className={`group flex flex-col p-3 rounded-lg text-sm font-medium transition-colors ${isActiveRoute(item.href)
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{t(item.nameKey)}</span>
                </div>
                <span className={`mt-1 text-xs ml-8 ${isActiveRoute(item.href) ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                  {t(item.descriptionKey)}
                </span>
              </Link>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              {t('navigation:version')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}