import { stagger } from 'motion/react'
import * as m from 'motion/react-m'
import { ArrowUp } from 'lucide-react'

const textLineVariants = (position) => ({
    rest: { y: position === 'top' ? '0%' : '110%' },
    hover: {
        y: position === 'top' ? '-110%' : '0%',
        transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1], delayChildren: stagger(0.018) },
    },
})

const characterVariants = {
    rest: { y: 0, opacity: 1 },
    hover: { y: -1, opacity: 1, transition: { duration: 0.16 } },
}

function RollingLabel({ position }) {
    return (
        <m.span className={`hank-rolling-line hank-rolling-line-${position}`} variants={textLineVariants(position)} aria-hidden="true">
            {'Ask Hank'.split('').map((character, index) => (
                <m.span key={`${position}-${index}`} variants={characterVariants}>{character === ' ' ? '\u00a0' : character}</m.span>
            ))}
        </m.span>
    )
}

export default function RollingAskButton({ disabled }) {
    return (
        <m.button className="hank-ask-button" type="submit" disabled={disabled} aria-label="Ask Hank" initial="rest" whileHover={disabled ? undefined : 'hover'} whileTap={disabled ? undefined : { scale: 0.97 }}>
            <span className="hank-rolling-label"><RollingLabel position="top" /><RollingLabel position="bottom" /></span>
            <m.span className="hank-ask-arrow" aria-hidden="true" variants={{ rest: { y: 0 }, hover: { y: -2 } }}><ArrowUp size={16} /></m.span>
        </m.button>
    )
}
