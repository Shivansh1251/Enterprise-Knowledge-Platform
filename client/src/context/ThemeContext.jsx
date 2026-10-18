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

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        try {
            localStorage.setItem(THEME_KEY, theme)
        } catch {
            // The selected theme still works for this session when storage is unavailable.
        }
    }, [theme])

    const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark')

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
