import { vi } from "vitest";
import React from "react";

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
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "today": "Today",
    "tomorrow": "Tomorrow",
    "noUpcomingEvents": "No upcoming events",
    "validation:required": "This field is required",
    "system:updateAvailable": "Update available",
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
    "loading": "Töltés...",
    "save": "Mentés",
    "cancel": "Mégsem",
    "close": "Bezárás",
    "today": "Ma",
    "tomorrow": "Holnap",
    "noUpcomingEvents": "Nincs közelgő esemény",
    "validation:required": "Ez a mező kötelező",
    "system:updateAvailable": "Rendszerfrissítés elérhető",
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
  return React.createElement(React.Fragment, null, children);
};
export const initReactI18next = { type: "3rdParty", init: vi.fn() };
export const setLanguage = (lang: Lang) => {
  currentLang = lang;
};
