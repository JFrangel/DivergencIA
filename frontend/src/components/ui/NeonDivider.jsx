export default function NeonDivider({ className = '' }) {
  return (
    <div
      className={`w-full h-px ${className}`}
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(252,101,31,0.4), rgba(139,92,246,0.4), transparent)',
      }}
    />
  )
}
