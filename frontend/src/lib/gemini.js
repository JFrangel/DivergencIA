import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

let genAI = null
function getClient() {
  if (!API_KEY) return null
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY)
  return genAI
}

// ─── System prompt de ATHENIA ─────────────────────────────────────────────
const ATHENIA_SYSTEM = `Eres ATHENIA, la inteligencia artificial del semillero de investigación DivergencIA.
Tu misión es asistir a los investigadores del semillero con:
- Información sobre proyectos, miembros e ideas del semillero
- Sugerencias de datasets y papers para proyectos en curso
- Explicaciones de conceptos de ML/IA (NLP, Computer Vision, RAG, Transformers, MLOps)
- Resúmenes de avances largos
- Conexiones semánticas entre áreas temáticas

Responde en español. Sé técnico, preciso y conciso. Usa terminología académica apropiada.
Cuando el usuario use comandos como /help, /status, /members, etc., esos son manejados por el sistema — tú solo respondes preguntas de lenguaje natural.
Mantén un tono profesional pero accesible para estudiantes universitarios STEM.`

// ─── Chat con historial ────────────────────────────────────────────────────
export async function atheniaChat(history = [], userMessage, semilleroContext = '') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: ATHENIA_SYSTEM + (semilleroContext ? `\n\nCONTEXTO ACTUAL DEL SEMILLERO:\n${semilleroContext}` : ''),
  })

  const chat = model.startChat({
    history: history.map(m => ({
      role: m.rol === 'user' ? 'user' : 'model',
      parts: [{ text: m.mensaje }],
    })),
  })

  const result = await chat.sendMessage(userMessage)
  return result.response.text()
}

// ─── Análisis de imagen (pizarrón) ────────────────────────────────────────
export async function analyzeChalkboard(imageBase64, mimeType = 'image/jpeg') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const result = await model.generateContent([
    {
      inlineData: { data: imageBase64, mimeType },
    },
    `Analiza esta imagen de un pizarrón o diapositiva académica.
Extrae el texto y los conceptos visibles.
Devuelve un mapa conceptual estructurado en formato JSON con esta estructura:
{
  "titulo": "tema principal",
  "conceptos": [
    {
      "id": "1",
      "texto": "concepto",
      "hijos": [{"id": "1.1", "texto": "sub-concepto", "hijos": []}]
    }
  ],
  "resumen": "resumen en 2-3 líneas del contenido del pizarrón"
}
Responde SOLO con el JSON válido, sin markdown ni texto adicional.`,
  ])

  const text = result.response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { titulo: 'Mapa Conceptual', conceptos: [], resumen: text }
  }
}

// ─── Conexión semántica entre temas ───────────────────────────────────────
export async function connectTopics(topicA, topicB, context = '') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const result = await model.generateContent(
    `En el contexto de investigación en IA, analiza la conexión semántica entre:
TEMA A: "${topicA}"
TEMA B: "${topicB}"
${context ? `CONTEXTO DEL SEMILLERO: ${context}` : ''}

Responde en máximo 3 párrafos cortos:
1. Similitudes y puntos de encuentro
2. Cómo podrían integrarse en un proyecto de investigación
3. Papers o técnicas que conectan ambos temas

Sé específico y técnico, orientado a estudiantes de investigación STEM.`
  )

  return result.response.text()
}
