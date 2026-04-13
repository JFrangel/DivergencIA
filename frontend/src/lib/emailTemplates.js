// ════════════════════════════════════════════════════════════════════════════
// ATHENIA — Plantillas de Email v3.0
// Diseño premium: dark mode, gradientes, lenguaje amigable y único
// ════════════════════════════════════════════════════════════════════════════

// ── Brand tokens ─────────────────────────────────────────────────────────────
const B = {
  primary:   '#FC651F',
  secondary: '#8B5CF6',
  accent:    '#00D1FF',
  success:   '#22C55E',
  warning:   '#FACC15',
  danger:    '#EF4444',
  bg:        '#060304',
  bg2:       '#0d0608',
  surface:   'rgba(255,255,255,0.03)',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.12)',
  t1:        'rgba(255,255,255,0.92)',
  t2:        'rgba(255,255,255,0.60)',
  t3:        'rgba(255,255,255,0.35)',
  t4:        'rgba(255,255,255,0.18)',
  url:       import.meta.env.VITE_SITE_URL || 'https://athenia.vercel.app',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function date(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function time(t) {
  if (!t) return '';
  return new Date(`2000-01-01T${t}`).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
}

/** Gradient top bar */
function topBar(color1 = B.primary, color2 = B.secondary) {
  return `<div style="height:4px;background:linear-gradient(90deg,${color1},${color2});border-radius:16px 16px 0 0;"></div>`;
}

/** Full-width gradient hero band */
function heroBand(emoji, title, subtitle, color1 = B.primary, color2 = B.secondary) {
  return `
  <div style="background:linear-gradient(135deg,${color1}18,${color2}18);border-bottom:1px solid ${B.border};
              padding:40px 32px 36px;text-align:center;border-radius:0;">
    <div style="font-size:48px;line-height:1;margin-bottom:16px;">${emoji}</div>
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:${B.t1};letter-spacing:-0.3px;line-height:1.2;">
      ${title}
    </h1>
    ${subtitle ? `<p style="margin:0;font-size:14px;color:${B.t3};line-height:1.5;">${subtitle}</p>` : ''}
  </div>`;
}

/** Section heading inside content */
function sectionHeading(text, color = B.t2) {
  return `<p style="margin:20px 0 10px;font-size:11px;font-weight:700;letter-spacing:2px;
                    text-transform:uppercase;color:${color};">${esc(text)}</p>`;
}

/** Pill button (CTA) */
function cta(label, href, bg = B.primary, fg = '#fff') {
  return `
  <div style="text-align:center;margin:28px 0 4px;">
    <a href="${esc(href)}"
       style="display:inline-block;background:${bg};color:${fg};text-decoration:none;
              padding:14px 40px;border-radius:50px;font-size:14px;font-weight:800;
              letter-spacing:0.5px;box-shadow:0 8px 24px ${bg}44;">
      ${esc(label)} &rarr;
    </a>
  </div>`;
}

/** Slim secondary link */
function secondaryLink(label, href) {
  return `<div style="text-align:center;margin-top:12px;">
    <a href="${esc(href)}" style="color:${B.t3};font-size:12px;text-decoration:underline;">${esc(label)}</a>
  </div>`;
}

/** Divider with optional label */
function divider(label = '') {
  return label
    ? `<div style="display:flex;align-items:center;gap:12px;margin:24px 0;">
        <div style="flex:1;height:1px;background:${B.border};"></div>
        <span style="color:${B.t4};font-size:10px;letter-spacing:2px;text-transform:uppercase;">${label}</span>
        <div style="flex:1;height:1px;background:${B.border};"></div>
       </div>`
    : `<div style="height:1px;background:${B.border};margin:24px 0;"></div>`;
}

/** Colored info card */
function infoCard(emoji, title, body, color) {
  return `
  <div style="background:${color}0e;border:1px solid ${color}25;border-radius:12px;padding:16px 18px;margin:8px 0;">
    <div style="font-size:20px;margin-bottom:6px;">${emoji}</div>
    <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:4px;">${esc(title)}</div>
    <div style="color:${B.t2};font-size:13px;line-height:1.6;">${body}</div>
  </div>`;
}

/** Numbered step row */
function step(n, text, color = B.primary) {
  return `
  <div style="display:table;width:100%;margin-bottom:10px;">
    <div style="display:table-cell;width:32px;vertical-align:top;padding-top:2px;">
      <div style="width:26px;height:26px;border-radius:50%;background:${color};text-align:center;
                  line-height:26px;font-size:12px;font-weight:800;color:#fff;">${n}</div>
    </div>
    <div style="display:table-cell;vertical-align:middle;padding-left:10px;
                color:${B.t2};font-size:13px;line-height:1.6;">${esc(text)}</div>
  </div>`;
}

/** Key-value row */
function kv(label, val, color = B.t2) {
  return `
  <tr>
    <td style="padding:9px 14px 9px 0;color:${B.t4};font-size:11px;letter-spacing:0.5px;
               text-transform:uppercase;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
    <td style="padding:9px 0;color:${color};font-size:13px;font-weight:500;">${esc(val)}</td>
  </tr>`;
}

/** Badge pill */
function badge(text, bg, fg = '#fff') {
  return `<span style="display:inline-block;background:${bg};color:${fg};padding:3px 12px;
                border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;">${esc(text)}</span>`;
}

/** Big stat */
function stat(value, label, color) {
  return `
  <td style="text-align:center;padding:16px 8px;">
    <div style="font-size:30px;font-weight:900;color:${color};line-height:1;">${esc(String(value))}</div>
    <div style="font-size:10px;color:${B.t4};margin-top:5px;text-transform:uppercase;letter-spacing:1px;">${esc(label)}</div>
  </td>`;
}

// ── Base layout ───────────────────────────────────────────────────────────────

function layout(contentHtml, preheader = '') {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>
    @media only screen and (max-width:600px){
      .wrap{width:100%!important;padding:0 12px!important;}
      .card{border-radius:16px!important;}
      .hero{padding:28px 20px 24px!important;}
      .body{padding:24px 20px!important;}
      .stat-cell{display:block!important;width:100%!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${B.bg};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
             -webkit-font-smoothing:antialiased;">
  ${preheader ? `<span style="display:none;font-size:1px;line-height:1px;max-height:0;overflow:hidden;">${esc(preheader)}</span>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${B.bg};">
    <tr><td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" class="wrap" width="100%" cellspacing="0" cellpadding="0" border="0"
             style="max-width:580px;margin:0 auto;">

        <!-- LOGO HEADER -->
        <tr><td style="padding:0 0 20px;text-align:center;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <div style="width:42px;height:42px;border-radius:12px;
                            background:linear-gradient(135deg,${B.primary},${B.secondary});
                            text-align:center;line-height:42px;font-size:20px;font-weight:900;color:#fff;
                            box-shadow:0 4px 16px ${B.primary}44;">
                  D
                </div>
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:24px;font-weight:900;color:${B.t1};letter-spacing:1px;line-height:1;">
                  Divergenc<span style="color:${B.primary};">IA</span>
                </div>
                <div style="font-size:9px;color:${B.t4};letter-spacing:3.5px;text-transform:uppercase;margin-top:3px;">
                  Semillero de Investigaci&oacute;n en IA
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CONTENT CARD -->
        <tr><td>
          <table role="presentation" class="card" width="100%" cellspacing="0" cellpadding="0" border="0"
                 style="background:${B.bg2};border:1px solid ${B.border};border-radius:20px;overflow:hidden;
                        box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <tr><td>${contentHtml}</td></tr>
          </table>
        </td></tr>

        <!-- FOOTER NAV -->
        <tr><td style="padding:28px 0 0;text-align:center;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 16px;">
            <tr>
              <td style="padding:0 10px;">
                <a href="${B.url}/dashboard" style="color:${B.t3};font-size:11px;text-decoration:none;letter-spacing:0.3px;">Dashboard</a>
              </td>
              <td style="color:${B.border};font-size:14px;line-height:1;">·</td>
              <td style="padding:0 10px;">
                <a href="${B.url}/projects" style="color:${B.t3};font-size:11px;text-decoration:none;letter-spacing:0.3px;">Proyectos</a>
              </td>
              <td style="color:${B.border};font-size:14px;line-height:1;">·</td>
              <td style="padding:0 10px;">
                <a href="${B.url}/ideas" style="color:${B.t3};font-size:11px;text-decoration:none;letter-spacing:0.3px;">Ideas</a>
              </td>
              <td style="color:${B.border};font-size:14px;line-height:1;">·</td>
              <td style="padding:0 10px;">
                <a href="${B.url}/chat" style="color:${B.t3};font-size:11px;text-decoration:none;letter-spacing:0.3px;">Chat</a>
              </td>
              <td style="color:${B.border};font-size:14px;line-height:1;">·</td>
              <td style="padding:0 10px;">
                <a href="${B.url}/learning" style="color:${B.t3};font-size:11px;text-decoration:none;letter-spacing:0.3px;">Aprende</a>
              </td>
            </tr>
          </table>
          <div style="height:1px;background:${B.border};margin:0 0 16px;"></div>
          <p style="margin:0 0 6px;color:${B.t4};font-size:11px;">
            <strong style="color:${B.t3};">ATHENIA</strong> &mdash; Donde la inteligencia artificial converge con la investigaci&oacute;n
          </p>
          <p style="margin:0;color:rgba(255,255,255,0.1);font-size:10px;line-height:1.6;">
            Este email fue generado autom&aacute;ticamente &middot; No respondas a esta direcci&oacute;n<br>
            <a href="${B.url}/notificaciones" style="color:rgba(255,255,255,0.1);text-decoration:underline;">
              Gestionar notificaciones
            </a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. BIENVENIDA
// ════════════════════════════════════════════════════════════════════════════
// data: { nombre }

function templateBienvenida(data) {
  const nombre = data.nombre || 'investigador/a';

  const content = `
    ${topBar(B.primary, B.secondary)}
    ${heroBand('🎉', `¡Hola, ${esc(nombre)}! Ya eres parte del semillero.`, 'Tu solicitud fue aprobada — bienvenido/a a la familia ATHENIA', B.primary, B.secondary)}

    <div class="body" style="padding:32px;">

      <p style="color:${B.t2};font-size:14px;line-height:1.8;margin:0 0 20px;">
        Estamos <strong style="color:${B.t1};">súper contentos</strong> de tenerte acá. ATHENIA es el espacio
        donde investigadores curiosos como tú se reúnen a explorar la IA, colaborar en proyectos reales
        y construir cosas que importan. No hay fórmulas secretas — solo ganas de aprender y crear. ✨
      </p>

      ${divider('para empezar')}

      <div style="margin:0 0 8px;">
        ${infoCard('👤', 'Arma tu perfil', 'Ponle tu foto, tus intereses y tus habilidades. La primera impresión importa — y aquí la tuya va a ser genial.', B.primary)}
        ${infoCard('🔬', 'Explora los proyectos', 'Hay investigación en marcha que espera colaboradores como tú. Encuentra tu tribu en los nodos activos.', B.secondary)}
        ${infoCard('💡', 'Propón una idea', 'Tienes algo en mente? El banco de ideas está hecho para que la comunidad valide y construya sobre tus ocurrencias.', B.accent)}
        ${infoCard('🤖', 'Habla con ATHENIA', 'Nuestra IA interna puede ayudarte con recursos, preguntas y orientación dentro de la plataforma. Pruébala.', '#22C55E')}
      </div>

      ${divider()}

      <div style="text-align:center;background:linear-gradient(135deg,${B.primary}0d,${B.secondary}0d);
                  border:1px solid ${B.border};border-radius:14px;padding:20px;margin:0 0 8px;">
        <div style="font-size:32px;margin-bottom:8px;">🚀</div>
        <p style="color:${B.t1};font-size:15px;font-weight:700;margin:0 0 4px;">Ya tienes acceso completo</p>
        <p style="color:${B.t3};font-size:12px;margin:0;">Entra, explora y no tengas miedo de hacer preguntas en el chat.</p>
      </div>

      ${cta('Entrar a ATHENIA', `${B.url}/dashboard`, `linear-gradient(135deg,${B.primary},${B.secondary})`)}

    </div>`;

  return {
    subject: `¡Bienvenido/a a ATHENIA, ${nombre}! 🎉`,
    html: layout(content, `Hey ${nombre}, tu cuenta está activa — el semillero te espera.`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 2. EVENTO
// ════════════════════════════════════════════════════════════════════════════
// data: { nombre, evento, fecha, hora, horaFin?, ubicacion, descripcion, organizador, eventoId? }

function templateEvento(data) {
  const {
    nombre = 'investigador/a',
    evento = 'Evento',
    fecha,
    hora,
    horaFin,
    ubicacion = 'Por definir',
    descripcion = '',
    organizador = 'ATHENIA',
    eventoId = '',
  } = data;

  const fechaStr = date(fecha);
  const horaStr = hora ? time(hora) : '';
  const horaFinStr = horaFin ? ` → ${time(horaFin)}` : '';

  const calStart = fecha && hora ? `${fecha.replace(/-/g,'')}T${hora.replace(/:/g,'')}00` : '';
  const calEnd   = fecha && horaFin ? `${fecha.replace(/-/g,'')}T${horaFin.replace(/:/g,'')}00` : calStart;
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evento)}&dates=${calStart}/${calEnd}&location=${encodeURIComponent(ubicacion)}&details=${encodeURIComponent(descripcion)}`;

  const content = `
    ${topBar(B.secondary, B.accent)}
    ${heroBand('📅', esc(evento), `Nuevo evento en ATHENIA · ${fechaStr}`, B.secondary, B.accent)}

    <div class="body" style="padding:32px;">

      <p style="color:${B.t2};font-size:14px;line-height:1.8;margin:0 0 20px;">
        Hola <strong style="color:${B.t1};">${esc(nombre)}</strong> 👋 — te avisamos porque hay un evento
        que no querrás perderte. Toma nota, guárdalo en tu calendario y no lo dejes para después.
      </p>

      <!-- Event details card -->
      <div style="background:${B.secondary}0d;border:1px solid ${B.secondary}22;border-radius:14px;
                  overflow:hidden;margin:0 0 20px;">
        <div style="background:${B.secondary}18;padding:12px 18px;border-bottom:1px solid ${B.secondary}18;">
          <span style="color:${B.secondary};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
            📋 Detalles del evento
          </span>
        </div>
        <div style="padding:4px 18px 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${kv('📆 Fecha', fechaStr, B.t1)}
            ${horaStr ? kv('⏰ Hora', `${horaStr}${horaFinStr}`, B.t1) : ''}
            ${kv('📍 Lugar', ubicacion, B.accent)}
            ${kv('🎙 Organiza', organizador, B.secondary)}
          </table>
        </div>
      </div>

      ${descripcion ? `
        ${sectionHeading('Sobre el evento')}
        <p style="color:${B.t2};font-size:13px;line-height:1.8;margin:0 0 20px;
                  padding:16px;background:${B.surface};border-radius:10px;border:1px solid ${B.border};">
          ${esc(descripcion)}
        </p>
      ` : ''}

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="width:48%;padding-right:6px;">
            <a href="${gcal}"
               style="display:block;text-align:center;background:${B.secondary}22;border:1px solid ${B.secondary}33;
                      color:${B.secondary};padding:13px;border-radius:12px;text-decoration:none;
                      font-size:13px;font-weight:700;">
              📅 Añadir al calendario
            </a>
          </td>
          <td style="width:48%;padding-left:6px;">
            <a href="${B.url}/calendar${eventoId ? `?event=${esc(eventoId)}` : ''}"
               style="display:block;text-align:center;background:${B.accent}22;border:1px solid ${B.accent}33;
                      color:${B.accent};padding:13px;border-radius:12px;text-decoration:none;
                      font-size:13px;font-weight:700;">
              🔗 Ver en la plataforma
            </a>
          </td>
        </tr>
      </table>

      <p style="color:${B.t4};font-size:11px;text-align:center;margin:20px 0 0;">
        Recuerda confirmar tu asistencia en la sección de Calendario ✅
      </p>

    </div>`;

  return {
    subject: `📅 ${evento} — ${fechaStr}`,
    html: layout(content, `${evento} el ${fechaStr}. Guárdalo ya en tu calendario.`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. IDEA APROBADA
// ════════════════════════════════════════════════════════════════════════════
// data: { nombre, ideaTitulo, ideaResumen, votos, comentarios?, siguientesPasos? }

function templateIdeaAprobada(data) {
  const {
    nombre = 'investigador/a',
    ideaTitulo = 'Tu idea',
    ideaResumen = '',
    votos = 0,
    comentarios = 0,
    siguientesPasos = [],
  } = data;

  const pasos = siguientesPasos.length > 0 ? siguientesPasos : [
    'Un coordinador se pondrá en contacto pronto para los detalles',
    'Se creará un proyecto vinculado a tu idea',
    'Podrás formar tu equipo y arrancar la investigación',
  ];

  const content = `
    ${topBar(B.success, B.accent)}
    ${heroBand('🏆', `¡Tu idea fue aprobada, ${esc(nombre)}!`, 'La comunidad votó y el resultado habla solo — ¡a darle!', B.success, B.accent)}

    <div class="body" style="padding:32px;">

      <p style="color:${B.t2};font-size:14px;line-height:1.8;margin:0 0 20px;">
        Esto no es cualquier cosa 🔥 Tu idea pasó por la votación de la comunidad y salió victoriosa.
        Eso significa que hay gente real que cree en lo que propusiste. Ahora viene lo bueno: hacerlo realidad.
      </p>

      <!-- Idea highlight -->
      <div style="background:${B.success}0d;border:1px solid ${B.success}25;border-radius:14px;padding:20px;margin:0 0 20px;
                  border-left:4px solid ${B.success};">
        <div style="font-size:11px;color:${B.success};font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">
          ✅ Idea aprobada
        </div>
        <h2 style="margin:0 0 8px;color:${B.t1};font-size:18px;font-weight:800;">
          ${esc(ideaTitulo)}
        </h2>
        ${ideaResumen ? `<p style="margin:0;color:${B.t2};font-size:13px;line-height:1.7;">${esc(ideaResumen)}</p>` : ''}
      </div>

      <!-- Stats -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
             style="background:${B.surface};border:1px solid ${B.border};border-radius:12px;margin:0 0 24px;">
        <tr>
          ${stat(votos, 'votos a favor', B.primary)}
          <td style="width:1px;background:${B.border};"></td>
          ${stat(comentarios, 'comentarios', B.secondary)}
        </tr>
      </table>

      ${divider('próximos pasos')}

      <div style="margin:0 0 20px;">
        ${pasos.map((p, i) => step(i + 1, p, B.success)).join('')}
      </div>

      ${cta('Ver mi idea en la plataforma', `${B.url}/ideas`, B.success)}
      ${secondaryLink('¿Tienes preguntas? Escribe en el chat', `${B.url}/chat`)}

    </div>`;

  return {
    subject: `🏆 Tu idea "${ideaTitulo}" fue aprobada — ¡a construirla!`,
    html: layout(content, `¡Felicidades ${nombre}! Tu idea fue aprobada por la comunidad.`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. TAREA ASIGNADA
// ════════════════════════════════════════════════════════════════════════════
// data: { nombre, tarea, proyecto, prioridad, fechaLimite, asignadoPor, proyectoId?, descripcion? }

function templateTareaAsignada(data) {
  const {
    nombre = 'investigador/a',
    tarea = 'Nueva tarea',
    proyecto = 'Proyecto',
    prioridad = 'media',
    fechaLimite,
    asignadoPor = 'Un coordinador',
    proyectoId = '',
    descripcion = '',
  } = data;

  const prioMap = {
    alta:  { color: B.danger,   icon: '🔴', label: 'Prioridad Alta' },
    media: { color: B.warning,  icon: '🟡', label: 'Prioridad Media' },
    baja:  { color: B.success,  icon: '🟢', label: 'Prioridad Baja' },
  };
  const p = prioMap[prioridad] || prioMap.media;
  const fechaStr = fechaLimite ? date(fechaLimite) : 'Sin fecha límite';

  const content = `
    ${topBar(B.accent, B.secondary)}
    ${heroBand('✅', `Nueva tarea para ti, ${esc(nombre)}`, `${esc(asignadoPor)} te asignó algo en el proyecto ${esc(proyecto)}`, B.accent, B.secondary)}

    <div class="body" style="padding:32px;">

      <p style="color:${B.t2};font-size:14px;line-height:1.8;margin:0 0 20px;">
        Ey! Tienes algo nuevo en tu lista. No te asustes — somos un equipo y acá nos ayudamos.
        Aquí están los detalles de lo que viene:
      </p>

      <!-- Task card -->
      <div style="background:${B.accent}0a;border:1px solid ${B.accent}22;border-radius:14px;overflow:hidden;margin:0 0 20px;">
        <div style="background:${B.accent}14;padding:10px 18px;border-bottom:1px solid ${B.accent}18;
                    display:table;width:100%;">
          <div style="display:table-cell;vertical-align:middle;">
            <span style="color:${B.accent};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
              📌 Tu tarea
            </span>
          </div>
          <div style="display:table-cell;vertical-align:middle;text-align:right;">
            <span style="background:${p.color}22;color:${p.color};font-size:10px;font-weight:700;
                         padding:2px 10px;border-radius:20px;letter-spacing:0.5px;">
              ${p.icon} ${p.label}
            </span>
          </div>
        </div>
        <div style="padding:18px;">
          <h2 style="color:${B.t1};margin:0 0 8px;font-size:18px;font-weight:800;">${esc(tarea)}</h2>
          ${descripcion ? `<p style="color:${B.t2};font-size:13px;line-height:1.7;margin:0 0 16px;">${esc(descripcion)}</p>` : ''}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                 style="border-top:1px solid ${B.border};padding-top:4px;">
            ${kv('📁 Proyecto', proyecto, B.accent)}
            ${kv('📅 Fecha límite', fechaStr, fechaLimite ? B.danger : B.t3)}
            ${kv('👤 Asignada por', asignadoPor, B.secondary)}
          </table>
        </div>
      </div>

      <!-- Motivational tip -->
      <div style="background:${B.secondary}0a;border:1px solid ${B.secondary}18;border-radius:10px;
                  padding:14px 16px;margin:0 0 24px;text-align:center;">
        <p style="color:${B.t3};font-size:12px;margin:0;line-height:1.6;">
          💡 <em>Tip:</em> Si tienes dudas sobre la tarea, pregunta directo en el chat del proyecto.
          El equipo está ahí para apoyarte.
        </p>
      </div>

      ${cta('Ver el proyecto', `${B.url}/projects${proyectoId ? `/${esc(proyectoId)}` : ''}`, B.accent, B.bg)}
      ${secondaryLink('Ir al dashboard de tareas', `${B.url}/dashboard`)}

    </div>`;

  return {
    subject: `📌 Tienes una nueva tarea: ${tarea}`,
    html: layout(content, `${asignadoPor} te asignó "${tarea}" en ${proyecto}.`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. RESUMEN SEMANAL
// ════════════════════════════════════════════════════════════════════════════
// data: { nombre, semana, resumen: {...}, progresoPersonal: {...}, deadlines: [...], destacados: [...] }

function templateResumenSemanal(data) {
  const {
    nombre = 'investigador/a',
    semana = 'esta semana',
    resumen = {},
    progresoPersonal = {},
    deadlines = [],
    destacados = [],
  } = data;

  const {
    ideasNuevas = 0,
    proyectosActivos = 0,
    eventosProximos = 0,
    miembrosNuevos = 0,
  } = resumen;

  const {
    tareasCompletadas = 0,
    tareasTotal = 0,
    horasAprendizaje = 0,
    contribuciones = 0,
  } = progresoPersonal;

  const pct = tareasTotal > 0 ? Math.round((tareasCompletadas / tareasTotal) * 100) : 0;

  const deadlinesHtml = deadlines.length > 0
    ? deadlines.map(d => `
      <div style="padding:10px 14px;background:${B.surface};border:1px solid ${B.border};border-radius:10px;margin-bottom:8px;">
        <div style="color:${B.t1};font-size:13px;font-weight:700;">${esc(d.titulo)}</div>
        <div style="color:${B.t3};font-size:11px;margin-top:3px;">
          📁 ${esc(d.proyecto)} &nbsp;·&nbsp; 📅 ${date(d.fecha)}
        </div>
      </div>`).join('')
    : `<div style="padding:16px;text-align:center;color:${B.t3};font-size:13px;background:${B.surface};border-radius:10px;">
        🎉 Sin fechas límite próximas — respira tranquilo/a
      </div>`;

  const destacadosHtml = destacados.length > 0
    ? destacados.map(d => {
        const c = d.tipo === 'idea' ? B.primary : d.tipo === 'proyecto' ? B.secondary : B.accent;
        return `<div style="border-left:3px solid ${c};padding:10px 14px;background:${c}0a;border-radius:0 10px 10px 0;margin-bottom:8px;">
          <div style="color:${c};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${esc(d.tipo)}</div>
          <div style="color:${B.t1};font-size:13px;font-weight:700;margin-top:3px;">${esc(d.titulo)}</div>
          ${d.descripcion ? `<div style="color:${B.t3};font-size:12px;margin-top:2px;">${esc(d.descripcion)}</div>` : ''}
        </div>`;
      }).join('')
    : '';

  const content = `
    ${topBar(B.primary, B.secondary)}
    ${heroBand('📊', 'Tu resumen semanal', `Hola ${esc(nombre)} — esto pasó en ${esc(semana)}`, B.primary, B.secondary)}

    <div class="body" style="padding:32px;">

      <p style="color:${B.t2};font-size:14px;line-height:1.8;margin:0 0 20px;">
        Una semana más en el semillero. Acá te contamos lo que pasó por la plataforma y cómo vas tú
        en particular. Spoiler: <strong style="color:${B.t1};">el semillero no para. 🔥</strong>
      </p>

      ${divider('en el semillero')}

      <!-- Platform stats -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
             style="background:${B.surface};border:1px solid ${B.border};border-radius:12px;margin:0 0 20px;">
        <tr>
          ${stat(ideasNuevas, 'ideas nuevas', B.primary)}
          <td style="width:1px;background:${B.border};"></td>
          ${stat(proyectosActivos, 'proyectos', B.secondary)}
          <td style="width:1px;background:${B.border};"></td>
          ${stat(eventosProximos, 'eventos', B.accent)}
        </tr>
      </table>

      ${miembrosNuevos > 0 ? `
        <div style="text-align:center;padding:12px;background:${B.success}0a;border:1px solid ${B.success}18;
                    border-radius:10px;margin:0 0 20px;color:${B.t2};font-size:13px;">
          👋 <strong style="color:${B.success};">${miembrosNuevos}</strong> nuevo${miembrosNuevos > 1 ? 's' : ''} miembro${miembrosNuevos > 1 ? 's' : ''} se uni${miembrosNuevos > 1 ? 'eron' : 'ó'} al semillero esta semana
        </div>` : ''}

      ${divider('tu progreso')}

      <!-- Personal progress -->
      <div style="margin:0 0 6px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:8px;">
          <tr>
            <td style="color:${B.t2};font-size:13px;">Tareas completadas</td>
            <td style="text-align:right;color:${B.t1};font-size:13px;font-weight:700;">${tareasCompletadas} / ${tareasTotal}</td>
          </tr>
        </table>
        <div style="width:100%;height:8px;background:${B.border};border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${B.primary},${B.secondary});border-radius:4px;"></div>
        </div>
        <p style="color:${B.t4};font-size:11px;margin:6px 0 0;text-align:right;">${pct}% completado</p>
      </div>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 24px;">
        <tr>
          <td style="width:48%;padding:12px;background:${B.accent}0a;border:1px solid ${B.accent}18;border-radius:10px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:${B.accent};line-height:1;">${horasAprendizaje}h</div>
            <div style="font-size:10px;color:${B.t4};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Aprendizaje</div>
          </td>
          <td style="width:4%;"></td>
          <td style="width:48%;padding:12px;background:${B.secondary}0a;border:1px solid ${B.secondary}18;border-radius:10px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:${B.secondary};line-height:1;">${contribuciones}</div>
            <div style="font-size:10px;color:${B.t4};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Contribuciones</div>
          </td>
        </tr>
      </table>

      ${destacadosHtml ? `${divider('destacados')}${destacadosHtml}<br>` : ''}

      ${divider('fechas límite')}
      ${deadlinesHtml}

      ${cta('Ver mi dashboard', `${B.url}/dashboard`, `linear-gradient(135deg,${B.primary},${B.secondary})`)}

      <p style="color:${B.t4};font-size:11px;text-align:center;margin:16px 0 0;">
        Sigue así — cada contribución cuenta 💪
      </p>

    </div>`;

  return {
    subject: `📊 Tu resumen de ${esc(semana)} en ATHENIA`,
    html: layout(content, `${nombre}, esto pasó en ATHENIA esta semana.`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 6. BROADCAST ADMIN
// ════════════════════════════════════════════════════════════════════════════
// data: { nombre, mensaje, asunto?, remitente, rolRemitente?, urgente? }

function templateBroadcast(data) {
  const {
    nombre = 'investigador/a',
    mensaje = '',
    asunto = 'Comunicado del equipo',
    remitente = 'Administración',
    rolRemitente = 'Administrador',
    urgente = false,
  } = data;

  const c1 = urgente ? B.danger : B.secondary;
  const c2 = urgente ? '#FF8C00' : B.accent;
  const mensajeHtml = esc(mensaje).replace(/\n/g, '<br>');

  const content = `
    ${topBar(c1, c2)}

    ${urgente ? `
      <div style="background:${B.danger}12;border-bottom:2px solid ${B.danger}30;padding:14px 24px;text-align:center;">
        <span style="color:${B.danger};font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">
          ⚠️ Comunicado Urgente
        </span>
      </div>` : ''}

    ${heroBand('📢', esc(asunto), `Un mensaje del equipo de ATHENIA para ti, ${esc(nombre)}`, c1, c2)}

    <div class="body" style="padding:32px;">

      <p style="color:${B.t2};font-size:14px;line-height:1.8;margin:0 0 20px;">
        Hola <strong style="color:${B.t1};">${esc(nombre)}</strong> 👋 — tienes un comunicado del equipo.
        Léelo con calma, y si tienes preguntas no dudes en escribir en el chat.
      </p>

      <!-- Message content -->
      <div style="background:${c1}0d;border:1px solid ${c1}22;border-left:4px solid ${c1};
                  border-radius:0 12px 12px 0;padding:20px 20px 20px 20px;margin:0 0 24px;">
        <p style="color:${B.t2};font-size:14px;line-height:1.9;margin:0;">${mensajeHtml}</p>
      </div>

      <!-- Sender card -->
      <div style="display:table;width:100%;background:${B.surface};border:1px solid ${B.border};
                  border-radius:12px;padding:14px 16px;margin:0 0 8px;">
        <div style="display:table-cell;vertical-align:middle;width:48px;">
          <div style="width:42px;height:42px;border-radius:50%;text-align:center;line-height:42px;
                      font-size:16px;font-weight:900;color:#fff;
                      background:linear-gradient(135deg,${c1},${c2});">
            ${esc(remitente.charAt(0).toUpperCase())}
          </div>
        </div>
        <div style="display:table-cell;vertical-align:middle;padding-left:12px;">
          <div style="color:${B.t1};font-size:14px;font-weight:700;">${esc(remitente)}</div>
          <div style="color:${B.t3};font-size:12px;margin-top:2px;">${esc(rolRemitente)} &middot; ATHENIA</div>
        </div>
      </div>

      ${cta('Ir a la plataforma', `${B.url}/notificaciones`, c1)}

    </div>`;

  return {
    subject: `${urgente ? '⚠️ [URGENTE] ' : '📢 '}${esc(asunto)} — ATHENIA`,
    html: layout(content, `${remitente} envió un comunicado: ${asunto}`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 7. SOLICITUD NUEVA (para admins)
// ════════════════════════════════════════════════════════════════════════════
// data: { nombre, correo, carrera?, motivacion }

function templateSolicitudNueva(data) {
  const {
    nombre = 'Alguien',
    correo = '',
    carrera = '',
    motivacion = '',
  } = data;

  const content = `
    ${topBar(B.secondary, B.primary)}
    ${heroBand('🙋', 'Nueva solicitud de ingreso', `${esc(nombre)} quiere unirse al semillero`, B.secondary, B.primary)}

    <div class="body" style="padding:32px;">

      <p style="color:${B.t2};font-size:14px;line-height:1.8;margin:0 0 20px;">
        Hay alguien que quiere ser parte de ATHENIA. Revisa los datos, evalúa su motivación
        y decide si es el momento de darle la bienvenida. 🎯
      </p>

      <!-- Applicant card -->
      <div style="background:${B.secondary}0d;border:1px solid ${B.secondary}22;border-radius:14px;overflow:hidden;margin:0 0 20px;">
        <div style="background:${B.secondary}14;padding:10px 18px;border-bottom:1px solid ${B.secondary}18;">
          <span style="color:${B.secondary};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
            👤 Datos del solicitante
          </span>
        </div>
        <div style="padding:4px 18px 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${kv('Nombre', nombre, B.t1)}
            ${kv('Correo', correo, B.accent)}
            ${carrera ? kv('Carrera', carrera, B.t1) : ''}
          </table>
        </div>
      </div>

      ${motivacion ? `
        ${sectionHeading('Motivación del solicitante')}
        <div style="background:${B.surface};border:1px solid ${B.border};border-left:3px solid ${B.secondary};
                    border-radius:0 12px 12px 0;padding:16px 18px;margin:0 0 24px;">
          <p style="color:${B.t2};font-size:13px;line-height:1.8;margin:0;font-style:italic;">
            "${esc(motivacion)}"
          </p>
        </div>` : ''}

      ${cta('Revisar solicitud en el Admin', `${B.url}/admin`, B.secondary)}

    </div>`;

  return {
    subject: `🙋 Nueva solicitud: ${nombre} quiere unirse`,
    html: layout(content, `${nombre} envió una solicitud de ingreso al semillero.`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

const TEMPLATES = {
  bienvenida:      templateBienvenida,
  evento:          templateEvento,
  idea_aprobada:   templateIdeaAprobada,
  tarea_asignada:  templateTareaAsignada,
  resumen_semanal: templateResumenSemanal,
  broadcast:       templateBroadcast,
  solicitud_nueva: templateSolicitudNueva,
};

/**
 * Genera una plantilla de email personalizada.
 * @param {'bienvenida'|'evento'|'idea_aprobada'|'tarea_asignada'|'resumen_semanal'|'broadcast'|'solicitud_nueva'} type
 * @param {Object} data
 * @returns {{ subject: string, html: string }}
 */
export function getEmailTemplate(type, data = {}) {
  const builder = TEMPLATES[type];
  if (!builder) throw new Error(`Plantilla "${type}" no encontrada. Disponibles: ${Object.keys(TEMPLATES).join(', ')}`);
  return builder(data);
}

export {
  templateBienvenida, templateEvento, templateIdeaAprobada,
  templateTareaAsignada, templateResumenSemanal, templateBroadcast, templateSolicitudNueva,
};

export default getEmailTemplate;
