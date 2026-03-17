import Button from './Button'

export default function EmptyState({ icon = '🔍', title = 'Sin resultados', description, action, actionLabel = 'Crear nuevo' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="text-5xl opacity-30">{icon}</div>
      <div>
        <h3 className="text-white/60 font-semibold font-title mb-1">{title}</h3>
        {description && <p className="text-sm text-white/30">{description}</p>}
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
