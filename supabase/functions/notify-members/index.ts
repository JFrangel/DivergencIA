// Edge Function: notify-members
// Triggered by database webhooks on INSERT to key tables
// Sends notifications + emails to relevant members

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  old_record?: Record<string, unknown>
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const payload: WebhookPayload = await req.json()
    const { type, table, record } = payload

    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not an INSERT' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    switch (table) {
      // ── New join request → notify all admins ────────────────────────────
      case 'solicitudes_ingreso': {
        const { data: admins } = await supabase
          .from('usuarios')
          .select('id, correo, nombre')
          .eq('rol', 'admin')
          .eq('activo', true)

        if (admins?.length) {
          // Create in-app notifications
          const notifications = admins.map((admin) => ({
            usuario_id: admin.id,
            tipo: 'solicitudes',
            mensaje: `Nueva solicitud de ingreso de ${record.nombre}`,
            referencia_id: record.id as string,
            leida: false,
          }))
          await supabase.from('notificaciones').insert(notifications)

          // Send email to admins
          for (const admin of admins) {
            await sendEmailViaFunction({
              to: admin.correo,
              subject: `Nueva solicitud: ${record.nombre}`,
              html: `<p>${record.nombre} (${record.correo}) quiere unirse al semillero.</p>
                     <p>Motivación: ${record.motivacion || 'No especificada'}</p>`,
            })
          }
        }
        break
      }

      // ── Join request approved → notify the applicant ────────────────────
      case 'solicitudes_ingreso_update': {
        if (record.estado === 'aprobada') {
          await sendEmailViaFunction({
            to: record.correo as string,
            subject: '¡Bienvenido a DivergencIA! 🚀',
            html: `<p>Hola ${record.nombre}, tu solicitud ha sido aprobada.</p>
                   <p>Ya puedes iniciar sesión en la plataforma.</p>`,
          })
        }
        break
      }

      // ── New advance → notify project members ─────────────────────────────
      case 'avances': {
        const autorId = record.autor_id as string
        const proyectoId = record.proyecto_id as string

        // Get project info
        const { data: proyecto } = await supabase
          .from('proyectos')
          .select('titulo')
          .eq('id', proyectoId)
          .single()

        // Get project members (excluding the author)
        const { data: members } = await supabase
          .from('miembros_proyecto')
          .select('usuario_id, usuario:usuarios(correo, nombre)')
          .eq('proyecto_id', proyectoId)
          .eq('activo', true)
          .neq('usuario_id', autorId)

        if (members?.length) {
          const notifications = members.map((m) => ({
            usuario_id: m.usuario_id,
            tipo: 'avances',
            mensaje: `Nuevo avance en "${proyecto?.titulo || 'proyecto'}"`,
            referencia_id: proyectoId,
            leida: false,
          }))
          await supabase.from('notificaciones').insert(notifications)
        }
        break
      }

      // ── New task → notify assigned member ──────────────────────────────
      case 'tareas': {
        const assignedTo = record.asignado_a as string
        if (assignedTo) {
          const { data: assignee } = await supabase
            .from('usuarios')
            .select('correo, nombre')
            .eq('id', assignedTo)
            .single()

          const { data: proyecto } = await supabase
            .from('proyectos')
            .select('titulo')
            .eq('id', record.proyecto_id as string)
            .single()

          // In-app notification
          await supabase.from('notificaciones').insert({
            usuario_id: assignedTo,
            tipo: 'tareas',
            mensaje: `Nueva tarea asignada: "${record.titulo}"`,
            referencia_id: record.proyecto_id as string,
            leida: false,
          })

          // Email
          if (assignee?.correo) {
            await sendEmailViaFunction({
              to: assignee.correo,
              subject: `Nueva tarea: ${record.titulo}`,
              html: `<p>Hola ${assignee.nombre}, tienes una nueva tarea:</p>
                     <p><strong>${record.titulo}</strong></p>
                     <p>Proyecto: ${proyecto?.titulo || 'N/A'}</p>`,
            })
          }
        }
        break
      }

      // ── New comment → notify mentioned users ───────────────────────────
      case 'comentarios': {
        const autorId = record.autor_id as string
        const entidadId = record.entidad_id as string

        // Notify the entity owner (project creator or idea author)
        // This is a simplified version — could be expanded
        const { data: proyecto } = await supabase
          .from('proyectos')
          .select('creador_id, titulo')
          .eq('id', entidadId)
          .single()

        if (proyecto && proyecto.creador_id !== autorId) {
          await supabase.from('notificaciones').insert({
            usuario_id: proyecto.creador_id,
            tipo: 'comentarios',
            mensaje: `Nuevo comentario en "${proyecto.titulo}"`,
            referencia_id: entidadId,
            leida: false,
          })
        }
        break
      }

      default:
        break
    }

    return new Response(JSON.stringify({ success: true, table, type }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Notify error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Helper to call the send-email function
async function sendEmailViaFunction(payload: { to: string; subject: string; html: string }) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.warn('Email send failed (non-critical):', e)
  }
}
