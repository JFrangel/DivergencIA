import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW'
const FROM_EMAIL = 'DivergencIA <onboarding@resend.dev>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SinglePayload {
  to: string
  subject: string
  html: string
}

interface BatchItem {
  to: string
  subject: string
  html: string
}

interface BatchPayload {
  batch: BatchItem[]
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()

    // ── Batch mode: { batch: [{ to, subject, html }, ...] } ──────────────────
    if (body.batch) {
      const { batch } = body as BatchPayload
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
        console.error('Resend batch error:', JSON.stringify(data))
        return new Response(JSON.stringify({ error: 'Batch send failed', details: data }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      console.log('Batch sent:', emails.length, 'emails')
      return new Response(JSON.stringify({ success: true, count: emails.length, data }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── Single mode: { to, subject, html } ───────────────────────────────────
    const { to, subject, html } = body as SinglePayload
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
      console.error('Resend error:', JSON.stringify(data))
      return new Response(JSON.stringify({ error: 'Send failed', details: data }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log('Email sent:', data.id, 'to:', to)
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
