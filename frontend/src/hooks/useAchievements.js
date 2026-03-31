import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/* ══════════════════════════════════════════════════════════════════════
   Achievement Tiers — 6 levels with increasing multipliers
   ══════════════════════════════════════════════════════════════════════ */
const TIERS = [
  { id: 'bronce',     label: 'Bronce',     multiplier: 1,   badge: '\ud83e\udd49' },
  { id: 'plata',      label: 'Plata',      multiplier: 3,   badge: '\ud83e\udd48' },
  { id: 'oro',        label: 'Oro',        multiplier: 10,  badge: '\ud83e\udd47' },
  { id: 'platino',    label: 'Platino',    multiplier: 25,  badge: '\ud83d\udc8e' },
  { id: 'diamante',   label: 'Diamante',   multiplier: 50,  badge: '\ud83d\udc51' },
  { id: 'legendario', label: 'Legendario', multiplier: 100, badge: '\ud83c\udf1f' },
]

/* ══════════════════════════════════════════════════════════════════════
   Base Achievements — each generates 6 tiered versions
   ~178 bases × 6 tiers = 1068 total achievements
   ══════════════════════════════════════════════════════════════════════ */
const BASE_ACHIEVEMENTS = [
  // ── APRENDIZAJE ──────────────────────────────────────────────────────
  // Subcategory: Temas
  { base: 'temas_completados', name: 'Estudiante', desc: 'Completa {n} temas', trackKey: 'topics_completed', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 1, color: '#00D1FF', icon: '\ud83d\udcda' },
  { base: 'temas_avanzados', name: 'Avanzado', desc: 'Completa {n} temas avanzados', trackKey: 'advanced_topics', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83c\udf93' },
  { base: 'temas_ml', name: 'ML Learner', desc: 'Completa {n} temas de Machine Learning', trackKey: 'ml_topics', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 1, color: '#FC651F', icon: '\ud83e\udd16' },
  { base: 'temas_nlp', name: 'Lingüista', desc: 'Completa {n} temas de NLP', trackKey: 'nlp_topics', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udcac' },
  { base: 'temas_vision', name: 'Visionario CV', desc: 'Completa {n} temas de Visión', trackKey: 'vision_topics', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 1, color: '#EF4444', icon: '\ud83d\udc41\ufe0f' },
  { base: 'temas_datos', name: 'Datero', desc: 'Completa {n} temas de Datos', trackKey: 'data_topics', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udcc8' },

  // Subcategory: Quizzes
  { base: 'quizzes_aprobados', name: 'Examinador', desc: 'Aprueba {n} quizzes', trackKey: 'quizzes_passed', category: 'aprendizaje', subcategory: 'Quizzes', baseThreshold: 1, color: '#8B5CF6', icon: '\u2705' },
  { base: 'notas_perfectas', name: 'Perfeccionista', desc: '{n} quizzes con nota perfecta', trackKey: 'perfect_quizzes', category: 'aprendizaje', subcategory: 'Quizzes', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udcaf' },
  { base: 'quizzes_rapidos', name: 'Veloz Mental', desc: 'Completa {n} quizzes en menos de 2 min', trackKey: 'quick_quizzes', category: 'aprendizaje', subcategory: 'Quizzes', baseThreshold: 1, color: '#FC651F', icon: '\u26a1' },
  { base: 'quizzes_seguidos', name: 'Racha Quiz', desc: '{n} quizzes aprobados seguidos', trackKey: 'quiz_streak', category: 'aprendizaje', subcategory: 'Quizzes', baseThreshold: 2, color: '#EF4444', icon: '\ud83d\udd25' },

  // Subcategory: Dedicación
  { base: 'horas_estudio', name: 'Dedicado', desc: '{n} horas de estudio', trackKey: 'study_hours', category: 'aprendizaje', subcategory: 'Dedicaci\u00f3n', baseThreshold: 1, color: '#F59E0B', icon: '\u23f0' },
  { base: 'racha_aprendizaje', name: 'Constante', desc: 'Racha de {n} d\u00edas estudiando', trackKey: 'learning_streak', category: 'aprendizaje', subcategory: 'Dedicaci\u00f3n', baseThreshold: 2, color: '#EF4444', icon: '\ud83d\udd25' },
  { base: 'estudio_nocturno', name: 'Noctámbulo', desc: 'Estudia {n} noches (después de 22h)', trackKey: 'night_study', category: 'aprendizaje', subcategory: 'Dedicaci\u00f3n', baseThreshold: 2, color: '#8B5CF6', icon: '\ud83c\udf19' },
  { base: 'estudio_madrugador', name: 'Madrugador', desc: 'Estudia {n} mañanas (antes de 7h)', trackKey: 'morning_study', category: 'aprendizaje', subcategory: 'Dedicaci\u00f3n', baseThreshold: 2, color: '#F59E0B', icon: '\ud83c\udf05' },
  { base: 'estudio_finde', name: 'Sin Descanso', desc: 'Estudia {n} fines de semana', trackKey: 'weekend_study', category: 'aprendizaje', subcategory: 'Dedicaci\u00f3n', baseThreshold: 2, color: '#FC651F', icon: '\ud83d\udcc5' },

  // Subcategory: Lectura
  { base: 'lecturas', name: 'Lector', desc: 'Lee {n} recursos', trackKey: 'resources_read', category: 'aprendizaje', subcategory: 'Lectura', baseThreshold: 2, color: '#EC4899', icon: '\ud83d\udcd6' },
  { base: 'pdfs_leidos', name: 'PDF Expert', desc: 'Lee {n} documentos PDF', trackKey: 'pdfs_read', category: 'aprendizaje', subcategory: 'Lectura', baseThreshold: 1, color: '#EF4444', icon: '\ud83d\udcc4' },
  { base: 'videos_vistos', name: 'Cinéfilo', desc: 'Ve {n} videos educativos', trackKey: 'videos_watched', category: 'aprendizaje', subcategory: 'Lectura', baseThreshold: 2, color: '#00D1FF', icon: '\ud83c\udfac' },

  // Subcategory: Secciones
  { base: 'secciones', name: 'Explorador', desc: 'Completa {n} secciones', trackKey: 'sections_completed', category: 'aprendizaje', subcategory: 'Secciones', baseThreshold: 3, color: '#FC651F', icon: '\ud83d\uddfa\ufe0f' },
  { base: 'paths_completados', name: 'Graduado', desc: 'Completa {n} learning paths', trackKey: 'paths_completed', category: 'aprendizaje', subcategory: 'Secciones', baseThreshold: 1, color: '#22c55e', icon: '\ud83c\udf93' },

  // ── IDEAS ────────────────────────────────────────────────────────────
  // Subcategory: Creación
  { base: 'ideas_enviadas', name: 'Ideador', desc: 'Envía {n} ideas', trackKey: 'ideas_submitted', category: 'ideas', subcategory: 'Creaci\u00f3n', baseThreshold: 1, color: '#EC4899', icon: '\u2728' },
  { base: 'ideas_fusionadas', name: 'Sintetizador', desc: 'Fusiona {n} ideas', trackKey: 'ideas_merged', category: 'ideas', subcategory: 'Creaci\u00f3n', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udd17' },
  { base: 'ideas_editadas', name: 'Refinador', desc: 'Edita {n} ideas propias', trackKey: 'ideas_edited', category: 'ideas', subcategory: 'Creaci\u00f3n', baseThreshold: 2, color: '#8B5CF6', icon: '\u270f\ufe0f' },
  { base: 'ideas_tags', name: 'Catalogador', desc: 'Usa {n} tags diferentes', trackKey: 'unique_tags_used', category: 'ideas', subcategory: 'Creaci\u00f3n', baseThreshold: 3, color: '#00D1FF', icon: '\ud83c\udff7\ufe0f' },

  // Subcategory: Votos
  { base: 'votos_recibidos', name: 'Popular', desc: 'Recibe {n} votos totales', trackKey: 'total_votes_received', category: 'ideas', subcategory: 'Votos', baseThreshold: 5, color: '#FC651F', icon: '\ud83d\udc4d' },
  { base: 'votos_emitidos', name: 'Juez', desc: 'Vota en {n} ideas', trackKey: 'votes_cast', category: 'ideas', subcategory: 'Votos', baseThreshold: 5, color: '#00D1FF', icon: '\u2696\ufe0f' },
  { base: 'votos_idea_unica', name: 'Viral', desc: 'Una idea con {n} votos', trackKey: 'idea_max_votes', category: 'ideas', subcategory: 'Votos', baseThreshold: 5, color: '#EF4444', icon: '\ud83d\udcc8' },

  // Subcategory: Aprobación
  { base: 'ideas_aprobadas', name: 'Visionario', desc: '{n} ideas aprobadas', trackKey: 'ideas_approved', category: 'ideas', subcategory: 'Aprobaci\u00f3n', baseThreshold: 1, color: '#22c55e', icon: '\ud83c\udfc6' },
  { base: 'ideas_implementadas', name: 'Ejecutor Creativo', desc: '{n} ideas implementadas', trackKey: 'ideas_implemented', category: 'ideas', subcategory: 'Aprobaci\u00f3n', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\ude80' },

  // Subcategory: Discusión
  { base: 'comentarios_ideas', name: 'Debatidor', desc: '{n} comentarios en ideas', trackKey: 'idea_comments', category: 'ideas', subcategory: 'Discusi\u00f3n', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83d\udcac' },
  { base: 'respuestas_ideas', name: 'Asesor', desc: 'Responde a {n} ideas de otros', trackKey: 'idea_replies', category: 'ideas', subcategory: 'Discusi\u00f3n', baseThreshold: 2, color: '#EC4899', icon: '\ud83d\udce9' },

  // ── PROYECTOS ────────────────────────────────────────────────────────
  // Subcategory: Creación
  { base: 'proyectos_creados', name: 'Fundador', desc: 'Crea {n} proyectos', trackKey: 'projects_created', category: 'proyectos', subcategory: 'Creaci\u00f3n', baseThreshold: 1, color: '#FC651F', icon: '\ud83d\ude80' },
  { base: 'proyectos_publicos', name: 'Open Source', desc: 'Crea {n} proyectos públicos', trackKey: 'public_projects', category: 'proyectos', subcategory: 'Creaci\u00f3n', baseThreshold: 1, color: '#22c55e', icon: '\ud83c\udf10' },

  // Subcategory: Colaboración
  { base: 'proyectos_contribuidos', name: 'Colaborador', desc: 'Contribuye a {n} proyectos', trackKey: 'projects_contributed', category: 'proyectos', subcategory: 'Colaboraci\u00f3n', baseThreshold: 1, color: '#22c55e', icon: '\ud83e\udd1d' },
  { base: 'coautor_proyecto', name: 'Co-Autor', desc: 'Sé co-autor en {n} proyectos', trackKey: 'coauthor_projects', category: 'proyectos', subcategory: 'Colaboraci\u00f3n', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\udc65' },
  { base: 'reviews_proyecto', name: 'Revisor Técnico', desc: 'Revisa {n} aportes de otros', trackKey: 'project_reviews', category: 'proyectos', subcategory: 'Colaboraci\u00f3n', baseThreshold: 2, color: '#00D1FF', icon: '\ud83d\udd0d' },

  // Subcategory: Tareas
  { base: 'tareas_completadas', name: 'Ejecutor', desc: 'Completa {n} tareas', trackKey: 'tasks_completed', category: 'proyectos', subcategory: 'Tareas', baseThreshold: 1, color: '#8B5CF6', icon: '\u2714\ufe0f' },
  { base: 'tareas_rapidas', name: 'Eficiente', desc: 'Completa {n} tareas en < 1 día', trackKey: 'quick_tasks', category: 'proyectos', subcategory: 'Tareas', baseThreshold: 2, color: '#F59E0B', icon: '\u26a1' },
  { base: 'tareas_criticas', name: 'Apagafuegos', desc: 'Completa {n} tareas críticas', trackKey: 'critical_tasks', category: 'proyectos', subcategory: 'Tareas', baseThreshold: 1, color: '#EF4444', icon: '\ud83d\udea8' },

  // Subcategory: Avances
  { base: 'avances_registrados', name: 'Documentador', desc: 'Registra {n} avances', trackKey: 'advances_logged', category: 'proyectos', subcategory: 'Avances', baseThreshold: 1, color: '#00D1FF', icon: '\ud83d\udcdd' },
  { base: 'avances_diarios', name: 'Daily Logger', desc: '{n} días con avances registrados', trackKey: 'daily_advances', category: 'proyectos', subcategory: 'Avances', baseThreshold: 3, color: '#22c55e', icon: '\ud83d\udcc6' },

  // Subcategory: Diagramas
  { base: 'diagramas_creados', name: 'Arquitecto', desc: 'Crea {n} diagramas', trackKey: 'diagrams_created', category: 'proyectos', subcategory: 'Diagramas', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udcd0' },
  { base: 'diagramas_compartidos', name: 'Visual Thinker', desc: 'Comparte {n} diagramas', trackKey: 'diagrams_shared', category: 'proyectos', subcategory: 'Diagramas', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\uddbc\ufe0f' },

  // Subcategory: Workflows
  { base: 'workflows_creados', name: 'Ingeniero', desc: 'Diseña {n} workflows', trackKey: 'workflows_created', category: 'proyectos', subcategory: 'Workflows', baseThreshold: 1, color: '#EF4444', icon: '\u2699\ufe0f' },

  // Subcategory: Archivos
  { base: 'archivos_subidos', name: 'Archivista', desc: 'Sube {n} archivos', trackKey: 'files_uploaded', category: 'proyectos', subcategory: 'Archivos', baseThreshold: 2, color: '#EC4899', icon: '\ud83d\udcc1' },
  { base: 'pdfs_subidos', name: 'PDF Master', desc: 'Sube {n} archivos PDF', trackKey: 'pdf_uploads', category: 'proyectos', subcategory: 'Archivos', baseThreshold: 1, color: '#EF4444', icon: '\ud83d\udcc4' },
  { base: 'imagenes_subidas', name: 'Fotógrafo', desc: 'Sube {n} imágenes', trackKey: 'image_uploads', category: 'proyectos', subcategory: 'Archivos', baseThreshold: 2, color: '#F59E0B', icon: '\ud83d\uddbc\ufe0f' },
  { base: 'codigo_subido', name: 'Dev Upload', desc: 'Sube {n} archivos de código', trackKey: 'code_uploads', category: 'proyectos', subcategory: 'Archivos', baseThreshold: 1, color: '#00D1FF', icon: '\ud83d\udcc2' },

  // Subcategory: Código
  { base: 'codigo_compartido', name: 'Programador', desc: 'Comparte {n} snippets', trackKey: 'snippets_shared', category: 'proyectos', subcategory: 'C\u00f3digo', baseThreshold: 2, color: '#00D1FF', icon: '\ud83d\udcbb' },
  { base: 'snippets_python', name: 'Pythonista', desc: 'Comparte {n} snippets Python', trackKey: 'python_snippets', category: 'proyectos', subcategory: 'C\u00f3digo', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udc0d' },
  { base: 'snippets_js', name: 'JSer', desc: 'Comparte {n} snippets JavaScript', trackKey: 'js_snippets', category: 'proyectos', subcategory: 'C\u00f3digo', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udfe8' },

  // Subcategory: Métricas
  { base: 'metricas_registradas', name: 'Analista', desc: 'Registra {n} métricas', trackKey: 'metrics_logged', category: 'proyectos', subcategory: 'M\u00e9tricas', baseThreshold: 3, color: '#22c55e', icon: '\ud83d\udcca' },

  // ── SOCIAL ───────────────────────────────────────────────────────────
  // Subcategory: Networking
  { base: 'perfiles_visitados', name: 'Networker', desc: 'Visita {n} perfiles', trackKey: 'profiles_viewed', category: 'social', subcategory: 'Networking', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udf10' },
  { base: 'invitaciones', name: 'Embajador', desc: 'Invita a {n} personas', trackKey: 'invitations_sent', category: 'social', subcategory: 'Networking', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udce8' },
  { base: 'conexiones_nuevas', name: 'Conector', desc: 'Conecta con {n} personas nuevas', trackKey: 'new_connections', category: 'social', subcategory: 'Networking', baseThreshold: 2, color: '#00D1FF', icon: '\ud83d\udd17' },

  // Subcategory: Comunicación
  { base: 'comentarios_escritos', name: 'Comunicador', desc: 'Escribe {n} comentarios', trackKey: 'comments_written', category: 'social', subcategory: 'Comunicaci\u00f3n', baseThreshold: 3, color: '#FC651F', icon: '\ud83d\udcac' },
  { base: 'reacciones_dadas', name: 'Entusiasta', desc: 'Da {n} reacciones', trackKey: 'reactions_given', category: 'social', subcategory: 'Comunicaci\u00f3n', baseThreshold: 5, color: '#EC4899', icon: '\u2764\ufe0f' },
  { base: 'hilos_creados', name: 'Facilitador', desc: 'Inicia {n} hilos de conversación', trackKey: 'threads_created', category: 'social', subcategory: 'Comunicaci\u00f3n', baseThreshold: 2, color: '#22c55e', icon: '\ud83e\uddf5' },

  // Subcategory: Eventos
  { base: 'eventos_asistidos', name: 'Participante', desc: 'Asiste a {n} eventos', trackKey: 'events_attended', category: 'social', subcategory: 'Eventos', baseThreshold: 1, color: '#00D1FF', icon: '\ud83c\udfaa' },
  { base: 'eventos_organizados', name: 'Organizador Social', desc: 'Organiza {n} eventos', trackKey: 'events_organized', category: 'social', subcategory: 'Eventos', baseThreshold: 1, color: '#F59E0B', icon: '\ud83c\udf89' },

  // Subcategory: Constancia
  { base: 'racha_login', name: 'Maratonista', desc: 'Racha de {n} días conectado', trackKey: 'login_streak', category: 'social', subcategory: 'Constancia', baseThreshold: 3, color: '#EF4444', icon: '\ud83d\udd25' },
  { base: 'dias_activo', name: 'Veterano', desc: '{n} días activo', trackKey: 'days_active', category: 'social', subcategory: 'Constancia', baseThreshold: 5, color: '#8B5CF6', icon: '\ud83d\udcc5' },
  { base: 'semanas_activo', name: 'Permanente', desc: '{n} semanas activo', trackKey: 'weeks_active', category: 'social', subcategory: 'Constancia', baseThreshold: 2, color: '#22c55e', icon: '\ud83d\uddd3\ufe0f' },

  // Subcategory: Influencia
  { base: 'menciones', name: 'Influyente', desc: 'Recibe {n} menciones', trackKey: 'mentions_received', category: 'social', subcategory: 'Influencia', baseThreshold: 3, color: '#22c55e', icon: '\ud83d\udce3' },
  { base: 'seguidores', name: 'Líder Social', desc: 'Gana {n} seguidores', trackKey: 'followers_gained', category: 'social', subcategory: 'Influencia', baseThreshold: 2, color: '#FC651F', icon: '\ud83c\udf1f' },
  { base: 'agradecimientos', name: 'Agradecido', desc: 'Recibe {n} agradecimientos', trackKey: 'thanks_received', category: 'social', subcategory: 'Influencia', baseThreshold: 2, color: '#EC4899', icon: '\ud83d\ude4f' },

  // ── ARCADE ───────────────────────────────────────────────────────────
  // Subcategory: General
  { base: 'partidas_jugadas', name: 'Adicto', desc: 'Juega {n} partidas', trackKey: 'games_played', category: 'arcade', subcategory: 'General', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83d\udd79\ufe0f' },
  { base: 'arcade_puntos', name: 'Gamer', desc: 'Alcanza {n} puntos arcade', trackKey: 'arcade_max_score', category: 'arcade', subcategory: 'Puntuaci\u00f3n', baseThreshold: 100, color: '#F59E0B', icon: '\ud83c\udfae' },
  { base: 'arcade_victorias', name: 'Victorioso', desc: 'Gana {n} partidas', trackKey: 'arcade_wins', category: 'arcade', subcategory: 'General', baseThreshold: 2, color: '#22c55e', icon: '\ud83c\udfc6' },
  { base: 'arcade_combo', name: 'Combo Máster', desc: 'Logra combos de {n} puntos', trackKey: 'arcade_combos', category: 'arcade', subcategory: 'General', baseThreshold: 3, color: '#FC651F', icon: '\ud83d\udca5' },

  // Subcategory: Zen
  { base: 'zen_minutos', name: 'Zen Master', desc: '{n} minutos en Modo Zen', trackKey: 'zen_minutes', category: 'arcade', subcategory: 'Zen', baseThreshold: 5, color: '#22c55e', icon: '\ud83e\uddd8' },
  { base: 'pomodoros', name: 'Productivo', desc: 'Completa {n} pomodoros', trackKey: 'pomodoros_completed', category: 'arcade', subcategory: 'Zen', baseThreshold: 1, color: '#EF4444', icon: '\ud83c\udf45' },
  { base: 'zen_sesiones', name: 'Zen Habitual', desc: '{n} sesiones de meditación', trackKey: 'zen_sessions', category: 'arcade', subcategory: 'Zen', baseThreshold: 2, color: '#8B5CF6', icon: '\u2728' },
  { base: 'zen_racha', name: 'Zen Racha', desc: 'Racha de {n} días meditando', trackKey: 'zen_streak', category: 'arcade', subcategory: 'Zen', baseThreshold: 2, color: '#00D1FF', icon: '\ud83c\udf1f' },

  // Subcategory: Snake
  { base: 'snake_score', name: 'Serpiente', desc: '{n} puntos en Snake', trackKey: 'snake_score', category: 'arcade', subcategory: 'Snake', baseThreshold: 50, color: '#22c55e', icon: '\ud83d\udc0d' },
  { base: 'snake_partidas', name: 'Snake Fan', desc: 'Juega {n} partidas de Snake', trackKey: 'snake_games', category: 'arcade', subcategory: 'Snake', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udfae' },
  { base: 'snake_perfect', name: 'Snake Perfecto', desc: '{n} rondas sin morir en Snake', trackKey: 'snake_perfect_rounds', category: 'arcade', subcategory: 'Snake', baseThreshold: 1, color: '#F59E0B', icon: '\ud83c\udf1f' },
  { base: 'snake_speed', name: 'Snake Veloz', desc: '{n} puntos en velocidad máxima', trackKey: 'snake_speed_score', category: 'arcade', subcategory: 'Snake', baseThreshold: 20, color: '#EF4444', icon: '\u26a1' },

  // Subcategory: Pong
  { base: 'pong_score', name: 'Pongista', desc: '{n} puntos en Pong', trackKey: 'pong_score', category: 'arcade', subcategory: 'Pong', baseThreshold: 30, color: '#00D1FF', icon: '\ud83c\udfd3' },
  { base: 'pong_partidas', name: 'Pong Fan', desc: 'Juega {n} partidas de Pong', trackKey: 'pong_games', category: 'arcade', subcategory: 'Pong', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udfae' },
  { base: 'pong_racha', name: 'Pong Racha', desc: '{n} victorias seguidas en Pong', trackKey: 'pong_win_streak', category: 'arcade', subcategory: 'Pong', baseThreshold: 2, color: '#F59E0B', icon: '\ud83d\udd25' },

  // Subcategory: Memory
  { base: 'memory_score', name: 'Memorión', desc: '{n} puntos en Memoria', trackKey: 'memory_score', category: 'arcade', subcategory: 'Memory', baseThreshold: 50, color: '#8B5CF6', icon: '\ud83c\udccf' },
  { base: 'memory_partidas', name: 'Memory Fan', desc: 'Juega {n} partidas de Memory', trackKey: 'memory_games', category: 'arcade', subcategory: 'Memory', baseThreshold: 3, color: '#EC4899', icon: '\ud83c\udfae' },
  { base: 'memory_rapido', name: 'Memory Rápido', desc: 'Completa Memory en {n} segundos o menos', trackKey: 'memory_speed', category: 'arcade', subcategory: 'Memory', baseThreshold: 30, color: '#22c55e', icon: '\u26a1' },
  { base: 'memory_perfecto', name: 'Memory Perfecto', desc: '{n} rondas sin error en Memory', trackKey: 'memory_perfect', category: 'arcade', subcategory: 'Memory', baseThreshold: 1, color: '#F59E0B', icon: '\ud83c\udf1f' },

  // Subcategory: Typing
  { base: 'typing_wpm', name: 'Veloz', desc: '{n} WPM en Typing', trackKey: 'typing_wpm', category: 'arcade', subcategory: 'Typing', baseThreshold: 20, color: '#FC651F', icon: '\u2328\ufe0f' },
  { base: 'typing_partidas', name: 'Typing Fan', desc: 'Juega {n} partidas de Typing', trackKey: 'typing_games', category: 'arcade', subcategory: 'Typing', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udfae' },
  { base: 'typing_accuracy', name: 'Typing Preciso', desc: '{n}% de precisión en Typing', trackKey: 'typing_accuracy', category: 'arcade', subcategory: 'Typing', baseThreshold: 90, color: '#22c55e', icon: '\ud83c\udfaf' },
  { base: 'typing_sin_error', name: 'Sin Errores', desc: '{n} textos sin error en Typing', trackKey: 'typing_perfect', category: 'arcade', subcategory: 'Typing', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udcaf' },

  // Subcategory: Space Invaders
  { base: 'space_score', name: 'Astronauta', desc: '{n} puntos Space Invaders', trackKey: 'space_score', category: 'arcade', subcategory: 'Space Invaders', baseThreshold: 100, color: '#EF4444', icon: '\ud83d\udc7e' },
  { base: 'space_partidas', name: 'Space Fan', desc: 'Juega {n} partidas de Space Invaders', trackKey: 'space_games', category: 'arcade', subcategory: 'Space Invaders', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udfae' },
  { base: 'space_oleadas', name: 'Superviviente', desc: 'Sobrevive {n} oleadas', trackKey: 'space_waves', category: 'arcade', subcategory: 'Space Invaders', baseThreshold: 3, color: '#00D1FF', icon: '\ud83c\udf0a' },
  { base: 'space_nodmg', name: 'Intocable', desc: '{n} oleadas sin recibir daño', trackKey: 'space_no_damage', category: 'arcade', subcategory: 'Space Invaders', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udee1\ufe0f' },

  // Subcategory: Racing
  { base: 'racing_score', name: 'Piloto', desc: '{n} puntos en Racing', trackKey: 'racing_score', category: 'arcade', subcategory: 'Racing', baseThreshold: 50, color: '#F59E0B', icon: '\ud83c\udfce\ufe0f' },
  { base: 'racing_partidas', name: 'Racing Fan', desc: 'Juega {n} carreras', trackKey: 'racing_games', category: 'arcade', subcategory: 'Racing', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udfae' },
  { base: 'racing_vuelta', name: 'Vuelta Rápida', desc: 'Vuelta en menos de {n} segundos', trackKey: 'racing_best_lap', category: 'arcade', subcategory: 'Racing', baseThreshold: 30, color: '#EF4444', icon: '\u23f1\ufe0f' },
  { base: 'racing_nitro', name: 'Nitro', desc: 'Usa nitro {n} veces', trackKey: 'racing_nitro', category: 'arcade', subcategory: 'Racing', baseThreshold: 5, color: '#FC651F', icon: '\ud83d\udca8' },

  // Subcategory: Platformer
  { base: 'platformer_score', name: 'Saltarín', desc: '{n} puntos Platformer', trackKey: 'platformer_score', category: 'arcade', subcategory: 'Platformer', baseThreshold: 50, color: '#EC4899', icon: '\ud83e\udd98' },
  { base: 'platformer_partidas', name: 'Platform Fan', desc: 'Juega {n} partidas de Platformer', trackKey: 'platformer_games', category: 'arcade', subcategory: 'Platformer', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udfae' },
  { base: 'platformer_niveles', name: 'Escalador', desc: 'Completa {n} niveles', trackKey: 'platformer_levels', category: 'arcade', subcategory: 'Platformer', baseThreshold: 2, color: '#22c55e', icon: '\ud83e\uddd7' },
  { base: 'platformer_monedas', name: 'Recolector', desc: 'Recoge {n} monedas', trackKey: 'platformer_coins', category: 'arcade', subcategory: 'Platformer', baseThreshold: 10, color: '#F59E0B', icon: '\ud83e\ude99' },

  // Subcategory: Breakout
  { base: 'breakout_score', name: 'Destructor', desc: '{n} puntos Breakout', trackKey: 'breakout_score', category: 'arcade', subcategory: 'Breakout', baseThreshold: 50, color: '#00D1FF', icon: '\ud83e\uddf1' },
  { base: 'breakout_partidas', name: 'Breakout Fan', desc: 'Juega {n} partidas de Breakout', trackKey: 'breakout_games', category: 'arcade', subcategory: 'Breakout', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udfae' },
  { base: 'breakout_bloques', name: 'Demoledor', desc: 'Destruye {n} bloques', trackKey: 'breakout_blocks', category: 'arcade', subcategory: 'Breakout', baseThreshold: 20, color: '#EF4444', icon: '\ud83d\udca3' },
  { base: 'breakout_nivel', name: 'Breakout Master', desc: 'Completa {n} niveles Breakout', trackKey: 'breakout_levels', category: 'arcade', subcategory: 'Breakout', baseThreshold: 2, color: '#F59E0B', icon: '\ud83c\udf1f' },

  // ── INVESTIGACIÓN ────────────────────────────────────────────────────
  // Subcategory: Lectura
  { base: 'papers_leidos', name: 'Académico', desc: 'Lee {n} papers', trackKey: 'papers_read', category: 'investigacion', subcategory: 'Lectura', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\udcc4' },
  { base: 'papers_anotados', name: 'Anotador', desc: 'Anota {n} papers', trackKey: 'papers_annotated', category: 'investigacion', subcategory: 'Lectura', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\udcdd' },
  { base: 'articulos_guardados', name: 'Curador', desc: 'Guarda {n} artículos', trackKey: 'articles_saved', category: 'investigacion', subcategory: 'Lectura', baseThreshold: 2, color: '#F59E0B', icon: '\ud83d\udd16' },

  // Subcategory: Datos
  { base: 'datasets_usados', name: 'Data Scientist', desc: 'Usa {n} datasets', trackKey: 'datasets_used', category: 'investigacion', subcategory: 'Datos', baseThreshold: 1, color: '#00D1FF', icon: '\ud83d\udcca' },
  { base: 'datasets_creados', name: 'Data Creator', desc: 'Crea {n} datasets', trackKey: 'datasets_created', category: 'investigacion', subcategory: 'Datos', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\uddc3\ufe0f' },
  { base: 'datasets_limpiados', name: 'Data Cleaner', desc: 'Limpia {n} datasets', trackKey: 'datasets_cleaned', category: 'investigacion', subcategory: 'Datos', baseThreshold: 1, color: '#FC651F', icon: '\ud83e\uddf9' },

  // Subcategory: Modelos
  { base: 'modelos_entrenados', name: 'Trainer', desc: 'Entrena {n} modelos', trackKey: 'models_trained', category: 'investigacion', subcategory: 'Modelos', baseThreshold: 1, color: '#FC651F', icon: '\ud83e\udd16' },
  { base: 'modelos_evaluados', name: 'Evaluador', desc: 'Evalúa {n} modelos', trackKey: 'models_evaluated', category: 'investigacion', subcategory: 'Modelos', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\udccb' },
  { base: 'modelos_desplegados', name: 'Deployer', desc: 'Despliega {n} modelos', trackKey: 'models_deployed', category: 'investigacion', subcategory: 'Modelos', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\ude80' },

  // Subcategory: Experimentos
  { base: 'experimentos', name: 'Científico', desc: 'Realiza {n} experimentos', trackKey: 'experiments_run', category: 'investigacion', subcategory: 'Experimentos', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udd2c' },
  { base: 'experimentos_exitosos', name: 'Descubridor', desc: '{n} experimentos exitosos', trackKey: 'experiments_success', category: 'investigacion', subcategory: 'Experimentos', baseThreshold: 1, color: '#F59E0B', icon: '\ud83c\udf1f' },
  { base: 'experimentos_fallidos', name: 'Resiliente', desc: 'Aprende de {n} fallos', trackKey: 'experiments_failed', category: 'investigacion', subcategory: 'Experimentos', baseThreshold: 2, color: '#EF4444', icon: '\ud83d\udcaa' },

  // Subcategory: Teoría
  { base: 'hipotesis', name: 'Teórico', desc: 'Plantea {n} hipótesis', trackKey: 'hypotheses_proposed', category: 'investigacion', subcategory: 'Teor\u00eda', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udca1' },
  { base: 'marcos_teoricos', name: 'Filósofo', desc: 'Crea {n} marcos teóricos', trackKey: 'frameworks_created', category: 'investigacion', subcategory: 'Teor\u00eda', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83e\udde0' },

  // Subcategory: Presentaciones
  { base: 'presentaciones', name: 'Ponente', desc: 'Presenta {n} veces', trackKey: 'presentations_given', category: 'investigacion', subcategory: 'Presentaciones', baseThreshold: 1, color: '#EF4444', icon: '\ud83c\udfa4' },
  { base: 'posters', name: 'Diseñador Poster', desc: 'Crea {n} pósters', trackKey: 'posters_created', category: 'investigacion', subcategory: 'Presentaciones', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\uddbc\ufe0f' },

  // Subcategory: Revisión
  { base: 'revisiones', name: 'Revisor', desc: 'Revisa {n} trabajos', trackKey: 'reviews_done', category: 'investigacion', subcategory: 'Revisi\u00f3n', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\udd0d' },
  { base: 'peer_reviews', name: 'Peer Reviewer', desc: 'Hace {n} revisiones entre pares', trackKey: 'peer_reviews', category: 'investigacion', subcategory: 'Revisi\u00f3n', baseThreshold: 1, color: '#00D1FF', icon: '\ud83d\udc65' },

  // Subcategory: Citas
  { base: 'citas_biblio', name: 'Bibliófilo', desc: 'Añade {n} citas', trackKey: 'citations_added', category: 'investigacion', subcategory: 'Citas', baseThreshold: 2, color: '#8B5CF6', icon: '\ud83d\udcd1' },
  { base: 'referencias_cruzadas', name: 'Cross-Ref', desc: 'Crea {n} referencias cruzadas', trackKey: 'cross_references', category: 'investigacion', subcategory: 'Citas', baseThreshold: 2, color: '#FC651F', icon: '\ud83d\udd00' },

  // ── PERSONALIZACIÓN ──────────────────────────────────────────────────
  // Subcategory: Temas
  { base: 'temas_cambiados', name: 'Estilista', desc: 'Cambia el tema {n} veces', trackKey: 'themes_changed', category: 'personalizacion', subcategory: 'Temas', baseThreshold: 3, color: '#EC4899', icon: '\ud83c\udfa8' },
  { base: 'tema_oscuro', name: 'Dark Mode', desc: 'Usa tema oscuro {n} días', trackKey: 'dark_mode_days', category: 'personalizacion', subcategory: 'Temas', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83c\udf11' },
  { base: 'tema_claro', name: 'Light Mode', desc: 'Usa tema claro {n} días', trackKey: 'light_mode_days', category: 'personalizacion', subcategory: 'Temas', baseThreshold: 3, color: '#F59E0B', icon: '\u2600\ufe0f' },

  // Subcategory: Perfil
  { base: 'banner_cambiado', name: 'Diseñador', desc: 'Cambia tu banner {n} veces', trackKey: 'banners_changed', category: 'personalizacion', subcategory: 'Perfil', baseThreshold: 1, color: '#FC651F', icon: '\ud83d\uddbc\ufe0f' },
  { base: 'avatar_subido', name: 'Fotogénico', desc: 'Sube {n} fotos de perfil', trackKey: 'avatars_uploaded', category: 'personalizacion', subcategory: 'Perfil', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\udcf8' },
  { base: 'bio_escrita', name: 'Autobiógrafo', desc: 'Actualiza tu bio {n} veces', trackKey: 'bio_updates', category: 'personalizacion', subcategory: 'Perfil', baseThreshold: 1, color: '#00D1FF', icon: '\u270f\ufe0f' },
  { base: 'perfil_completo', name: 'Perfil Completo', desc: 'Completa {n} secciones del perfil', trackKey: 'profile_sections', category: 'personalizacion', subcategory: 'Perfil', baseThreshold: 2, color: '#22c55e', icon: '\u2705' },

  // Subcategory: Social
  { base: 'links_sociales', name: 'Conectado', desc: 'Agrega {n} links sociales', trackKey: 'social_links_added', category: 'personalizacion', subcategory: 'Social', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udd17' },
  { base: 'redes_vinculadas', name: 'Multi-Red', desc: 'Vincula {n} redes sociales', trackKey: 'social_networks_linked', category: 'personalizacion', subcategory: 'Social', baseThreshold: 1, color: '#FC651F', icon: '\ud83c\udf10' },

  // Subcategory: Espacio
  { base: 'workspace_items', name: 'Organizador', desc: 'Crea {n} items en espacio', trackKey: 'workspace_items', category: 'personalizacion', subcategory: 'Espacio', baseThreshold: 3, color: '#F59E0B', icon: '\ud83d\udccb' },
  { base: 'workspace_layouts', name: 'Layout Master', desc: 'Crea {n} layouts personalizados', trackKey: 'workspace_layouts', category: 'personalizacion', subcategory: 'Espacio', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\uddb2\ufe0f' },

  // Subcategory: Notas
  { base: 'notas_creadas', name: 'Apuntador', desc: 'Crea {n} notas', trackKey: 'notes_created', category: 'personalizacion', subcategory: 'Notas', baseThreshold: 2, color: '#EF4444', icon: '\ud83d\udcdd' },
  { base: 'notas_largas', name: 'Escritor Profundo', desc: 'Crea {n} notas de más de 500 palabras', trackKey: 'long_notes', category: 'personalizacion', subcategory: 'Notas', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\udcd6' },

  // Subcategory: Mural
  { base: 'mural_elementos', name: 'Artista', desc: 'Añade {n} elementos al mural', trackKey: 'mural_items', category: 'personalizacion', subcategory: 'Mural', baseThreshold: 3, color: '#EC4899', icon: '\ud83c\udfad' },
  { base: 'mural_imagenes', name: 'Galerista', desc: 'Añade {n} imágenes al mural', trackKey: 'mural_images', category: 'personalizacion', subcategory: 'Mural', baseThreshold: 2, color: '#00D1FF', icon: '\ud83d\uddbc\ufe0f' },

  // ── LIDERAZGO ────────────────────────────────────────────────────────
  // Subcategory: Equipo
  { base: 'miembros_invitados', name: 'Reclutador', desc: 'Invita {n} miembros a proyectos', trackKey: 'members_invited', category: 'liderazgo', subcategory: 'Equipo', baseThreshold: 1, color: '#FC651F', icon: '\ud83d\udc65' },
  { base: 'equipos_formados', name: 'Team Builder', desc: 'Forma {n} equipos', trackKey: 'teams_formed', category: 'liderazgo', subcategory: 'Equipo', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udc6b' },
  { base: 'roles_asignados', name: 'Director RRHH', desc: 'Asigna {n} roles', trackKey: 'roles_assigned', category: 'liderazgo', subcategory: 'Equipo', baseThreshold: 2, color: '#8B5CF6', icon: '\ud83c\udfad' },

  // Subcategory: Gestión
  { base: 'tareas_asignadas', name: 'Delegador', desc: 'Asigna {n} tareas', trackKey: 'tasks_assigned', category: 'liderazgo', subcategory: 'Gesti\u00f3n', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83d\udccb' },
  { base: 'sprints_completados', name: 'Scrum Master', desc: 'Completa {n} sprints', trackKey: 'sprints_completed', category: 'liderazgo', subcategory: 'Gesti\u00f3n', baseThreshold: 1, color: '#00D1FF', icon: '\ud83c\udfc3' },
  { base: 'deadlines_cumplidos', name: 'Puntual', desc: 'Cumple {n} deadlines', trackKey: 'deadlines_met', category: 'liderazgo', subcategory: 'Gesti\u00f3n', baseThreshold: 2, color: '#F59E0B', icon: '\u23f0' },

  // Subcategory: Proyectos
  { base: 'proyectos_completados', name: 'Finalizador', desc: 'Completa {n} proyectos', trackKey: 'projects_completed', category: 'liderazgo', subcategory: 'Proyectos', baseThreshold: 1, color: '#22c55e', icon: '\ud83c\udfc1' },
  { base: 'proyectos_exitosos', name: 'Vencedor', desc: '{n} proyectos exitosos', trackKey: 'successful_projects', category: 'liderazgo', subcategory: 'Proyectos', baseThreshold: 1, color: '#FC651F', icon: '\ud83c\udfc6' },
  { base: 'proyectos_large', name: 'Director', desc: 'Lidera {n} proyectos grandes', trackKey: 'large_projects', category: 'liderazgo', subcategory: 'Proyectos', baseThreshold: 1, color: '#EF4444', icon: '\ud83c\udf1f' },

  // Subcategory: Mentoría
  { base: 'mentoria', name: 'Mentor', desc: 'Mentora a {n} personas', trackKey: 'mentees', category: 'liderazgo', subcategory: 'Mentor\u00eda', baseThreshold: 1, color: '#00D1FF', icon: '\ud83c\udf93' },
  { base: 'sesiones_mentoria', name: 'Sabio', desc: '{n} sesiones de mentoría', trackKey: 'mentoring_sessions', category: 'liderazgo', subcategory: 'Mentor\u00eda', baseThreshold: 2, color: '#8B5CF6', icon: '\ud83e\uddd9' },
  { base: 'materiales_mentoria', name: 'Formador', desc: 'Crea {n} materiales de mentoría', trackKey: 'mentoring_materials', category: 'liderazgo', subcategory: 'Mentor\u00eda', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\udcd3' },

  // Subcategory: Feedback
  { base: 'feedback_dado', name: 'Guía', desc: 'Da feedback {n} veces', trackKey: 'feedback_given', category: 'liderazgo', subcategory: 'Feedback', baseThreshold: 3, color: '#F59E0B', icon: '\ud83d\udca1' },
  { base: 'feedback_positivo', name: 'Motivador', desc: 'Da {n} feedbacks positivos', trackKey: 'positive_feedback', category: 'liderazgo', subcategory: 'Feedback', baseThreshold: 2, color: '#22c55e', icon: '\ud83d\udc4f' },
  { base: 'feedback_recibido', name: 'Receptivo', desc: 'Recibe {n} feedbacks', trackKey: 'feedback_received', category: 'liderazgo', subcategory: 'Feedback', baseThreshold: 2, color: '#00D1FF', icon: '\ud83d\udce5' },

  // Subcategory: Reuniones
  { base: 'reuniones', name: 'Coordinador', desc: 'Coordina {n} reuniones', trackKey: 'meetings_coordinated', category: 'liderazgo', subcategory: 'Reuniones', baseThreshold: 1, color: '#EF4444', icon: '\ud83d\uddd3\ufe0f' },
  { base: 'actas_reuniones', name: 'Secretario', desc: 'Crea {n} actas de reunión', trackKey: 'meeting_notes', category: 'liderazgo', subcategory: 'Reuniones', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\udcdd' },

  // ── EXTRA: more per-area and cross-cutting achievements ──────────────

  // Aprendizaje extras
  { base: 'flashcards_creadas', name: 'Tarjetero', desc: 'Crea {n} flashcards', trackKey: 'flashcards_created', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 5, color: '#00D1FF', icon: '\ud83c\udccf' },
  { base: 'flashcards_revisadas', name: 'Repasador', desc: 'Revisa {n} flashcards', trackKey: 'flashcards_reviewed', category: 'aprendizaje', subcategory: 'Temas', baseThreshold: 10, color: '#8B5CF6', icon: '\ud83d\udd01' },
  { base: 'notas_estudio', name: 'Escribano', desc: 'Escribe {n} notas de estudio', trackKey: 'study_notes', category: 'aprendizaje', subcategory: 'Lectura', baseThreshold: 2, color: '#22c55e', icon: '\ud83d\udcdd' },
  { base: 'resumen_creado', name: 'Sintetizador Acadé.', desc: 'Crea {n} resúmenes', trackKey: 'summaries_created', category: 'aprendizaje', subcategory: 'Lectura', baseThreshold: 1, color: '#FC651F', icon: '\ud83d\udcc3' },
  { base: 'tutorial_completado', name: 'Tutorial Master', desc: 'Completa {n} tutoriales', trackKey: 'tutorials_completed', category: 'aprendizaje', subcategory: 'Secciones', baseThreshold: 1, color: '#F59E0B', icon: '\ud83c\udfa5' },

  // Ideas extras
  { base: 'ideas_multimedia', name: 'Creativo Visual', desc: 'Ideas con {n} adjuntos', trackKey: 'ideas_with_attachments', category: 'ideas', subcategory: 'Creaci\u00f3n', baseThreshold: 2, color: '#00D1FF', icon: '\ud83d\udcce' },
  { base: 'ideas_trending', name: 'Trending', desc: '{n} ideas en trending', trackKey: 'ideas_trending', category: 'ideas', subcategory: 'Votos', baseThreshold: 1, color: '#EF4444', icon: '\ud83d\udcc8' },
  { base: 'ideas_collab', name: 'Co-Creador', desc: 'Co-crea {n} ideas', trackKey: 'ideas_coauthored', category: 'ideas', subcategory: 'Discusi\u00f3n', baseThreshold: 1, color: '#22c55e', icon: '\ud83e\udd1d' },

  // Proyectos extras
  { base: 'commits_proyecto', name: 'Committer', desc: 'Registra {n} commits', trackKey: 'project_commits', category: 'proyectos', subcategory: 'C\u00f3digo', baseThreshold: 5, color: '#22c55e', icon: '\ud83d\udcbe' },
  { base: 'bugs_reportados', name: 'Bug Hunter', desc: 'Reporta {n} bugs', trackKey: 'bugs_reported', category: 'proyectos', subcategory: 'Tareas', baseThreshold: 2, color: '#EF4444', icon: '\ud83d\udc1b' },
  { base: 'bugs_resueltos', name: 'Bug Fixer', desc: 'Resuelve {n} bugs', trackKey: 'bugs_fixed', category: 'proyectos', subcategory: 'Tareas', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udee0\ufe0f' },
  { base: 'milestone_alcanzado', name: 'Milestone', desc: 'Alcanza {n} milestones', trackKey: 'milestones_reached', category: 'proyectos', subcategory: 'Avances', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udea9' },

  // Social extras
  { base: 'posts_creados', name: 'Blogger', desc: 'Crea {n} posts', trackKey: 'posts_created', category: 'social', subcategory: 'Comunicaci\u00f3n', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\udcf0' },
  { base: 'encuestas_creadas', name: 'Encuestador', desc: 'Crea {n} encuestas', trackKey: 'polls_created', category: 'social', subcategory: 'Comunicaci\u00f3n', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udcca' },
  { base: 'encuestas_votadas', name: 'Opinador', desc: 'Vota en {n} encuestas', trackKey: 'polls_voted', category: 'social', subcategory: 'Comunicaci\u00f3n', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83d\uddf3\ufe0f' },
  { base: 'ayuda_dada', name: 'Helper', desc: 'Ayuda a {n} personas', trackKey: 'help_given', category: 'social', subcategory: 'Influencia', baseThreshold: 2, color: '#00D1FF', icon: '\ud83e\uddf0' },
  { base: 'novedades_leidas', name: 'Informado', desc: 'Lee {n} novedades', trackKey: 'news_read', category: 'social', subcategory: 'Constancia', baseThreshold: 5, color: '#FC651F', icon: '\ud83d\udcf0' },

  // Arcade extras
  { base: 'arcade_multijuego', name: 'Multi-Gamer', desc: 'Juega {n} juegos diferentes', trackKey: 'unique_games_played', category: 'arcade', subcategory: 'General', baseThreshold: 2, color: '#EC4899', icon: '\ud83c\udfb2' },
  { base: 'arcade_racha', name: 'Gaming Streak', desc: 'Racha de {n} días jugando', trackKey: 'gaming_streak', category: 'arcade', subcategory: 'General', baseThreshold: 2, color: '#EF4444', icon: '\ud83d\udd25' },
  { base: 'arcade_top_score', name: 'Leaderboard', desc: 'Top score en {n} juegos', trackKey: 'leaderboard_tops', category: 'arcade', subcategory: 'Puntuaci\u00f3n', baseThreshold: 1, color: '#F59E0B', icon: '\ud83e\udd47' },
  { base: 'arcade_horas', name: 'Gamer Hardcore', desc: '{n} horas jugando', trackKey: 'gaming_hours', category: 'arcade', subcategory: 'General', baseThreshold: 1, color: '#FC651F', icon: '\u23f3' },

  // Investigación extras
  { base: 'repos_clonados', name: 'Cloner', desc: 'Clona {n} repos', trackKey: 'repos_cloned', category: 'investigacion', subcategory: 'Datos', baseThreshold: 1, color: '#22c55e', icon: '\ud83d\udce6' },
  { base: 'notebooks_creados', name: 'Notebook Master', desc: 'Crea {n} notebooks', trackKey: 'notebooks_created', category: 'investigacion', subcategory: 'Experimentos', baseThreshold: 1, color: '#F59E0B', icon: '\ud83d\udcd3' },
  { base: 'graficas_generadas', name: 'Visualizador', desc: 'Genera {n} gráficas', trackKey: 'charts_generated', category: 'investigacion', subcategory: 'Datos', baseThreshold: 2, color: '#00D1FF', icon: '\ud83d\udcc8' },
  { base: 'formulas_escritas', name: 'Matemático', desc: 'Escribe {n} fórmulas LaTeX', trackKey: 'latex_formulas', category: 'investigacion', subcategory: 'Teor\u00eda', baseThreshold: 3, color: '#8B5CF6', icon: '\ud83e\uddee' },

  // Personalización extras
  { base: 'widgets_creados', name: 'Widget Master', desc: 'Crea {n} widgets', trackKey: 'widgets_created', category: 'personalizacion', subcategory: 'Espacio', baseThreshold: 2, color: '#FC651F', icon: '\ud83e\uddf0' },
  { base: 'atajos_creados', name: 'Shortcut Pro', desc: 'Crea {n} atajos', trackKey: 'shortcuts_created', category: 'personalizacion', subcategory: 'Espacio', baseThreshold: 2, color: '#22c55e', icon: '\u26a1' },
  { base: 'favoritos_guardados', name: 'Coleccionista', desc: 'Guarda {n} favoritos', trackKey: 'favorites_saved', category: 'personalizacion', subcategory: 'Notas', baseThreshold: 3, color: '#EF4444', icon: '\u2b50' },
  { base: 'plantillas_creadas', name: 'Plantillero', desc: 'Crea {n} plantillas', trackKey: 'templates_created', category: 'personalizacion', subcategory: 'Espacio', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\udcc4' },

  // Liderazgo extras
  { base: 'conflictos_resueltos', name: 'Mediador', desc: 'Resuelve {n} conflictos', trackKey: 'conflicts_resolved', category: 'liderazgo', subcategory: 'Equipo', baseThreshold: 1, color: '#F59E0B', icon: '\u2696\ufe0f' },
  { base: 'objetivos_cumplidos', name: 'Goal Setter', desc: 'Cumple {n} objetivos', trackKey: 'goals_met', category: 'liderazgo', subcategory: 'Gesti\u00f3n', baseThreshold: 2, color: '#22c55e', icon: '\ud83c\udfaf' },
  { base: 'kpis_registrados', name: 'KPI Tracker', desc: 'Registra {n} KPIs', trackKey: 'kpis_tracked', category: 'liderazgo', subcategory: 'Gesti\u00f3n', baseThreshold: 3, color: '#00D1FF', icon: '\ud83d\udcca' },
  { base: 'retrospectivas', name: 'Retrospector', desc: 'Lidera {n} retrospectivas', trackKey: 'retrospectives_led', category: 'liderazgo', subcategory: 'Reuniones', baseThreshold: 1, color: '#EC4899', icon: '\ud83d\udd04' },
  { base: 'demos_dadas', name: 'Demo Day', desc: 'Da {n} demos', trackKey: 'demos_given', category: 'liderazgo', subcategory: 'Presentaciones', baseThreshold: 1, color: '#FC651F', icon: '\ud83c\udfac' },
  { base: 'onboarding', name: 'Onboarder', desc: 'Onboardea a {n} miembros', trackKey: 'members_onboarded', category: 'liderazgo', subcategory: 'Mentor\u00eda', baseThreshold: 1, color: '#8B5CF6', icon: '\ud83d\ude80' },
  { base: 'reconocimientos', name: 'Reconocedor', desc: 'Da {n} reconocimientos', trackKey: 'recognitions_given', category: 'liderazgo', subcategory: 'Feedback', baseThreshold: 2, color: '#F59E0B', icon: '\ud83c\udf1f' },
]

/* ══════════════════════════════════════════════════════════════════════
   Achievement Generator
   ══════════════════════════════════════════════════════════════════════ */
function generateAchievements(bases, tiers) {
  const achievements = []
  bases.forEach(base => {
    tiers.forEach(tier => {
      const threshold = Math.ceil(base.baseThreshold * tier.multiplier)
      achievements.push({
        id: `${base.base}_${tier.id}`,
        name: `${base.name} ${tier.badge}`,
        description: base.desc.replace('{n}', threshold.toLocaleString()),
        icon: base.icon,
        category: base.category,
        subcategory: base.subcategory,
        tier: tier.id,
        tierLabel: tier.label,
        threshold,
        trackKey: base.trackKey,
        color: base.color,
      })
    })
  })
  return achievements
}

const ACHIEVEMENT_DEFINITIONS = generateAchievements(BASE_ACHIEVEMENTS, TIERS)

/* ══════════════════════════════════════════════════════════════════════
   Categories (with new additions)
   ══════════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'aprendizaje', label: 'Aprendizaje' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'social', label: 'Social' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'investigacion', label: 'Investigaci\u00f3n' },
  { id: 'personalizacion', label: 'Personalizaci\u00f3n' },
  { id: 'liderazgo', label: 'Liderazgo' },
]

/* Derive subcategories per category for UI grouping */
const SUBCATEGORIES = {}
ACHIEVEMENT_DEFINITIONS.forEach(a => {
  if (!SUBCATEGORIES[a.category]) SUBCATEGORIES[a.category] = new Set()
  SUBCATEGORIES[a.category].add(a.subcategory)
})
// Convert sets to arrays
Object.keys(SUBCATEGORIES).forEach(k => {
  SUBCATEGORIES[k] = Array.from(SUBCATEGORIES[k])
})

/* ══════════════════════════════════════════════════════════════════════
   Legacy meta map (backward compat with existing logros table)
   ══════════════════════════════════════════════════════════════════════ */
const LOGRO_META = {
  fundador:             { icon: '\ud83d\udc51', label: 'Fundador',            color: '#F59E0B' },
  investigador_elite:   { icon: '\ud83d\udd2c', label: 'Investigador Elite',  color: '#8B5CF6' },
  primer_avance:        { icon: '\ud83d\ude80', label: 'Primer Avance',       color: '#FC651F' },
  documentador_maestro: { icon: '\ud83d\udcda', label: 'Documentador Maestro',color: '#00D1FF' },
  conector:             { icon: '\ud83d\udd17', label: 'Conector',             color: '#22c55e' },
  ideador:              { icon: '\ud83d\udca1', label: 'Ideador',              color: '#F59E0B' },
  primera_idea:         { icon: '\u2728', label: 'Primera Idea',         color: '#EC4899' },
  idea_mvp:             { icon: '\ud83c\udfc6', label: 'Idea MVP',             color: '#FC651F' },
}

// Merge all generated definitions into meta map
ACHIEVEMENT_DEFINITIONS.forEach(a => {
  LOGRO_META[a.id] = { icon: a.icon, label: a.name, color: a.color }
})

export { LOGRO_META, ACHIEVEMENT_DEFINITIONS, CATEGORIES, SUBCATEGORIES, TIERS, BASE_ACHIEVEMENTS }

/* ══════════════════════════════════════════════════════════════════════
   localStorage helpers
   ══════════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'divergencia_achievements'

function getLocalProgress(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLocalProgress(userId, progress) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(progress))
  } catch { /* quota exceeded */ }
}

function getLocalUnlocked(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_unlocked_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLocalUnlocked(userId, unlocked) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_unlocked_${userId}`, JSON.stringify(unlocked))
  } catch { /* silently fail */ }
}

/* ══════════════════════════════════════════════════════════════════════
   Main Hook
   ══════════════════════════════════════════════════════════════════════ */
export function useAchievements(userId) {
  const { user } = useAuth()
  const targetId = userId || user?.id

  // Legacy logros from supabase
  const [logros, setLogros] = useState([])
  const [loading, setLoading] = useState(true)

  // Progress-based achievements
  const [progress, setProgress] = useState({})
  const [unlocked, setUnlocked] = useState({})
  const [newlyUnlocked, setNewlyUnlocked] = useState(null)

  // Load legacy logros from supabase
  const fetchLogros = useCallback(async () => {
    if (!targetId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('logros')
      .select('*')
      .eq('usuario_id', targetId)
      .order('fecha_obtenido', { ascending: false })
    setLogros(data || [])
    setLoading(false)
  }, [targetId])

  // Load local progress
  useEffect(() => {
    if (!targetId) return
    setProgress(getLocalProgress(targetId))
    setUnlocked(getLocalUnlocked(targetId))
  }, [targetId])

  useEffect(() => { fetchLogros() }, [fetchLogros])

  // Track login streak on mount
  useEffect(() => {
    if (!targetId) return
    const streakKey = `${STORAGE_KEY}_streak_${targetId}`
    try {
      const raw = localStorage.getItem(streakKey)
      const data = raw ? JSON.parse(raw) : { lastLogin: null, streak: 0 }
      const today = new Date().toISOString().slice(0, 10)
      if (data.lastLogin === today) return

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const newStreak = data.lastLogin === yesterday ? data.streak + 1 : 1
      localStorage.setItem(streakKey, JSON.stringify({ lastLogin: today, streak: newStreak }))

      incrementProgress('login_streak', newStreak, true)
      incrementProgress('days_active', 1)
    } catch { /* ignore */ }
  }, [targetId])

  // Increment progress for a given trackKey
  const incrementProgress = useCallback((trackKey, amount = 1, absolute = false) => {
    if (!targetId) return

    setProgress(prev => {
      const current = prev[trackKey] || 0
      const next = absolute ? Math.max(current, amount) : current + amount
      const updated = { ...prev, [trackKey]: next }
      setLocalProgress(targetId, updated)

      // Check unlocks — only for achievements matching this trackKey
      ACHIEVEMENT_DEFINITIONS.forEach(def => {
        if (def.trackKey === trackKey && next >= def.threshold) {
          setUnlocked(prevU => {
            if (prevU[def.id]) return prevU
            const now = new Date().toISOString()
            const nextU = { ...prevU, [def.id]: now }
            setLocalUnlocked(targetId, nextU)
            setNewlyUnlocked(def)

            // Try to persist to supabase (best-effort)
            supabase.from('logros_usuario').upsert({
              usuario_id: targetId,
              logro_id: def.id,
              fecha_obtenido: now,
              progreso: next,
            }, { onConflict: 'usuario_id,logro_id' }).then(() => {})
              .catch(() => {})

            // Fire in-app notification so bell badge updates immediately
            supabase.from('notificaciones').insert({
              usuario_id: targetId,
              tipo: 'logro_desbloqueado',
              titulo: `¡Logro desbloqueado! ${def.badge || '🏆'}`,
              mensaje: `Obtuviste: ${def.label}${def.tier ? ` (${def.tier})` : ''}`,
              leida: false,
              fecha: now,
            }).then(() => {}).catch(() => {})

            return nextU
          })
        }
      })

      return updated
    })
  }, [targetId])

  // Dismiss the newly unlocked notification
  const dismissNewUnlock = useCallback(() => setNewlyUnlocked(null), [])

  // Build enriched achievements list
  const achievements = useMemo(() => {
    return ACHIEVEMENT_DEFINITIONS.map(def => {
      const currentProgress = progress[def.trackKey] || 0
      const isUnlocked = !!unlocked[def.id]
      const unlockedAt = unlocked[def.id] || null
      const percent = Math.min(100, Math.round((currentProgress / def.threshold) * 100))

      return {
        ...def,
        currentProgress,
        isUnlocked,
        unlockedAt,
        percent,
      }
    })
  }, [progress, unlocked])

  return {
    // Legacy
    logros,
    loading,
    refetch: fetchLogros,
    getMeta: (tipo) => LOGRO_META[tipo] || { icon: '\ud83c\udfc5', label: tipo, color: '#888' },

    // New system
    achievements,
    progress,
    unlocked,
    incrementProgress,
    newlyUnlocked,
    dismissNewUnlock,
    categories: CATEGORIES,
    subcategories: SUBCATEGORIES,
    tiers: TIERS,
  }
}
