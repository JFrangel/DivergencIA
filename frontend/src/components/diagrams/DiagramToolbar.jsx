import { FiSquare, FiCircle, FiMessageSquare, FiPackage, FiDownload, FiUpload, FiSave } from 'react-icons/fi'
import Button from '../ui/Button'

export default function DiagramToolbar({ onAddNode, onExportJSON, onImportJSON, edgeType, onEdgeTypeChange }) {
  const nodeTypes = [
    { type: 'classNode', label: 'Clase', icon: FiSquare, color: '#FC651F' },
    { type: 'interfaceNode', label: 'Interface', icon: FiCircle, color: '#8B5CF6' },
    { type: 'noteNode', label: 'Nota', icon: FiMessageSquare, color: '#F59E0B' },
  ]

  const edgeTypes = [
    { value: 'default', label: 'Asociacion' },
    { value: 'straight', label: 'Herencia' },
    { value: 'step', label: 'Composicion' },
    { value: 'smoothstep', label: 'Dependencia' },
  ]

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-wrap"
      style={{
        background: 'rgba(12,6,8,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Node buttons */}
      <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mr-1">Nodos</span>
      {nodeTypes.map(nt => (
        <button
          key={nt.type}
          onClick={() => onAddNode(nt.type)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105"
          style={{
            background: `${nt.color}10`,
            border: `1px solid ${nt.color}40`,
            color: nt.color,
          }}
        >
          <nt.icon size={13} />
          {nt.label}
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Edge type selector */}
      <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mr-1">Conexion</span>
      <select
        value={edgeType}
        onChange={e => onEdgeTypeChange(e.target.value)}
        className="bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FC651F]/60 cursor-pointer [&>option]:bg-[#0c0608]"
      >
        {edgeTypes.map(et => (
          <option key={et.value} value={et.value}>{et.label}</option>
        ))}
      </select>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Actions */}
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
  )
}
