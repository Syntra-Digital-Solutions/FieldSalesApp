import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './translations';

const LanguageContext = createContext({ lang: 'en', toggleLang: () => {}, t: (k) => k });

const LANGS = ['en', 'tw', 'ee', 'dag', 'gur', 'ha'];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem('@app_lang').then((saved) => { 
      if (saved && LANGS.includes(saved)) setLang(saved); 
    });
  }, []);

  const toggleLang = async () => {
    const currentIndex = LANGS.indexOf(lang);
    const nextIndex = (currentIndex + 1) % LANGS.length;
    const next = LANGS[nextIndex];
    
    setLang(next);
    await AsyncStorage.setItem('@app_lang', next);
  };

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  return <LanguageContext.Provider value={{ lang, toggleLang, t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);