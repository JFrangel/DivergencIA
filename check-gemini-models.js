#!/usr/bin/env node
/**
 * check-gemini-models.js
 * Lists all Gemini models available for your API key.
 *
 * Usage:
 *   node check-gemini-models.js <YOUR_API_KEY>
 *   # or set VITE_GEMINI_API_KEY in your environment:
 *   VITE_GEMINI_API_KEY=... node check-gemini-models.js
 */

const API_KEY = process.argv[2] || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

if (!API_KEY) {
  console.error('Usage: node check-gemini-models.js <API_KEY>')
  console.error('   or: VITE_GEMINI_API_KEY=... node check-gemini-models.js')
  process.exit(1)
}

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    console.error(`Error ${res.status}: ${err}`)
    process.exit(1)
  }
  const data = await res.json()
  const models = data.models || []

  console.log(`\n✅ ${models.length} models available:\n`)
  console.log('NAME'.padEnd(50) + 'DISPLAY NAME')
  console.log('─'.repeat(90))

  for (const m of models) {
    const name = m.name.replace('models/', '')
    const methods = m.supportedGenerationMethods || []
    const canGenerate = methods.includes('generateContent')
    const marker = canGenerate ? '✓' : ' '
    console.log(`${marker} ${name.padEnd(48)} ${m.displayName || ''}`)
  }

  console.log('\n✓ = supports generateContent (usable in this app)')

  // Show recommended budget model
  const budget = models.find(m =>
    m.name.includes('flash') &&
    (m.supportedGenerationMethods || []).includes('generateContent')
  )
  if (budget) {
    console.log(`\n💡 Recommended budget model: ${budget.name.replace('models/', '')}`)
  }
}

listModels().catch(err => { console.error(err); process.exit(1) })
