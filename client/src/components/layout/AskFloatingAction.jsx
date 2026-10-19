import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { FileUp, Plus, Settings2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const actions = [
    { label: 'Ask Hank', to: '/', icon: Sparkles, state: { focusComposer: true } },
    { label: 'Add documents', to: '/knowledge-base', icon: FileUp },
    { label: 'Workspace settings', to: '/settings', icon: Settings2 },
]

const listVariants = {
    closed: { transition: { staggerChildren: 0.045, staggerDirection: -1 } },
    open: { transition: { delayChildren: 0.04, staggerChildren: 0.075 } },
}

const itemVariants = {
    closed: { opacity: 0, y: 12, scale: 0.8, transition: { type: 'spring', stiffness: 480, damping: 32 } },
    open: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 480, damping: 28 } },
}

export default function AskFloatingAction() {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    useEffect(() => {
        if (!open) return undefined
        const closeOnOutsideClick = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false)
        }
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', closeOnOutsideClick)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [open])

    return (
        <m.div ref={rootRef} className="hank-ask-fab-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <AnimatePresence>
                {open && (
                    <m.div
                        id="hank-quick-actions"
                        className="hank-fab-actions"
                        role="group"
                        aria-label="Hank quick actions"
                        variants={listVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                    >
                        {actions.map(({ label, to, icon: Icon, state }) => (
                            <m.div className="hank-fab-action-row" key={label} variants={itemVariants}>
                                <span className="hank-fab-tooltip">{label}</span>
                                <Link className="hank-fab-action" to={to} state={state} aria-label={label} onClick={() => setOpen(false)}>
                                    <Icon size={20} aria-hidden="true" />
                                </Link>
                            </m.div>
                        ))}
                    </m.div>
                )}
            </AnimatePresence>
            <m.button
                className="hank-ask-fab"
                type="button"
                aria-label={open ? 'Close quick actions' : 'Open quick actions'}
                aria-expanded={open}
                aria-controls="hank-quick-actions"
                onClick={() => setOpen((current) => !current)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
            >
                <m.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
                    <Plus size={25} aria-hidden="true" />
                </m.span>
            </m.button>
        </m.div>
    )
}
