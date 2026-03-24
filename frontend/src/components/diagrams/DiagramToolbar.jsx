import {
  FiSquare, FiCircle, FiMessageSquare, FiDownload, FiUpload,
  FiUser, FiMinus, FiDatabase, FiLink,
  FiPlay, FiOctagon, FiHexagon,
  FiTarget, FiGitBranch, FiDisc,
  FiArrowRight,
} from 'react-icons/fi'

const DIAGRAM_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'class', label: 'Clases' },
  { value: 'flowchart', label: 'Flujo' },
  { value: 'er', label: 'ER' },
  { value: 'sequence', label: 'Secuencia' },
  { value: 'mindmap', label: 'Mind Map' },
]

const NODE_GROUPS = [
  {
    group: 'class',
    label: 'Clases',
    nodes: [
      { type: 'classNode', label: 'Clase', icon: FiSquare, color: '#FC651F' },
      { type: 'interfaceNode', label: 'Interface', icon: FiCircle, color: '#8B5CF6' },
      { type: 'noteNode', label: 'Nota', icon: FiMessageSquare, color: '#F59E0B' },
    ],
  },
  {
    group: 'flowchart',
    label: 'Flujo',
    nodes: [
      { type: 'processNode', label: 'Proceso', icon: FiSquare, color: '#FC651F' },
      { type: 'decisionNode', label: 'Decision', icon: FiOctagon, color: '#FC651F' },
      { type: 'startEndNode', label: 'Inicio/Fin', icon: FiPlay, color: '#FC651F' },
      { type: 'ioNode', label: 'E/S', icon: FiHexagon, color: '#FC651F' },
    ],
  },
  {
    group: 'er',
    label: 'ER',
    nodes: [
      { type: 'entityNode', label: 'Entidad', icon: FiDatabase, color: '#22c55e' },
      { type: 'relationshipNode', label: 'Relacion', icon: FiLink, color: '#22c55e' },
    ],
  },
  {
    group: 'sequence',
    label: 'Secuencia',
    nodes: [
      { type: 'actorNode', label: 'Actor', icon: FiUser, color: '#00D1FF' },
      { type: 'lifelineNode', label: 'Lifeline', icon: FiMinus, color: '#00D1FF' },
    ],
  },
  {
    group: 'mindmap',
    label: 'Mind Map',
    nodes: [
      { type: 'centralNode', label: 'Central', icon: FiTarget, color: '#8B5CF6' },
      { type: 'branchNode', label: 'Rama', icon: FiGitBranch, color: '#8B5CF6' },
      { type: 'leafNode', label: 'Hoja', icon: FiDisc, color: '#8B5CF6' },
    ],
  },
]

export default function DiagramToolbar({
  onAddNode,
  onExportJSON,
  onImportJSON,
  edgeType,
  onEdgeTypeChange,
  diagramType,
  onDiagramTypeChange,
}) {
  const edgeTypes = [
    { value: 'default', label: 'Asociacion' },
    { value: 'straight', label: 'Herencia' },
    { value: 'step', label: 'Composicion' },
    { value: 'smoothstep', label: 'Dependencia' },
    { value: 'message', label: 'Mensaje' },
  ]

  const filteredGroups = diagramType === 'all'
    ? NODE_GROUPS
    : NODE_GROUPS.filter((g) => g.group === diagramType)

  return (
    <div
      className="flex flex-col gap-2 px-4 py-2.5 rounded-xl"
      style={{
        background: 'rgba(12,6,8,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Top row: diagram type selector + edge type + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mr-1">Tipo</span>
        <select
          value={diagramType}
          onChange={(e) => onDiagramTypeChange(e.target.value)}
          className="bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[var(--c-primary)]/60 cursor-pointer [&>option]:bg-[#0c0608]"
        >
          {DIAGRAM_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>{dt.label}</option>
          ))}
        </select>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mr-1">Conexion</span>
        <select
          value={edgeType}
          onChange={(e) => onEdgeTypeChange(e.target.value)}
          className="bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[var(--c-primary)]/60 cursor-pointer [&>option]:bg-[#0c0608]"
        >
          {edgeTypes.map((et) => (
            <option key={et.value} value={et.value}>{et.label}</option>
          ))}
        </select>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <button
          onClick={onExportJSON}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
        >
          <FiDownload size={13} />
          Exportar
        </button>
        <button
          onClick={onImportJSON}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
        >
          <FiUpload size={13} />
          Importar
        </button>
      </div>

      {/* Node buttons grouped by diagram type */}
      <div className="flex items-center gap-2 flex-wrap">
        {filteredGroups.map((group, gi) => (
          <div key={group.group} className="flex items-center gap-1.5">
            {gi > 0 && <div className="w-px h-5 bg-white/10 mx-1" />}
            <span className="text-[9px] text-white/25 uppercase tracking-widest font-semibold mr-0.5">
              {group.label}
            </span>
            {group.nodes.map((nt) => (
              <button
                key={nt.type}
                onClick={() => onAddNode(nt.type)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 hover:scale-105"
                style={{
                  background: `${nt.color}10`,
                  border: `1px solid ${nt.color}40`,
                  color: nt.color,
                }}
              >
                <nt.icon size={12} />
                {nt.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
