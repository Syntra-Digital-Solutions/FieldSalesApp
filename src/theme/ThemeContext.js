import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIGHT = {
  mode: 'light',
  blue: '#0b6b43', blueTint: '#eafbf3',
  green: '#b8860b', greenTint: '#fdf7e6',
  ink: '#1a1f26', sub: '#6b7280',
  border: '#e5e5df', bg: '#f8fafc', card: '#ffffff',
  red: '#dc2626', redTint: '#fef2f2',
};

const DARK = {
  mode: 'dark',
  blue: '#34d399', blueTint: '#0f2e22',
  green: '#e6c65c', greenTint: '#332a12',
  ink: '#f1f5f9', sub: '#94a3b8',
  border: '#2d3748', bg: '#0f172a', card: '#1a2332',
  red: '#f87171', redTint: '#3b1a1a',
};

const ThemeContext = createContext({ theme: LIGHT, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(LIGHT);

  useEffect(() => {
    AsyncStorage.getItem('@theme_mode').then((saved) => {
      if (saved === 'dark') setTheme(DARK);
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme.mode === 'light' ? DARK : LIGHT;
    setTheme(next);
    await AsyncStorage.setItem('@theme_mode', next.mode);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);