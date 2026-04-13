import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash-lite'

let genAI = null
function getClient() {
  if (!API_KEY) return null
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY)
  return genAI
}

// ─── System prompt de ATHENIA ─────────────────────────────────────────────
const ATHENIA_SYSTEM = `Eres ATHENIA — la inteligencia artificial integrada en la plataforma del semillero universitario de investigación en IA. Eres el cerebro técnico del laboratorio: respondes preguntas de IA/ML con profundidad real, conectas ideas entre proyectos, y ayudas al equipo a investigar mejor. Hablas en español, con precisión académica pero sin pedantería.

IDENTIDAD — QUIÉN ERES:
Eres parte de una plataforma web universitaria para semilleros de investigación. La plataforma tiene módulos de proyectos, ideas, aprendizaje, chat, roadmap, calendario, biblioteca, murales, y más. Tú eres el asistente IA transversal de toda la plataforma. NO eres un chatbot genérico, ni eres solo para murales — eres experta en IA/ML y en el contexto del semillero.

PERSONALIDAD Y TONO:
- Humor técnico ocasional: referencias a "attention is all you need", al gradiente que desaparece, embeddings que convergen
- Usas analogías con física (gradiente descendiente = topografía de valles de energía), biología (backprop = plasticidad sináptica)
- Emojis técnicos con moderación: ⚡ eficiencia, 🧠 arquitecturas, 🔬 experimentos, 📊 métricas, 🔭 especulación
- Directo y denso en información útil; 0 frases de relleno

CONOCIMIENTO TÉCNICO — RESPONDE CON CONFIANZA:
- Conceptos de IA/ML: NLP, Computer Vision, RAG, Transformers, Diffusion, MLOps, RL, GNNs, SSMs (Mamba), multimodal, LLMs, embeddings, fine-tuning, RLHF, quantization, LoRA, attention mechanisms, BERT, GPT, CLIP, Stable Diffusion, etc.
- Cuando alguien pregunte "qué es X", "explícame X", "cómo funciona X" — responde directamente con el concepto. NUNCA sugieras un mural para responder una pregunta teórica.
- Papers: cita arXiv ID cuando lo conozcas, autores principales, año, relevancia concreta
- Datasets, repos, benchmarks: menciona los reales (HuggingFace, Papers with Code, Kaggle, etc.)
- Si no sabes algo con certeza, dilo y propón cómo verificarlo

CONOCIMIENTO DE LA PLATAFORMA:
Cuando recibas "CONTEXTO ACTUAL DEL SEMILLERO", úsalo activamente:
- Menciona proyectos por nombre cuando sean relevantes
- Conecta ideas del banco con la pregunta del usuario
- Referencia temas de aprendizaje disponibles cuando el usuario quiera estudiar algo
- Trata los datos como hechos reales del laboratorio, no hipotéticos
- Si el usuario pregunta "qué puedo hacer aquí" o "cómo funciona la plataforma", describe los módulos disponibles

CUÁNDO SUGERIR EL MURAL (SOLO EN ESTOS CASOS):
ÚNICAMENTE cuando el usuario use palabras explícitas como: "crea un mural", "genera un mural", "qué pongo en el mural", "organiza en el mural", "layout para el mural". En ese caso:
1. Responde con descripción del layout + JSON listo
2. Estructura JSON: { "titulo_layout": "...", "resumen": "...", "elementos": [...] }
3. Tipos: "titulo" {titulo,subtitulo}, "sticky" {titulo,texto}, "texto" {titulo,cuerpo}, "etiqueta" {titulo}, "checklist" {titulo,items[]}, "link" {titulo,url}
4. Incluye 6-12 elementos; empieza con "titulo", termina con al menos un "link"
Para cualquier otra pregunta (conceptos, papers, ayuda con proyectos, preguntas técnicas) — responde directamente SIN mencionar murales.

FORMATO DE RESPUESTA:
- Respuestas largas: usa ### secciones, listas markdown, bloques \`\`\`python/\`\`\`js para código
- Respuestas cortas: prosa directa, máx 3 párrafos
- NO uses "¡Claro!", "¡Por supuesto!", "Espero haberte ayudado" — ve directo al contenido

Los comandos /help /status /members /projects /ideas /roadmap /tasks /mural son manejados por el sistema. Tú atiendes el lenguaje natural.`

// ─── Chat con historial ────────────────────────────────────────────────────
export async function atheniaChat(history = [], userMessage, semilleroContext = '') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
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

  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

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

// ─── Generador de mensajes de broadcast ──────────────────────────────────
export async function generateBroadcastMessages(tipo, contexto, count = 3) {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

  const TIPO_LABELS = {
    admin_broadcast:    'anuncio general del semillero',
    evento_proximo:     'evento académico próximo',
    recordatorio:       'recordatorio de actividad',
    alerta:             'alerta importante',
    sugerencia:         'sugerencia de aprendizaje o mejora',
    reconocimiento:     'reconocimiento al equipo o miembros',
    voto_recordatorio:  'recordatorio para votar en ideas',
    bienvenida:         'mensaje de bienvenida a nuevos miembros',
  }

  const prompt = `Eres el coordinador de comunicaciones de "ATHENIA", un semillero universitario de investigación en Inteligencia Artificial (IA).
Debes generar ${count} variaciones de una notificación de tipo "${TIPO_LABELS[tipo] || tipo}".
${contexto ? `Contexto adicional: ${contexto}` : ''}

Reglas:
- Cada mensaje máximo 120 caracteres
- Tono profesional pero cálido, en español
- Específico para un semillero universitario de investigación en IA
- Usa emojis de forma moderada (1-2 por mensaje máximo)
- Sin markdown, solo texto plano

Devuelve EXACTAMENTE un JSON válido con este formato (sin código markdown ni texto adicional):
{"mensajes": ["mensaje 1", "mensaje 2", "mensaje 3"]}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed.mensajes || []
  } catch {
    return []
  }
}

// ─── Helper: extrae texto de secciones del topic ─────────────────────────
function buildTopicContext(topic) {
  const sections = Array.isArray(topic.contenido) ? topic.contenido : []
  const textContent = sections
    .filter(s => s.tipo === 'texto' || s.tipo === 'codigo')
    .map(s => `[${s.titulo || s.tipo}]: ${typeof s.contenido === 'string' ? s.contenido.slice(0, 600) : ''}`)
    .join('\n')
  return textContent ? `\nCONTENIDO:\n${textContent.slice(0, 3000)}` : ''
}

// ─── Generador de Flashcards ──────────────────────────────────────────────
export async function generateFlashcards(topic, count = 8) {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({ model: GEMINI_MODEL })
  const ctx = buildTopicContext(topic)

  const prompt = `Eres un asistente educativo especializado en IA y Machine Learning.
Genera exactamente ${count} flashcards educativas basadas en este tema.

TEMA: ${topic.titulo}
CATEGORÍA: ${topic.categoria || 'General'}
NIVEL: ${topic.nivel || 'basico'}${ctx}

Reglas:
- Pregunta clara y directa (máx 120 chars)
- Respuesta explicativa pero concisa (máx 250 chars)
- Cubre conceptos clave del tema, progresión básico → avanzado
- En español técnico accesible

Devuelve SOLO JSON válido sin markdown:
{"flashcards": [{"pregunta": "...", "respuesta": "..."}, ...]}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(text)
  return parsed.flashcards || []
}

// ─── Generador de Quiz Dinámico ───────────────────────────────────────────
export async function generateDynamicQuiz(topic, count = 5) {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({ model: GEMINI_MODEL })
  const ctx = buildTopicContext(topic)

  const prompt = `Eres un evaluador académico de IA y Machine Learning.
Genera exactamente ${count} preguntas de opción múltiple para evaluar comprensión del tema.

TEMA: ${topic.titulo}
CATEGORÍA: ${topic.categoria || 'General'}
NIVEL: ${topic.nivel || 'basico'}${ctx}

Reglas:
- 4 opciones por pregunta (A, B, C, D)
- Una sola respuesta correcta por pregunta
- Incluye una explicación breve (máx 150 chars) de por qué es correcta
- Dificultad progresiva: primeras preguntas más fáciles
- En español técnico accesible

Devuelve SOLO JSON válido sin markdown:
{"preguntas": [{"pregunta": "...", "opciones": ["A", "B", "C", "D"], "respuesta_correcta": 0, "explicacion": "..."}, ...]}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(text)
  return parsed.preguntas || []
}

// ─── Generador de layout para el Mural ───────────────────────────────────
export async function generateMuralSuggestions(prompt) {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

  const result = await model.generateContent(`Eres un diseñador experto de tableros visuales colaborativos para el semillero de IA ATHENIA.
El usuario pide: "${prompt}"

Genera un layout visual completo y rico. Usa una mezcla variada de estos tipos de elementos disponibles:
- "titulo": tarjeta principal destacada (titulo + subtitulo). Usala 1 vez como encabezado.
- "sticky": nota adhesiva colorida con idea corta (titulo + texto). Usa 3-6.
- "texto": tarjeta de notas con mas detalle (titulo + cuerpo). Usa 1-3.
- "etiqueta": texto libre flotante, como un encabezado de seccion o anotacion (texto corto). Usa 1-3.
- "forma": elemento visual decorativo/organizador. Tipos: rect, circle, diamond, hexagon, callout, arrow. Indica tipo + etiqueta corta opcional. Usa 1-3.
- "checklist": lista de pasos o tareas (titulo + items: array de strings, max 5 items). Usa 0-2.
- "link": tarjeta de referencia (titulo + url + descripcion). Usa 0-2.

Organiza el layout en secciones logicas. Varia los tipos para crear un mural visual interesante.
Genera entre 8 y 14 elementos en total.

IMPORTANTE: Responde UNICAMENTE con el JSON puro, sin explicaciones, sin bloques de codigo, sin markdown.
El JSON debe tener exactamente esta estructura:
{"titulo_layout":"...","resumen":"...","elementos":[{"tipo":"titulo","titulo":"...","subtitulo":"..."},{"tipo":"sticky","titulo":"...","texto":"..."},{"tipo":"texto","titulo":"...","cuerpo":"..."},{"tipo":"etiqueta","texto":"..."},{"tipo":"forma","forma":"rect","etiqueta":"..."},{"tipo":"checklist","titulo":"...","items":["item1","item2"]},{"tipo":"link","titulo":"...","url":"https://example.com","descripcion":"..."}]}`)

  const raw = result.response.text()
  console.log('[Gemini Mural] response length:', raw.length)

  let text = raw.trim()
  // Strip any markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  // Extract first valid JSON object
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    console.error('[Gemini Mural] No JSON found in response:', text.slice(0, 300))
    throw new Error('Gemini no devolvio JSON valido')
  }
  text = text.slice(start, end + 1)

  try {
    return JSON.parse(text)
  } catch (err) {
    console.error('[Gemini Mural] JSON parse error:', err.message, '\nText:', text.slice(0, 200))
    throw new Error(`Error al procesar respuesta de IA: ${err.message}`)
  }
}

// ─── Auto-categorización de temas de aprendizaje ─────────────────────────────
export async function autoCategorize(titulo, descripcion = '', existingCategories = []) {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

  const catHint = existingCategories.length
    ? `Categorías existentes: ${existingCategories.join(', ')}. Usa una de estas si aplica; si no encaja, crea una nueva (máx 2 palabras en español).`
    : 'Categorías comunes: ML, NLP, Vision, Datos, General.'

  const result = await model.generateContent(
    `Clasifica este tema de investigación en IA/ML y sugiere 1-2 recursos de referencia.
TÍTULO: ${titulo}
${descripcion ? `DESCRIPCIÓN: ${descripcion.slice(0, 400)}` : ''}

${catHint}
Niveles: basico, intermedio, avanzado.

Devuelve SOLO JSON sin markdown:
{"categoria":"nombre","nivel":"basico|intermedio|avanzado","tags":["tag1","tag2","tag3"],"recursos":[{"titulo":"Nombre recurso","url":"https://...","tipo":"paper|tutorial|video|enlace"}]}`
  )
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim()
  try { return JSON.parse(text) } catch { return null }
}

// ─── Generador de secciones de contenido para un tema ────────────────────────
export async function generateTopicSections(titulo, descripcion = '', categoria = '', nivel = '') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

  const result = await model.generateContent(
    `Eres un experto en pedagogía de IA y Machine Learning.
Genera un plan de secciones de aprendizaje para este tema.

TÍTULO: ${titulo}
${descripcion ? `DESCRIPCIÓN: ${descripcion.slice(0, 400)}` : ''}
CATEGORÍA: ${categoria || 'General'}
NIVEL: ${nivel || 'basico'}

Crea entre 4 y 7 secciones variadas y pedagógicamente ordenadas.
Tipos disponibles: texto, codigo, quiz, imagen, video.
- "texto": explicación conceptual (genera el contenido completo, mínimo 3 párrafos separados por \\n\\n)
- "codigo": ejemplo de código real y funcional (genera el código completo)
- "quiz": pregunta de opción múltiple (en formato JSON exacto)
- "video": solo el título y URL de YouTube relevante (si conoces uno real)
- "imagen": solo el título y URL de imagen explicativa

Devuelve SOLO JSON sin markdown:
{"secciones":[
  {"titulo":"Nombre de la sección","tipo":"texto|codigo|quiz|video|imagen","contenido":"contenido completo","preview":"resumen 1 línea"}
]}`
  )
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim()
  try {
    const parsed = JSON.parse(text)
    return parsed.secciones || []
  } catch { return [] }
}

// ─── Tarjeta ilustrativa AI para temas de aprendizaje ─────────────────────────
export async function generateIllustrativeCard(topic) {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })
  const ctx = buildTopicContext(topic)
  const result = await model.generateContent(
    `Eres un experto en IA y aprendizaje visual. Genera una tarjeta ilustrativa para este tema.

TEMA: ${topic.titulo}
CATEGORÍA: ${topic.categoria || 'General'}
NIVEL: ${topic.nivel || 'basico'}${ctx}

Incluye:
- concepto: frase que capture la esencia (máx 100 chars)
- ejemplo: ejemplo concreto o analogía (máx 180 chars)
- tip: dato curioso o consejo práctico (máx 120 chars)
- emoji: emoji que represente el tema
- color: hex temático ("ML"→"#FC651F","NLP"→"#8B5CF6","Vision"→"#00D1FF","Datos"→"#22c55e")

Devuelve SOLO JSON sin markdown:
{"concepto":"...","ejemplo":"...","tip":"...","emoji":"...","color":"#hexcolor"}`
  )
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim()
  try { return JSON.parse(text) } catch { return null }
}

// ─── Sugerencia de imágenes para secciones ────────────────────────────────
export async function suggestSectionImages(topicTitle, sectionTitle = '', contenido = '') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

  const result = await model.generateContent(
    `Eres un asistente de investigación académica en IA y Machine Learning.
Sugiere 3 imágenes educativas reales para ilustrar este tema/sección.

TEMA: ${topicTitle}
${sectionTitle ? `SECCIÓN: ${sectionTitle}` : ''}
${contenido ? `CONTENIDO (primeras 300 chars): ${contenido.slice(0, 300)}` : ''}

Para cada imagen proporciona:
- Una URL real y estable de Wikimedia Commons, Wikipedia, arXiv o un recurso educativo conocido
- Si no conoces una URL exacta, usa el patrón: https://upload.wikimedia.org/wikipedia/commons/thumb/... que conozcas
- Como alternativa usa URLs de recursos de ML reconocidos (papers with code, distill.pub, etc.)
- Una descripción corta de qué muestra la imagen
- La fuente (Wikipedia, Wikimedia, arXiv, etc.)

También incluye 2 queries de búsqueda en inglés para que el usuario busque manualmente.

Devuelve SOLO JSON sin markdown:
{"imagenes":[{"url":"https://...","descripcion":"...","fuente":"Wikipedia"},{"url":"https://...","descripcion":"...","fuente":"arXiv"},{"url":"https://...","descripcion":"...","fuente":"Wikimedia"}],"queries":["query 1 en inglés","query 2 en inglés"]}`
  )
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim()
  try { return JSON.parse(text) } catch { return { imagenes: [], queries: [] } }
}

// ─── Sugerencia de título para sección ────────────────────────────────────
export async function suggestSectionTitle(topicTitle, tipo, contenido = '') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

  const result = await model.generateContent(
    `Genera un título conciso y descriptivo (máx 6 palabras en español) para esta sección de aprendizaje.

TEMA DEL TOPIC: ${topicTitle}
TIPO DE SECCIÓN: ${tipo}
CONTENIDO (primeras 200 chars): ${contenido.slice(0, 200)}

Devuelve SOLO el título como texto plano, sin comillas ni formato extra.`
  )
  return result.response.text().trim().replace(/^["']|["']$/g, '')
}

// ─── Comparación entre versiones del changelog ───────────────────────────
export async function generateChangelogComparison(prevVersion, prevContent, newVersion, newContent) {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')
  const model = client.getGenerativeModel({ model: GEMINI_MODEL })
  const result = await model.generateContent(
    `Eres un analista de notas de versión. Compara estas dos versiones y escribe un resumen en español (4-6 oraciones) destacando los cambios más relevantes para los usuarios del semillero. Sé directo y útil, sin tecnicismos innecesarios.

Versión anterior (v${prevVersion}):
${prevContent}

Nueva versión (v${newVersion}):
${newContent}

Escribe una comparación clara y concisa en prosa, sin listas ni markdown.`
  )
  return result.response.text().trim()
}

// ─── Conexión semántica entre temas ───────────────────────────────────────
export async function connectTopics(topicA, topicB, context = '') {
  const client = getClient()
  if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')

  const model = client.getGenerativeModel({ model: GEMINI_MODEL })

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
