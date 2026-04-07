import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required')
}
// NOTE: onboarding@resend.dev only delivers to your Resend-registered email (sandbox restriction).
// To send to any address, verify a domain at resend.com/domains and change FROM_EMAIL below.
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'DivergencIA <onboarding@resend.dev>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()

    // ── Batch mode ───────────────────────────────────────────────────────────
    if (body.batch) {
      const batch = body.batch as Array<{ to: string; subject: string; html: string }>
      if (!Array.isArray(batch) || batch.length === 0) {
        return new Response(JSON.stringify({ error: 'batch must be a non-empty array' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      const emails = batch
        .filter(item => item.to && item.subject && item.html)
        .map(item => ({ from: FROM_EMAIL, to: [item.to], subject: item.subject, html: item.html }))

      if (emails.length === 0) {
        return new Response(JSON.stringify({ error: 'No valid items in batch' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify(emails),
      })

      const data = await res.json()
      if (!res.ok) {
        const errMsg = data?.message || data?.error || JSON.stringify(data)
        console.error(`Resend batch error [${res.status}]: ${errMsg}`)
        // Surface the actual Resend error so it's visible in edge function logs
        return new Response(JSON.stringify({ error: errMsg, statusCode: res.status, hint: 'If using onboarding@resend.dev, you can only send to your Resend-registered email. Verify a domain at resend.com/domains to send to any address.' }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      console.log(`Batch sent: ${emails.length} emails`)
      return new Response(JSON.stringify({ success: true, count: emails.length, data }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── Single mode ──────────────────────────────────────────────────────────
    const { to, subject, html } = body as { to: string; subject: string; html: string }
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing: to, subject, html' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    })

    const data = await res.json()
    if (!res.ok) {
      const errMsg = data?.message || data?.error || JSON.stringify(data)
      console.error(`Resend error [${res.status}] to ${to}: ${errMsg}`)
      return new Response(JSON.stringify({ error: errMsg, statusCode: res.status, hint: 'If using onboarding@resend.dev, you can only send to your Resend-registered email. Verify a domain at resend.com/domains to send to any address.' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Email sent: ${data.id} → ${to}`)
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Unexpected error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
