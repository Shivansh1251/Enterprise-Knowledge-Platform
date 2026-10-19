import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/useTheme'
import StaggeredText from './StaggeredText'

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme()
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    const Icon = theme === 'dark' ? Sun : Moon

    return (
        <button
            className={`theme-toggle ${className}`.trim()}
            type="button"
            aria-label={`Switch to ${nextTheme} theme`}
            aria-pressed={theme === 'dark'}
            title={`Switch to ${nextTheme} theme`}
            onClick={toggleTheme}
        >
            <Icon size={17} aria-hidden="true" />
            <StaggeredText>{theme === 'dark' ? 'Light' : 'Dark'}</StaggeredText>
        </button>
    )
}
