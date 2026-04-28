import React, { createContext, useContext, useState, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(localStorage.getItem('theme') || 'light');

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('theme', newMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#6C63FF' : '#8B85FF',
            light: '#9C96FF',
            dark: '#5449CC'
          },
          secondary: {
            main: mode === 'light' ? '#FF6584' : '#FF8AA3',
            light: '#FF8AA3',
            dark: '#CC5169'
          },
          background: {
            default: mode === 'light' ? '#F5F7FA' : '#1A1A2E',
            paper: mode === 'light' ? '#FFFFFF' : '#16213E'
          },
          text: {
            primary: mode === 'light' ? '#2C3E50' : '#ECF0F1',
            secondary: mode === 'light' ? '#7F8C8D' : '#BDC3C7'
          }
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 700
          },
          h2: {
            fontWeight: 600
          },
          h3: {
            fontWeight: 600
          }
        },
        shape: {
          borderRadius: 12
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                padding: '10px 24px'
              }
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: mode === 'light' 
                  ? '0 4px 20px rgba(0,0,0,0.08)' 
                  : '0 4px 20px rgba(0,0,0,0.3)'
              }
            }
          }
        }
      }),
    [mode]
  );

  const value = {
    mode,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};