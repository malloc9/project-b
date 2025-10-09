import { useState } from 'react';
import { NavigationBar } from './NavigationBar';
import { Sidebar } from './Sidebar';
import { LanguageSelector } from '../i18n/LanguageSelector';
import { useTranslation } from '../../hooks/useTranslation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { t } = useTranslation();

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar - visible on all screen sizes */}
      <div className="lg:hidden">
        <NavigationBar />
      </div>

      <div className="flex h-screen lg:h-auto">
        {/* Desktop Sidebar - always visible on large screens */}
        <div className="hidden lg:block">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Mobile Sidebar - overlay on small screens */}
        <div className="lg:hidden">
          <Sidebar isOpen={isMobileSidebarOpen} onClose={closeMobileSidebar} />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {t('navigation:welcomeToDashboard')}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector 
                className="z-10"
                compact={false}
                showFlag={true}
                showNativeName={true}
                isMobile={false}
              />
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile menu button - floating action button */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <span className="sr-only">{t('navigation:openNavigationMenu')}</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}