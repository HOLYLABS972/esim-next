'use client';

import { I18nProvider } from '../contexts/I18nContext';

const LanguageWrapper = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

export default LanguageWrapper;
