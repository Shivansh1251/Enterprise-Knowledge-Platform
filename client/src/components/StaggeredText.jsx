/** A compact rolling label used inside buttons and other clickable controls. */
export default function StaggeredText({ children, className = '' }) {
    const text = String(children ?? '')
    return (
        <span className={`staggered-text ${className}`.trim()}>
            <span className="staggered-text-accessible">{text}</span>
            <span className="staggered-text-visual" aria-hidden="true">
                {Array.from(text).map((character, index) => (
                    <span className="staggered-character" key={`${index}-${character}`} style={{ '--stagger-index': index }}>
                        <span className="staggered-character-current">{character === ' ' ? '\u00a0' : character}</span>
                        <span className="staggered-character-next">{character === ' ' ? '\u00a0' : character}</span>
                    </span>
                ))}
            </span>
        </span>
    )
}
