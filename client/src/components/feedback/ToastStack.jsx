import { AnimatePresence, stagger } from 'motion/react'
import * as m from 'motion/react-m'
import { AlertCircle, Check, Info, X } from 'lucide-react'

const icons = {
    success: Check,
    error: AlertCircle,
    info: Info,
}

const stackVariants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.055, { from: 'last' }) } },
}

const toastVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 32 } },
    exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } },
}

export default function ToastStack({ toasts, onDismiss }) {
    return (
        <div className="hank-toast-stack" aria-live="polite" aria-relevant="additions text" aria-label="Notifications">
            <m.div className="hank-toast-list" variants={stackVariants} initial="hidden" animate="visible">
                <AnimatePresence initial={false} mode="popLayout">
                    {toasts.map((item) => {
                        const Icon = icons[item.variant] || Info
                        return (
                            <m.article
                                key={item.id}
                                className={`hank-toast hank-toast-${item.variant}`}
                                variants={toastVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                role={item.variant === 'error' ? 'alert' : 'status'}
                            >
                                <span className="hank-toast-icon"><Icon size={16} aria-hidden="true" /></span>
                                <span className="hank-toast-copy">
                                    <strong>{item.title}</strong>
                                    {item.description && <span>{item.description}</span>}
                                </span>
                                <button type="button" className="hank-toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(item.id)}><X size={15} /></button>
                            </m.article>
                        )
                    })}
                </AnimatePresence>
            </m.div>
        </div>
    )
}
