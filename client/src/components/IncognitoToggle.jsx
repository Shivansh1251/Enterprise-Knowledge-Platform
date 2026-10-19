import { VenetianMask } from 'lucide-react'
import { useTheme } from '../context/useTheme'

export default function IncognitoToggle({ className = '' }) {
    const { incognito, toggleIncognito } = useTheme()
    const label = incognito ? 'Turn off monochrome mode' : 'Turn on monochrome mode'

    return (
        <button
            className={`incognito-mask-toggle${incognito ? ' is-active' : ''} ${className}`.trim()}
            type="button"
            aria-label={label}
            aria-pressed={incognito}
            title={label}
            onClick={toggleIncognito}
        >
            <VenetianMask size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
    )
}
