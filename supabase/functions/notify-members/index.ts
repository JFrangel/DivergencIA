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

          // Email admins using branded template
          for (const admin of admins) {
            await sendEmailViaFunction({
              to: admin.correo,
              tipo: 'solicitud_nueva',
              nombre: record.nombre as string,
              correo: record.correo as string,
              motivacion: record.motivacion as string || '',
            })
          }
        }
        break
      }

      // ── Join request approved (UPDATE) → notify the applicant ──────────
      case 'solicitudes_ingreso': {
        // Handled above for INSERT; skip UPDATEs here
        // (Supabase webhook fires separate events per type)
        if (type === 'UPDATE' && record.estado === 'aprobada') {
          await sendEmailViaFunction({
            to: record.correo as string,
            tipo: 'bienvenida',
            nombre: record.nombre as string,
          })
        }
        break
      }

      // ── New advance → notify project members ─────────────────────────────
      case 'avances': {
        const autorId = record.autor_id as string
        const proyectoId = record.proyecto_id as string

        const { data: proyecto } = await supabase
          .from('proyectos')
          .select('titulo')
          .eq('id', proyectoId)
          .single()

        const { data: autor } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', autorId)
          .single()

        const { data: members } = await supabase
          .from('miembros_proyecto')
          .select('usuario_id, usuario:usuarios(id, correo, nombre)')
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

          // Email each member using branded template
          for (const m of members) {
            const member = m.usuario as { correo?: string; nombre?: string }
            if (member?.correo) {
              await sendEmailViaFunction({
                to: member.correo,
                tipo: 'avance_nuevo',
                nombre: member.nombre || 'Investigador',
                avance: (record.descripcion as string) || 'Ver detalles en la plataforma',
                proyecto: proyecto?.titulo || 'proyecto',
                autorNombre: autor?.nombre || 'Un compañero',
              })
            }
          }
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

          // Email using branded template
          if (assignee?.correo) {
            await sendEmailViaFunction({
              to: assignee.correo,
              tipo: 'tarea_asignada',
              nombre: assignee.nombre || 'Investigador',
              tarea: record.titulo as string,
              proyecto: proyecto?.titulo || 'N/A',
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
// Accepts either raw {to, subject, html} or a typed template payload
async function sendEmailViaFunction(payload: Record<string, string>) {
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
