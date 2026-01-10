import React from 'react';

import { I18nProvider } from '../contexts/I18nContext';
import { AuthProvider } from '../contexts/AuthContext';

// Providers to wrap every test by default
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(AuthProvider, null, React.createElement(I18nProvider, null, children));

export { AllTheProviders };
