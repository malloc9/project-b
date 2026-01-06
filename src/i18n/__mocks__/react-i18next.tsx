// src/i18n/__mocks__/react-i18next.tsx
import { vi } from 'vitest';
import React, { FC, ReactNode } from 'react';

// Actual i18n instance
import i18n from '../index';

// Mock I18nextProvider to simply render children
export const I18nextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Mock useTranslation to use the actual i18n instance
export const useTranslation = () => {
  return {
    t: (key: string, options?: any) => i18n.t(key, options),
    i18n: i18n,
  };
};

// Mock any other exports if needed
export const Trans: FC<{ i18nKey: string }> = ({ i18nKey }) => <>{i18nKey}</>;

// You can add other mocks here as needed by your tests
export const withTranslation = (Component: any) => (props: any) => {
  return <Component {...props} t={i18n.t} i18n={i18n} />;
};

vi.mock('react-i18next', async () => {
  const original = await vi.importActual('react-i18next');
  return {
    ...original,
    I18nextProvider: I18nextProvider,
    useTranslation: useTranslation,
    Trans: Trans,
    withTranslation: withTranslation,
  };
});
