import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@layman_theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const toggleDarkMode = async (value) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem('@layman_theme', value ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Define light and dark mode colors
  const theme = {
    isDark: isDarkMode,
    colors: isDarkMode ? {
      background: '#0F0F0F',
      card: '#1C1C1E',
      text: '#F2F2F7',
      textSecondary: '#8E8E93',
      primary: '#D97B47',
      border: '#2C2C2E',
      headerBackground: '#0F0F0F',
      inputBackground: '#1C1C1E',
      shadow: '#000000',
    } : {
      background: '#FAF4F0',
      card: '#FFFFFF',
      text: '#2C2522',
      textSecondary: '#8A7D77',
      primary: '#D97B47',
      border: '#EBE1DA',
      headerBackground: '#FAF4F0',
      inputBackground: '#FFFFFF',
      shadow: '#000000',
    }
  };

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
