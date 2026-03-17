export default function Spinner({ size = 'md', color = 'var(--c-accent)' }) {
  const sizes = { sm: 16, md: 24, lg: 40, xl: 60 }
  const px = sizes[size] || 24

  return (
    <svg
      width={px} height={px}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.2" strokeWidth="2.5" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
