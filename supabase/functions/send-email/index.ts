import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import nodemailer from 'npm:nodemailer@6'

// ── Provider detection ────────────────────────────────────────────────────────
// Priority: Gmail SMTP (free) → Resend (requires paid plan or verified domain)
const GMAIL_USER     = Deno.env.get('GMAIL_USER')
const GMAIL_PASS     = Deno.env.get('GMAIL_APP_PASSWORD')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'DivergencIA <onboarding@resend.dev>'
const USE_GMAIL      = !!(GMAIL_USER && GMAIL_PASS)

// Gmail SMTP transporter (nodemailer, free — up to ~500 emails/day)
let gmailTransporter: ReturnType<typeof nodemailer.createTransport> | null = null
if (USE_GMAIL) {
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  })
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Gmail: send single email ──────────────────────────────────────────────────
async function sendGmail(to: string, subject: string, html: string): Promise<void> {
  if (!gmailTransporter) throw new Error('Gmail transporter not configured')
  await gmailTransporter.sendMail({
    from: GMAIL_USER ? `DivergencIA <${GMAIL_USER}>` : FROM_EMAIL,
    to,
    subject,
    html,
  })
}

// ── Resend: send single email ─────────────────────────────────────────────────
async function sendResend(to: string, subject: string, html: string): Promise<{ id: string }> {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || data?.error || JSON.stringify(data))
  return data
}

// ── Resend: send batch ────────────────────────────────────────────────────────
async function sendResendBatch(
  items: Array<{ to: string; subject: string; html: string }>
): Promise<unknown> {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  const emails = items.map(i => ({ from: FROM_EMAIL, to: [i.to], subject: i.subject, html: i.html }))
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify(emails),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || data?.error || JSON.stringify(data))
  return data
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()

    // ── Batch mode ────────────────────────────────────────────────────────────
    if (body.batch) {
      const batch = body.batch as Array<{ to: string; subject: string; html: string }>
      if (!Array.isArray(batch) || batch.length === 0)
        return json({ error: 'batch must be a non-empty array' }, 400)

      const valid = batch.filter(i => i.to && i.subject && i.html)
      if (valid.length === 0) return json({ error: 'No valid items in batch' }, 400)

      if (USE_GMAIL) {
        // Gmail: send sequentially to avoid hitting rate limits
        const results = []
        for (const item of valid) {
          try {
            await sendGmail(item.to, item.subject, item.html)
            results.push({ to: item.to, ok: true })
          } catch (e) {
            console.error(`Gmail batch error for ${item.to}:`, e.message)
            results.push({ to: item.to, ok: false, error: e.message })
          }
        }
        const sent = results.filter(r => r.ok).length
        console.log(`Gmail batch: ${sent}/${valid.length} sent`)
        return json({ success: true, count: sent, provider: 'gmail', results })
      } else {
        const data = await sendResendBatch(valid)
        console.log(`Resend batch: ${valid.length} emails`)
        return json({ success: true, count: valid.length, provider: 'resend', data })
      }
    }

    // ── Single mode ───────────────────────────────────────────────────────────
    const { to, subject, html } = body as { to: string; subject: string; html: string }
    if (!to || !subject || !html) return json({ error: 'Missing: to, subject, html' }, 400)

    if (USE_GMAIL) {
      await sendGmail(to, subject, html)
      console.log(`Gmail sent → ${to}`)
      return json({ success: true, provider: 'gmail' })
    } else {
      const data = await sendResend(to, subject, html)
      console.log(`Resend sent: ${(data as { id: string }).id} → ${to}`)
      return json({ success: true, provider: 'resend', id: (data as { id: string }).id })
    }

  } catch (err) {
    const hint = USE_GMAIL
      ? 'Gmail SMTP failed. Check GMAIL_USER and GMAIL_APP_PASSWORD secrets. Make sure 2-Step Verification is enabled and you\'re using an App Password (not your regular Gmail password).'
      : 'Using Resend. In sandbox mode, delivery only works to your Resend-registered email. Set GMAIL_USER + GMAIL_APP_PASSWORD to use Gmail SMTP for free instead.'
    console.error('send-email error:', err.message)
    return new Response(JSON.stringify({ error: err.message, hint }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
