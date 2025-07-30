"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageContextValue {
  preferredLanguage: string;
  setPreferredLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preferredLanguage, setPreferredLanguage] = useState<string>('English');

  return (
    <LanguageContext.Provider value={{ preferredLanguage, setPreferredLanguage }}>
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