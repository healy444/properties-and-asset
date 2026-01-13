import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'));

    useEffect(() => {
        document.body.dataset.theme = mode;
        localStorage.setItem('theme', mode);
    }, [mode]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            mode,
            setMode,
            toggleMode: () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
        }),
        [mode]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useThemeMode must be used within ThemeProvider');
    }
    return ctx;
};
