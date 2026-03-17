import DiagramEditor from '../../components/diagrams/DiagramEditor'

export default function Diagrams() {
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white font-title">Herramientas de Diagramas</h1>
        <p className="text-white/50 text-sm mt-1">
          Crea diagramas UML, flujos y mas
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <DiagramEditor />
      </div>
    </div>
  )
}
