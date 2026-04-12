import { supabase } from '../lib/supabase'

export function useAutoPopulate() {
  // Auto-suggest project metrics based on project type/area
  // tasks: array of task objects with `estado` field
  const suggestMetrics = (area, tasks = []) => {
    const totalTasks = tasks.length
    const doneTasks = tasks.filter(t => t.estado === 'completada').length
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    const METRIC_TEMPLATES = {
      ML: [
        { nombre: 'Accuracy', valor: 0, tipo: 'porcentaje' },
        { nombre: 'Loss', valor: 0, tipo: 'decimal' },
        { nombre: 'F1 Score', valor: 0, tipo: 'decimal' },
        { nombre: 'Epochs', valor: 0, tipo: 'numero' },
        { nombre: 'Progreso general', valor: progress, tipo: 'porcentaje' },
        { nombre: 'Tareas completadas', valor: doneTasks, tipo: 'numero' },
      ],
      NLP: [
        { nombre: 'BLEU Score', valor: 0, tipo: 'decimal' },
        { nombre: 'Perplexity', valor: 0, tipo: 'decimal' },
        { nombre: 'WER', valor: 0, tipo: 'porcentaje' },
        { nombre: 'Progreso general', valor: progress, tipo: 'porcentaje' },
        { nombre: 'Tareas completadas', valor: doneTasks, tipo: 'numero' },
      ],
      Vision: [
        { nombre: 'mAP', valor: 0, tipo: 'decimal' },
        { nombre: 'IoU', valor: 0, tipo: 'decimal' },
        { nombre: 'FPS', valor: 0, tipo: 'numero' },
        { nombre: 'Progreso general', valor: progress, tipo: 'porcentaje' },
        { nombre: 'Tareas completadas', valor: doneTasks, tipo: 'numero' },
      ],
      Datos: [
        { nombre: 'Registros procesados', valor: 0, tipo: 'numero' },
        { nombre: 'Completitud', valor: 0, tipo: 'porcentaje' },
        { nombre: 'Calidad datos', valor: 0, tipo: 'porcentaje' },
        { nombre: 'Progreso general', valor: progress, tipo: 'porcentaje' },
        { nombre: 'Tareas completadas', valor: doneTasks, tipo: 'numero' },
      ],
      General: [
        { nombre: 'Progreso', valor: progress, tipo: 'porcentaje' },
        { nombre: 'Tareas completadas', valor: doneTasks, tipo: 'numero' },
        { nombre: 'Total de tareas', valor: totalTasks, tipo: 'numero' },
      ],
    }
    return METRIC_TEMPLATES[area] || METRIC_TEMPLATES.General
  }

  // Auto-create initial tasks when a project is created
  const suggestTasks = (projectType) => {
    return [
      { titulo: 'Revision de literatura', estado: 'pendiente', prioridad: 'alta' },
      { titulo: 'Definir metodologia', estado: 'pendiente', prioridad: 'alta' },
      { titulo: 'Recoleccion de datos', estado: 'pendiente', prioridad: 'media' },
      { titulo: 'Implementacion del modelo', estado: 'pendiente', prioridad: 'media' },
      { titulo: 'Evaluacion y metricas', estado: 'pendiente', prioridad: 'media' },
      { titulo: 'Documentacion', estado: 'pendiente', prioridad: 'baja' },
      { titulo: 'Presentacion de resultados', estado: 'pendiente', prioridad: 'baja' },
    ]
  }

  // Auto-suggest workflow template
  const suggestWorkflow = (area) => {
    const baseNodes = [
      { id: '1', type: 'milestone', position: { x: 50, y: 100 }, data: { label: 'Inicio', estado: 'completada' } },
      { id: '2', type: 'task', position: { x: 250, y: 50 }, data: { label: 'Revision bibliografica', estado: 'pendiente' } },
      { id: '3', type: 'task', position: { x: 250, y: 200 }, data: { label: 'Recoleccion datos', estado: 'pendiente' } },
      { id: '4', type: 'decision', position: { x: 500, y: 120 }, data: { label: 'Datos suficientes?' } },
      { id: '5', type: 'task', position: { x: 700, y: 120 }, data: { label: 'Implementacion', estado: 'pendiente' } },
      { id: '6', type: 'task', position: { x: 900, y: 120 }, data: { label: 'Evaluacion', estado: 'pendiente' } },
      { id: '7', type: 'milestone', position: { x: 1100, y: 120 }, data: { label: 'Entrega final', estado: 'pendiente' } },
    ]
    const baseEdges = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e1-3', source: '1', target: '3' },
      { id: 'e2-4', source: '2', target: '4' },
      { id: 'e3-4', source: '3', target: '4' },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e6-7', source: '6', target: '7' },
    ]
    return { nodes: baseNodes, edges: baseEdges }
  }

  return { suggestMetrics, suggestTasks, suggestWorkflow }
}
