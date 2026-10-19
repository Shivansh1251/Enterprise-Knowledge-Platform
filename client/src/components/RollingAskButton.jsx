import { stagger } from 'motion/react'
import * as m from 'motion/react-m'
import { ArrowUp } from 'lucide-react'

const textLineVariants = {
    rest: {},
    hover: { transition: { delayChildren: stagger(0.025) } },
}

const characterVariants = (position) => ({
    rest: { y: position === 'top' ? '0%' : '110%' },
    hover: { y: position === 'top' ? '-110%' : '0%', transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
})

function RollingLabel({ position }) {
    return (
        <m.span className={`hank-rolling-line hank-rolling-line-${position}`} variants={textLineVariants} aria-hidden="true">
            {'Ask Hank'.split('').map((character, index) => (
                <m.span key={`${position}-${index}`} variants={characterVariants(position)}>{character === ' ' ? '\u00a0' : character}</m.span>
            ))}
        </m.span>
    )
}

export default function RollingAskButton({ disabled }) {
    return (
        <m.button className="hank-ask-button" type="submit" disabled={disabled} aria-label="Ask Hank" initial="rest" whileHover={disabled ? undefined : 'hover'} whileFocus={disabled ? undefined : 'hover'} whileTap={disabled ? undefined : { scale: 0.97 }}>
            <span className="hank-rolling-label"><RollingLabel position="top" /><RollingLabel position="bottom" /></span>
            <m.span className="hank-ask-arrow" aria-hidden="true" variants={{ rest: { y: 0 }, hover: { y: -2 } }}><ArrowUp size={16} /></m.span>
        </m.button>
    )
}
