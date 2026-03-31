import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Send a single email via the send-email edge function.
 */
export async function sendEmail({ to, subject, html }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Email send failed')
  }
  return res.json()
}

/**
 * Send a batch of emails.
 * batch: [{to, subject, html}, ...]
 */
export async function sendEmailBatch(batch) {
  if (!batch?.length) return
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ batch }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Batch email send failed')
  }
  return res.json()
}

/* ── Email templates ──────────────────────────────────────────────────────── */

export function emailMeetingInvite({ nombre, eventoTitulo, fecha, lugar, descripcion, canalUrl }) {
  const fechaFmt = new Date(fecha).toLocaleString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  return {
    subject: `📅 Te invitaron a: ${eventoTitulo}`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060304;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060304;">
<tr><td align="center" style="padding:32px 16px 48px;">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
  <tr><td style="padding-bottom:20px;text-align:center;">
    <div style="font-size:22px;font-weight:900;color:rgba(255,255,255,0.92);letter-spacing:1px;">
      Divergenc<span style="color:#FC651F;">IA</span>
    </div>
  </td></tr>
  <tr><td style="background:#0d0608;border:1px solid rgba(255,255,255,0.07);border-radius:20px;overflow:hidden;">
    <div style="height:4px;background:linear-gradient(90deg,#FC651F,#8B5CF6);"></div>
    <div style="padding:32px;">
      <div style="font-size:36px;text-align:center;margin-bottom:16px;">📅</div>
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:900;color:rgba(255,255,255,0.92);text-align:center;">
        ${eventoTitulo}
      </h1>
      <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.4);text-align:center;">
        Hola ${nombre}, tienes una reunión programada
      </p>
      <div style="background:rgba(252,101,31,0.06);border:1px solid rgba(252,101,31,0.15);border-radius:12px;padding:16px 20px;margin:0 0 20px;">
        <div style="margin-bottom:10px;">
          <div style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🕐 Fecha y hora</div>
          <div style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:600;">${fechaFmt}</div>
        </div>
        ${lugar ? `<div>
          <div style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📍 Lugar</div>
          <div style="color:rgba(255,255,255,0.7);font-size:13px;">${lugar}</div>
        </div>` : ''}
      </div>
      ${descripcion ? `<p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.7;margin:0 0 20px;">${descripcion}</p>` : ''}
      ${canalUrl ? `<div style="text-align:center;">
        <a href="${canalUrl}" style="display:inline-block;background:linear-gradient(135deg,#FC651F,#8B5CF6);color:#fff;
           text-decoration:none;padding:12px 36px;border-radius:50px;font-size:13px;font-weight:800;
           box-shadow:0 8px 24px rgba(252,101,31,0.3);">
          Unirse a la reunión →
        </a>
      </div>` : ''}
    </div>
  </td></tr>
  <tr><td style="padding-top:20px;text-align:center;">
    <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0;">ATHENIA — Email automático, no respondas</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  }
}

export function emailCallStarting({ nombre, eventoTitulo, canalUrl }) {
  return {
    subject: `🔔 La reunión "${eventoTitulo}" está por comenzar`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060304;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060304;">
<tr><td align="center" style="padding:32px 16px 48px;">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
  <tr><td style="background:#0d0608;border:1px solid rgba(34,197,94,0.2);border-radius:20px;overflow:hidden;">
    <div style="height:4px;background:linear-gradient(90deg,#22c55e,#00D1FF);"></div>
    <div style="padding:32px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🎙</div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:900;color:rgba(255,255,255,0.92);">
        ${eventoTitulo}
      </h1>
      <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.4);">
        Hola ${nombre}, tu reunión está comenzando ahora
      </p>
      <a href="${canalUrl}" style="display:inline-block;background:#22c55e;color:#fff;
         text-decoration:none;padding:14px 40px;border-radius:50px;font-size:14px;font-weight:800;
         box-shadow:0 8px 24px rgba(34,197,94,0.3);">
        Entrar a la reunión →
      </a>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
  }
}
