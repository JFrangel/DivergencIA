import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FiPlus, FiMoreVertical, FiCalendar } from 'react-icons/fi'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import TaskEditModal from './TaskEditModal'
import { formatDate } from '../../lib/utils'
import { PRIORIDAD_COLORES } from '../../lib/supabase'

const COLUMNS = [
  { id: 'pendiente',   label: 'Pendiente',   color: '#6b7280' },
  { id: 'en_progreso', label: 'En progreso', color: '#00D1FF' },
  { id: 'revision',    label: 'Revisión',    color: '#F59E0B' },
  { id: 'completada',  label: 'Completada',  color: '#22c55e' },
]

const STATUS_STYLES = {
  pendiente:   { border: '#6b7280',  bg: 'rgba(107,114,128,0.06)' },
  en_progreso: { border: '#00D1FF',  bg: 'rgba(0,209,255,0.06)'   },
  revision:    { border: '#F59E0B',  bg: 'rgba(245,158,11,0.06)'  },
  completada:  { border: '#22c55e',  bg: 'rgba(34,197,94,0.06)'   },
}

function TaskCard({ task, isDragging, onClickTask }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const pointerStart = useRef(null)

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    listeners?.onPointerDown?.(e)
  }

  const handlePointerUp = (e) => {
    if (!pointerStart.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    // Only treat as click if pointer barely moved (not a drag)
    if (dx < 5 && dy < 5) {
      onClickTask?.(task)
    }
    pointerStart.current = null
  }

  const priorityColor = PRIORIDAD_COLORES[task.prioridad] || '#6b7280'
  const statusStyle = STATUS_STYLES[task.estado] || STATUS_STYLES.pendiente

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: priorityColor,
        borderTopColor: statusStyle.border,
        background: statusStyle.bg,
      }}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing select-none border-l-[3px] border-t-[2px] border-r border-b border-r-white/[0.06] border-b-white/[0.06]"
    >
      <p className="text-sm text-white/80 leading-snug mb-2">{task.titulo}</p>
      {task.descripcion && (
        <p className="text-xs text-white/30 leading-relaxed mb-2 line-clamp-2">{task.descripcion}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge preset={task.prioridad} size="xs" dot />
          {task.fecha_limite && (
            <span className="text-[10px] text-white/30 flex items-center gap-0.5">
              <FiCalendar size={9} /> {formatDate(task.fecha_limite)}
            </span>
          )}
        </div>
        {task.asignado && (
          <Avatar
            name={task.asignado.nombre || ''}
            src={task.asignado.foto_url}
            area={task.asignado.area_investigacion}
            size="xs"
          />
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ column, tasks, onAddTask, onClickTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">{column.label}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: `color-mix(in srgb, ${column.color} 12%, transparent)`, color: column.color }}
          >
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={() => onAddTask(column.id)}
            className="text-white/20 hover:text-white/60 transition-colors"
          >
            <FiPlus size={14} />
          </button>
        )}
      </div>

      {/* Cards — droppable zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 flex-1 p-2 rounded-xl min-h-[100px] transition-colors ${
          isOver ? 'ring-1 ring-white/15 bg-white/[0.04]' : ''
        }`}
        style={{ background: isOver ? undefined : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} isDragging={false} onClickTask={onClickTask} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-white/15 text-xs py-4">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectKanban({ tasks, setTasks, onUpdateTask, onAddTask, onDeleteTask, members = [] }) {
  const [activeId, setActiveId] = useState(null)
  const [editingTask, setEditingTask] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const tasksByCol = (colId) => tasks.filter(t => t.estado === colId)
  const activeTask = tasks.find(t => t.id === activeId)

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over) return

    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    // Determine the target column: over could be a column id or a task id
    const overCol = COLUMNS.find(c => c.id === over.id)
    const overTask = tasks.find(t => t.id === over.id)
    const newEstado = overCol ? overCol.id : overTask?.estado

    if (!newEstado) return

    if (newEstado !== draggedTask.estado) {
      // Column change — update local state and persist to Supabase
      setTasks(t => t.map(x => x.id === active.id ? { ...x, estado: newEstado } : x))
      await onUpdateTask?.(active.id, { estado: newEstado })
    } else if (overTask && active.id !== over.id) {
      // Reorder within the same column
      const col = tasks.filter(t => t.estado === draggedTask.estado)
      const oldIdx = col.findIndex(t => t.id === active.id)
      const newIdx = col.findIndex(t => t.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        const reordered = arrayMove(col, oldIdx, newIdx)
        setTasks(t => {
          const others = t.filter(x => x.estado !== draggedTask.estado)
          return [...others, ...reordered]
        })
      }
    }
  }

  const handleDragOver = ({ active, over }) => {
    if (!over) return
    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    // Check if hovering over a column droppable
    const overCol = COLUMNS.find(c => c.id === over.id)
    if (overCol && draggedTask.estado !== overCol.id) {
      setTasks(t => t.map(x => x.id === active.id ? { ...x, estado: overCol.id } : x))
      return
    }

    // Check if hovering over a task in a different column
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask && draggedTask.estado !== overTask.estado) {
      setTasks(t => t.map(x => x.id === active.id ? { ...x, estado: overTask.estado } : x))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByCol(col.id)}
            onAddTask={onAddTask}
            onClickTask={setEditingTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging={true} />}
      </DragOverlay>

      <TaskEditModal
        task={editingTask}
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        members={members}
        onSave={async (taskId, data) => {
          await onUpdateTask?.(taskId, data)
          setEditingTask(null)
        }}
        onDelete={async (taskId) => {
          await onDeleteTask?.(taskId)
          setEditingTask(null)
        }}
      />
    </DndContext>
  )
}
