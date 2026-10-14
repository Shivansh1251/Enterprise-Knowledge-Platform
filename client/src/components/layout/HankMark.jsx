export default function HankMark({ size = 48 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Hank">
            <defs>
                <linearGradient id="hank-face" x1="0" x2="1" y1="0" y2="1">
                    <stop stopColor="#101916" />
                    <stop offset="1" stopColor="#030706" />
                </linearGradient>
            </defs>
            <path d="M12 24a20 20 0 0 1 40 0" fill="none" stroke="#0b1712" strokeWidth="4" strokeLinecap="round" />
            <rect x="7" y="25" width="8" height="17" rx="4" fill="#06100c" />
            <rect x="49" y="25" width="8" height="17" rx="4" fill="#06100c" />
            <rect x="12" y="17" width="40" height="34" rx="14" fill="url(#hank-face)" stroke="#14271e" strokeWidth="2" />
            <rect x="16" y="21" width="32" height="26" rx="10" fill="#030706" />
            <ellipse cx="24" cy="32" rx="2.6" ry="4" fill="#29e7ad" />
            <ellipse cx="40" cy="32" rx="2.6" ry="4" fill="#29e7ad" />
            <path d="M25 40c3.8 3.4 10.2 3.4 14 0" fill="none" stroke="#29e7ad" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M21 15h22" stroke="#26bd8d" strokeWidth="2" strokeLinecap="round" opacity=".7" />
        </svg>
    )
}
