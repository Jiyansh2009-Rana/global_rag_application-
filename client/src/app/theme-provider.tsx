import { createContext, useCallback, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => void 0,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Read the value already set by the inline <script> in index.html
    const stored = localStorage.getItem('rag-theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    return stored ?? preferred;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rag-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
