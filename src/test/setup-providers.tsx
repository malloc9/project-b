import React from 'react';
import * as RTL from '@testing-library/react';
import { I18nProvider } from '../contexts/I18nContext';
import { AuthProvider } from '../contexts/AuthContext';

// Providers to wrap every test by default
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(AuthProvider, null, React.createElement(I18nProvider, null, children));

// Patch RTL render to always use the wrapper

const originalRender: any = (RTL as any).render;
// @ts-expect-error - patching runtime
RTL.render = (ui: any, options: any = {}) => {
  return originalRender(ui, { wrapper: AllTheProviders, ...options });
};

export { AllTheProviders };
