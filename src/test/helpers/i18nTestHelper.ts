export type LangCode = 'en' | 'hu'

export const translations: Record<LangCode, Record<string, string>> = {
  en: {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    noUpcomingEvents: 'No upcoming events',
    today: 'Today',
    tomorrow: 'Tomorrow',
    upcoming: 'Upcoming',
    'validation.required': 'This field is required',
    loading: 'Loading',
    updateAvailable: 'Update Available',
  },
  hu: {
    save: 'Mentés',
    cancel: 'Mégse',
    close: 'Bezárás',
    noUpcomingEvents: 'Nincsenek közelgő események',
    today: 'Ma',
    tomorrow: 'Holnap',
    upcoming: 'Következő',
    'validation.required': 'Ez a mező kötelező',
  },
};

let currentLang: LangCode = 'en';

export const translate = (key: string, defaultValue?: string) => {
  const k = key.includes(':') ? key.split(':')[1] : key;
  const map = translations[currentLang] || {};
  if (k in map) return (map as any)[k];
  const lower = k.toLowerCase();
  if (lower in map) return (map as any)[lower];
  if (typeof defaultValue === 'string') return defaultValue;
  return k;
}

export const setLang = (lang: LangCode) => {
  currentLang = lang;
};

export const getCurrentLang = (): LangCode => currentLang;

export const i18nCore = {
  language: currentLang,
  changeLanguage: (lng: LangCode) => {
    currentLang = lng;
  },
};

export default { translate, setLang, getCurrentLang, i18nCore } as const
