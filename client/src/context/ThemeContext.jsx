import { useEffect, useState } from 'react'
import ThemeContext from './ThemeContextValue'

const THEME_KEY = 'hank_theme'

function getInitialTheme() {
    try {
        return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
    } catch {
        return 'light'
    }
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme)
    const [incognito, setIncognito] = useState(false)

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        try {
            localStorage.setItem(THEME_KEY, theme)
        } catch {
            // The selected theme still works for this session when storage is unavailable.
        }
    }, [theme])

    useEffect(() => {
        document.documentElement.dataset.incognito = incognito ? 'true' : 'false'
    }, [incognito])

    const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')
    const toggleIncognito = () => setIncognito((current) => !current)

    return <ThemeContext.Provider value={{ theme, toggleTheme, incognito, toggleIncognito }}>{children}</ThemeContext.Provider>
}
