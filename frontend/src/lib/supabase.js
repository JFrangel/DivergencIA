import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ─── Color por área de investigación ───────────────────────────────────────
export const AREA_COLORS = {
  ML: '#FC651F',
  NLP: '#8B5CF6',
  Vision: '#00D1FF',
  Datos: '#22c55e',
  General: '#F59E0B',
}

// ─── Estados de proyecto ────────────────────────────────────────────────────
export const ESTADO_PROYECTO = {
  idea: { label: 'Idea', color: '#F59E0B' },
  desarrollo: { label: 'Desarrollo', color: '#FC651F' },
  investigacion: { label: 'Investigación', color: '#8B5CF6' },
  pruebas: { label: 'Pruebas', color: '#00D1FF' },
  finalizado: { label: 'Finalizado', color: '#22c55e' },
  cancelado: { label: 'Cancelado', color: '#EF4444' },
  pausa: { label: 'Pausa', color: '#6b7280' },
}

// ─── Prioridades ─────────────────────────────────────────────────────────────
export const PRIORIDAD_COLORES = {
  baja: '#22c55e',
  media: '#F59E0B',
  alta: '#FC651F',
  critica: '#EF4444',
}

export default supabase
