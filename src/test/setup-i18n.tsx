// Minimal i18n mock for tests
import { vi } from 'vitest';

type Lang = 'en' | 'hu'
let testLang: Lang = 'en'

const translations: Record<Lang, Record<string, string>> = {
  en: {
    'common:save': 'Save',
    'common:cancel': 'Cancel',
    'common:close': 'Close'
  },
  hu: {
    'common:save': 'Mentés',
    'common:cancel': 'Mégsem',
    'common:close': 'Bezárás'
  }
}

export const useTranslation = () => ({
  t: (key: string) => translations[testLang][key] ?? key,
  i18n: {
    language: testLang,
    changeLanguage: (lang: Lang) => { testLang = lang; },
    isInitialized: true
  }
})

export const I18nextProvider = ({ children }: { children: any }) => <>{children}</>
export const initReactI18next = { type: '3rdParty', init: () => {} }
export const setLanguage = (lang: Lang) => { testLang = lang }
export const getCurrentLanguage = (): Lang => testLang
