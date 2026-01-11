import React, { useState, useRef, useEffect } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { getFormattedBuildTime } from '../../utils/buildInfo';

const BuildInfo: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePopover = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formattedTime = getFormattedBuildTime(i18n.language);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={togglePopover}
        className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        aria-label={t('common:buildInfo.label', { defaultValue: 'App Information' })}
      >
        <InformationCircleIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="text-xs text-gray-500">
            <span className="font-semibold">{t('common:buildInfo.prefix', { defaultValue: 'Built on' })}:</span>{' '}
            {formattedTime}
          </div>
          <div className="absolute bottom-[-6px] left-3 w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default BuildInfo;
