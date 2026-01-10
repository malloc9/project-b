import { vi } from 'vitest';
import React from 'react';

export const applyI18nTestMocks = () => {
  const translations: Record<string, Record<string, string>> = {
    en: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      noUpcomingEvents: 'No upcoming events',
      today: 'Today',
      tomorrow: 'Tomorrow',
      upcoming: 'Upcoming',
    },
    hu: {
      save: 'Mentés',
      cancel: 'Mégse',
      close: 'Bezárás',
      noUpcomingEvents: 'Nincs közelgő esemény',
      today: 'Ma',
      tomorrow: 'Holnap',
      upcoming: 'Következő',
    },
  };

  let currentLanguage: string = 'en';
  const t = (key: string) => {
    const k = key.includes(':') ? key.split(':')[1] : key;
    const map = translations[currentLanguage] || {};
    return map[k] ?? map[k.toLowerCase()] ?? k;
  };

  const i18n = {
    language: currentLanguage,
    changeLanguage: (lng: string) => {
      currentLanguage = lng;
      i18n.language = lng;
    },
  };

  vi.mock('react-i18next', () => ({
    useTranslation: () => ({
      t,
      i18n,
      tCommon: t,
      tNavigation: t,
      tAuth: t,
      tDashboard: t,
      tForms: t,
      tErrors: t,
      language: currentLanguage,
      changeLanguage: (lng: string) => { i18n.language = lng; currentLanguage = lng; },
      isLoading: false,
      error: null,
      supportedLanguages: [
        { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
        { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
      ],
      currentLanguageConfig: { code: currentLanguage, name: currentLanguage === 'en' ? 'English' : 'Hungarian', nativeName: currentLanguage === 'en' ? 'English' : 'Magyar', flag: currentLanguage === 'en' ? '🇺🇸' : '🇭🇺' },
      isRTL: false,
    }),
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: { type: '3rdParty', init: () => {} },
  }));
};
