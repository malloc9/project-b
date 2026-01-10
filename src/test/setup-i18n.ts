import { vi } from "vitest";

type Lang = "en" | "hu";
let currentLang: Lang = "en";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    "common:save": "Save",
    "common:cancel": "Cancel",
    "common:close": "Close",
    "forms:save": "Save",
    "forms:cancel": "Cancel",
    "accessibility:close": "Close",
    "accessibility:loading": "Loading",
    "calendar:noUpcomingEvents": "No upcoming events",
    "ErrorMessage:header": "General.unknown Error",
    "ErrorMessage:retry": "Retry",
    "ErrorMessage:close": "Close",
  },
  hu: {
    "common:save": "Mentés",
    "common:cancel": "Mégsem",
    "common:close": "Bezárás",
    "forms:save": "Mentés",
    "forms:cancel": "Mégsem",
    "accessibility:close": "Bezárás",
    "accessibility:loading": "Töltés",
    "calendar:noUpcomingEvents": "Nincs közelgő esemény",
    "ErrorMessage:header": "Általános hiba",
    "ErrorMessage:retry": "Újrapróbálkozás",
    "ErrorMessage:close": "Bezárás",
  },
};

// Minimal mock of react-i18next API used by tests
export const useTranslation = () => ({
  t: (key: string) => translations[currentLang]?.[key] ?? key,
  i18n: {
    language: currentLang,
    changeLanguage: (lang: Lang) => {
      currentLang = lang;
    },
    isInitialized: true,
  },
});

export const I18nextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;\n};
export const initReactI18next = { type: "3rdParty", init: vi.fn() };
export const setLanguage = (lang: Lang) => {
  currentLang = lang;
};
