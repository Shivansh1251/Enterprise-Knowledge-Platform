import * as m from 'motion/react-m'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AskFloatingAction() {
    return (
        <m.div className="hank-ask-fab-wrap" initial={{ opacity: 0, y: 12, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
            <Link className="hank-ask-fab" to="/" state={{ focusComposer: true }} aria-label="Ask Hank a question">
                <Sparkles size={18} aria-hidden="true" />
                <span>Ask Hank</span>
            </Link>
        </m.div>
    )
}
