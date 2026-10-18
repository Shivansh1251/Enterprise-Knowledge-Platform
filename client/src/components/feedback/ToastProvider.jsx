import { useCallback, useEffect, useRef, useState } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'
import ToastContext from '../../context/ToastContextValue'
import ToastStack from './ToastStack'

const loadMotionFeatures = () => import('./motionFeatures').then(({ default: features }) => features)

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef(new Map())

    const dismissToast = useCallback((id) => {
        const timer = timers.current.get(id)
        if (timer) clearTimeout(timer)
        timers.current.delete(id)
        setToasts((current) => current.filter((toast) => toast.id !== id))
    }, [])

    const toast = useCallback(({ title, description = '', variant = 'success', duration = 4200 }) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        setToasts((current) => [...current.slice(-3), { id, title, description, variant }])
        timers.current.set(id, setTimeout(() => dismissToast(id), duration))
        return id
    }, [dismissToast])

    useEffect(() => () => {
        for (const timer of timers.current.values()) clearTimeout(timer)
        timers.current.clear()
    }, [])

    return (
        <ToastContext.Provider value={{ toast, dismissToast }}>
            <LazyMotion features={loadMotionFeatures} strict>
                <MotionConfig reducedMotion="user">
                    {children}
                    <ToastStack toasts={toasts} onDismiss={dismissToast} />
                </MotionConfig>
            </LazyMotion>
        </ToastContext.Provider>
    )
}
