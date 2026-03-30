// Edge Function: notify-members
// Triggered by database webhooks on INSERT/UPDATE to key tables
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

// ── Email templates (dark, branded) ─────────────────────────────────────────

const BASE_URL = 'https://divergencia.app'

function emailLayout(bodyHtml: string, preheader = '') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
</head>
<body style="margin:0;padding:0;background:#060304;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheader ? `<span style="display:none;font-size:1px;max-height:0;overflow:hidden;">${preheader}</span>` : ''}
  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#060304;">
    <tr><td align="center" style="padding:32px 16px 48px;">
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;margin:0 auto;">
        <tr><td style="padding:0 0 20px;text-align:center;">
          <table cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;"><tr>
            <td style="padding-right:10px;vertical-align:middle;">
              <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#FC651F,#8B5CF6);
                          text-align:center;line-height:42px;font-size:20px;font-weight:900;color:#fff;">D</div>
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:24px;font-weight:900;color:rgba(255,255,255,0.92);letter-spacing:1px;">
                Divergenc<span style="color:#FC651F;">IA</span>
              </div>
              <div style="font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:3.5px;text-transform:uppercase;margin-top:3px;">
                Semillero de Investigaci&#243;n en IA
              </div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#0d0608;border:1px solid rgba(255,255,255,0.07);border-radius:20px;
                       overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0;">
            <strong style="color:rgba(255,255,255,0.3);">DivergencIA</strong> &mdash; Donde la inteligencia artificial converge con la investigaci&#243;n
          </p>
          <p style="color:rgba(255,255,255,0.1);font-size:10px;margin:6px 0 0;">
            Email autom&#225;tico &middot; No respondas a esta direcci&#243;n
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function templateBienvenida(nombre: string) {
  return {
    subject: `¡Bienvenido/a a DivergencIA, ${nombre}! 🎉`,
    html: emailLayout(`
      <div style="height:4px;background:linear-gradient(90deg,#FC651F,#8B5CF6);"></div>
      <div style="background:linear-gradient(135deg,rgba(252,101,31,0.1),rgba(139,92,246,0.1));
                  padding:40px 32px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="font-size:48px;margin-bottom:12px;">🎉</div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:rgba(255,255,255,0.92);">
          ¡Hola, ${nombre}! Ya eres parte del semillero.
        </h1>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);">Tu solicitud fue aprobada — bienvenido/a a la familia DivergencIA</p>
      </div>
      <div style="padding:32px;">
        <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.8;margin:0 0 20px;">
          Estamos <strong style="color:rgba(255,255,255,0.9);">súper contentos</strong> de tenerte acá.
          DivergencIA es donde investigadores curiosos se reúnen a explorar la IA, colaborar y construir
          cosas que importan. ✨
        </p>
        <div style="background:rgba(252,101,31,0.06);border:1px solid rgba(252,101,31,0.15);border-radius:12px;padding:16px 20px;margin:0 0 10px;">
          <div style="font-size:18px;margin-bottom:6px;">👤</div>
          <div style="color:#FC651F;font-size:13px;font-weight:700;margin-bottom:3px;">Arma tu perfil</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;">Ponle tu foto, intereses y habilidades</div>
        </div>
        <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.15);border-radius:12px;padding:16px 20px;margin:0 0 10px;">
          <div style="font-size:18px;margin-bottom:6px;">🔬</div>
          <div style="color:#8B5CF6;font-size:13px;font-weight:700;margin-bottom:3px;">Explora los proyectos</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;">Hay investigación en marcha que espera colaboradores</div>
        </div>
        <div style="background:rgba(0,209,255,0.06);border:1px solid rgba(0,209,255,0.15);border-radius:12px;padding:16px 20px;margin:0 0 24px;">
          <div style="font-size:18px;margin-bottom:6px;">🤖</div>
          <div style="color:#00D1FF;font-size:13px;font-weight:700;margin-bottom:3px;">Habla con ATHENIA</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;">Nuestra IA interna puede orientarte — pruébala</div>
        </div>
        <div style="text-align:center;">
          <a href="${BASE_URL}/dashboard"
             style="display:inline-block;background:linear-gradient(135deg,#FC651F,#8B5CF6);color:#fff;
                    text-decoration:none;padding:14px 40px;border-radius:50px;font-size:14px;font-weight:800;
                    letter-spacing:0.5px;box-shadow:0 8px 24px rgba(252,101,31,0.3);">
            Entrar a DivergencIA →
          </a>
        </div>
      </div>
    `, `Hey ${nombre}, tu cuenta está activa — el semillero te espera.`),
  }
}

function templateSolicitudNueva(nombre: string, correo: string, motivacion: string) {
  return {
    subject: `🙋 Nueva solicitud: ${nombre} quiere unirse`,
    html: emailLayout(`
      <div style="height:4px;background:linear-gradient(90deg,#8B5CF6,#FC651F);"></div>
      <div style="background:linear-gradient(135deg,rgba(139,92,246,0.1),rgba(252,101,31,0.08));
                  padding:36px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="font-size:44px;margin-bottom:12px;">🙋</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:rgba(255,255,255,0.92);">
          Nueva solicitud de ingreso
        </h1>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">${nombre} quiere unirse al semillero</p>
      </div>
      <div style="padding:32px;">
        <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.18);border-radius:14px;overflow:hidden;margin:0 0 20px;">
          <div style="background:rgba(139,92,246,0.12);padding:10px 18px;border-bottom:1px solid rgba(139,92,246,0.15);">
            <span style="color:#8B5CF6;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">👤 Datos del solicitante</span>
          </div>
          <div style="padding:16px 18px;">
            <div style="margin-bottom:10px;">
              <div style="color:rgba(255,255,255,0.25);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Nombre</div>
              <div style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:600;">${nombre}</div>
            </div>
            <div>
              <div style="color:rgba(255,255,255,0.25);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Correo</div>
              <div style="color:#00D1FF;font-size:13px;">${correo}</div>
            </div>
          </div>
        </div>
        ${motivacion ? `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-left:3px solid #8B5CF6;
                    border-radius:0 12px 12px 0;padding:16px 18px;margin:0 0 24px;">
          <div style="color:#8B5CF6;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Motivación</div>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.8;margin:0;font-style:italic;">"${motivacion}"</p>
        </div>` : ''}
        <div style="text-align:center;">
          <a href="${BASE_URL}/admin"
             style="display:inline-block;background:#8B5CF6;color:#fff;text-decoration:none;
                    padding:14px 40px;border-radius:50px;font-size:14px;font-weight:800;
                    box-shadow:0 8px 24px rgba(139,92,246,0.3);">
            Revisar solicitud →
          </a>
        </div>
      </div>
    `, `${nombre} envió una solicitud de ingreso al semillero.`),
  }
}

function templateTareaAsignada(nombre: string, tarea: string, proyecto: string) {
  return {
    subject: `📌 Tienes una nueva tarea: ${tarea}`,
    html: emailLayout(`
      <div style="height:4px;background:linear-gradient(90deg,#00D1FF,#8B5CF6);"></div>
      <div style="background:linear-gradient(135deg,rgba(0,209,255,0.08),rgba(139,92,246,0.08));
                  padding:36px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="font-size:44px;margin-bottom:12px;">✅</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:rgba(255,255,255,0.92);">
          Nueva tarea para ti, ${nombre}
        </h1>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Alguien en el equipo confía en ti para esto</p>
      </div>
      <div style="padding:32px;">
        <div style="background:rgba(0,209,255,0.06);border:1px solid rgba(0,209,255,0.18);border-radius:14px;padding:20px;margin:0 0 24px;">
          <h2 style="color:rgba(255,255,255,0.92);margin:0 0 8px;font-size:18px;font-weight:800;">${tarea}</h2>
          <div style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:8px;">
            📁 Proyecto: <span style="color:#00D1FF;font-weight:600;">${proyecto}</span>
          </div>
        </div>
        <div style="text-align:center;">
          <a href="${BASE_URL}/dashboard"
             style="display:inline-block;background:#00D1FF;color:#060304;text-decoration:none;
                    padding:14px 40px;border-radius:50px;font-size:14px;font-weight:800;
                    box-shadow:0 8px 24px rgba(0,209,255,0.25);">
            Ver el proyecto →
          </a>
        </div>
      </div>
    `, `Tienes una nueva tarea: "${tarea}" en ${proyecto}.`),
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

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

    // ── Handle UPDATE events ───────────────────────────────────────────────
    if (type === 'UPDATE') {
      if (table === 'solicitudes_ingreso' && record.estado === 'aprobada') {
        const { subject, html } = templateBienvenida(record.nombre as string)
        await sendEmail({ to: record.correo as string, subject, html })
      }
      return new Response(JSON.stringify({ success: true, table, type }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Only process INSERT events below ──────────────────────────────────
    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not INSERT or UPDATE' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    switch (table) {
      // ── New join request → notify admins + directoras ──────────────────
      case 'solicitudes_ingreso': {
        const { data: admins } = await supabase
          .from('usuarios')
          .select('id, correo, nombre')
          .in('rol', ['admin', 'directora'])
          .eq('activo', true)

        if (admins?.length) {
          const notifications = admins.map((admin) => ({
            usuario_id: admin.id,
            tipo: 'solicitudes',
            mensaje: `Nueva solicitud de ingreso de ${record.nombre}`,
            referencia_id: record.id as string,
            leida: false,
          }))
          await supabase.from('notificaciones').insert(notifications)

          for (const admin of admins) {
            if (!admin.correo) continue
            const { subject, html } = templateSolicitudNueva(
              record.nombre as string,
              record.correo as string,
              record.motivacion as string,
            )
            await sendEmail({ to: admin.correo, subject, html })
          }
        }
        break
      }

      // ── New advance → notify project members ─────────────────────────
      case 'avances': {
        const autorId = record.autor_id as string
        const proyectoId = record.proyecto_id as string

        const { data: proyecto } = await supabase
          .from('proyectos')
          .select('titulo')
          .eq('id', proyectoId)
          .single()

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

      // ── New task → notify assigned member ─────────────────────────────
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

          await supabase.from('notificaciones').insert({
            usuario_id: assignedTo,
            tipo: 'tareas',
            mensaje: `Nueva tarea asignada: "${record.titulo}"`,
            referencia_id: record.proyecto_id as string,
            leida: false,
          })

          if (assignee?.correo) {
            const { subject, html } = templateTareaAsignada(
              assignee.nombre as string,
              record.titulo as string,
              proyecto?.titulo || 'proyecto',
            )
            await sendEmail({ to: assignee.correo, subject, html })
          }
        }
        break
      }

      // ── New comment → notify entity owner ─────────────────────────────
      case 'comentarios': {
        const autorId = record.autor_id as string
        const entidadId = record.entidad_id as string

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

// ── Helper: call send-email edge function ─────────────────────────────────────
async function sendEmail(payload: { to: string; subject: string; html: string }) {
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
