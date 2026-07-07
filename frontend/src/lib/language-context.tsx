'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ru from './locales/ru';
import en from './locales/en';

export type Locale = 'ru' | 'en';

const translations = { ru, en };

type TranslationKeys = typeof ru;

interface LanguageContextType {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ru');

  const t = translations[locale];

  const toggleLocale = useCallback(() => {
    setLocale(prev => prev === 'ru' ? 'en' : 'ru');
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale, toggleLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
