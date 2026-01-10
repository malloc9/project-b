import React from 'react';
import * as RTL from '@testing-library/react';
import { I18nProvider } from '../contexts/I18nContext';
import { AuthProvider } from '../contexts/AuthContext';

// Providers to wrap every test by default
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <I18nProvider>{children}</I18nProvider>
  </AuthProvider>
);

// Patch RTL render to always use the wrapper
// @ts-ignore - patching runtime of the testing library
const originalRender = RTL.render;
// @ts-expect-error - allow overriding RTL.render for wrapper injection
RTL.render = (ui: any, options: any = {}) => {
  return originalRender(ui, { wrapper: AllTheProviders, ...options });
};

export { AllTheProviders };
