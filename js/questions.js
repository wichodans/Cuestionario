/**
 * questions.js
 * ─────────────────────────────────────────────────────────────
 * ÚNICO archivo que define el contenido del cuestionario:
 * secciones y preguntas. El motor (app.js) NUNCA contiene
 * preguntas: lee siempre de aquí.
 *
 * Para crear un cuestionario nuevo, sustituye este archivo entero
 * manteniendo exactamente el mismo formato (ver README, apartado
 * "Personalización del cuestionario").
 *
 * Este archivo contiene solo preguntas DEMO para probar el motor.
 * ─────────────────────────────────────────────────────────────
 *
 * ─── FORMATO DE UNA SECCIÓN ───
 * {
 *   id: "html",              // identificador único, minúsculas, sin espacios
 *   title: "HTML",           // título mostrado en la pantalla de transición
 *   icon: "◆",               // carácter/emoji decorativo (opcional)
 *   description: "..."       // texto breve de la pantalla de transición
 * }
 *
 * ─── FORMATO DE UNA PREGUNTA ───
 * {
 *   id: "html_01",            // ÚNICO. Nunca uses el texto de la pregunta como id.
 *   section: "html",          // debe coincidir con el id de una sección
 *   type: "single",           // ver tipos soportados más abajo
 *   question: "¿...?",        // enunciado
 *   hint: "...",              // (opcional) aclaración bajo el enunciado
 *   required: true,           // si es obligatoria
 *   scored: true,             // si cuenta para la puntuación de la sección
 *
 *   // Solo para type: "single" | "multiple" | "card"
 *   options: [
 *     { value: "none", label: "Nunca lo he utilizado", score: 0, icon: "🔴" }
 *   ],
 *
 *   // Solo para type: "scale"
 *   scaleMin: 1,
 *   scaleMax: 5,
 *   scaleLabels: { min: "Nada", max: "Experto" },
 *
 *   // Solo para type: "short_text" | "long_text"
 *   placeholder: "Escribe aquí...",
 *   maxLength: 300,
 *
 *   // Solo para type: "number"
 *   min: 0,
 *   max: 20,
 *
 *   // Solo para type: "ranking"
 *   options: [{ value: "html", label: "HTML" }, { value: "css", label: "CSS" }]
 * }
 *
 * ─── TIPOS SOPORTADOS (type) ───
 *   "single"      → selección única (tarjetas de una sola opción)
 *   "multiple"    → selección múltiple (varias opciones)
 *   "scale"       → escala numérica (p. ej. 1 a 5)
 *   "short_text"  → texto corto (una línea)
 *   "long_text"   → texto largo (párrafo)
 *   "boolean"     → sí / no
 *   "card"        → selección mediante tarjetas grandes (2 columnas)
 *   "number"      → pregunta numérica con stepper +/-
 *   "ranking"     → ordenar opciones (arquitectura preparada; UI básica incluida)
 *
 * Las preguntas con scored:false (texto libre, opinión...) nunca
 * afectan a la puntuación, aunque tengan la propiedad "options".
 */

const SECTIONS = [
  {
    id: "html",
    title: "HTML",
    icon: "◇",
    description: "Estructura y semántica web.",
  },
  {
    id: "css",
    title: "CSS",
    icon: "◆",
    description: "Estilos, maquetación y diseño visual.",
  },
  {
    id: "javascript",
    title: "JavaScript",
    icon: "◇",
    description: "Lógica, interactividad y programación en el navegador.",
  },
  {
    id: "expectativas",
    title: "Expectativas",
    icon: "◆",
    description: "Cuéntanos qué esperas del curso.",
  },
];

const QUESTIONS = [
  // ── HTML ──
  {
    id: "html_01",
    section: "html",
    type: "single",
    question: "¿Qué experiencia tienes con HTML?",
    required: true,
    scored: true,
    options: [
      { value: "none", label: "Nunca lo he utilizado", score: 0 },
      { value: "seen", label: "Lo he visto alguna vez", score: 1 },
      { value: "basic", label: "Tengo conocimientos básicos", score: 2 },
      { value: "medium", label: "Puedo trabajar con HTML", score: 3 },
      { value: "advanced", label: "Tengo bastante experiencia", score: 4 },
    ],
  },
  {
    id: "html_02",
    section: "html",
    type: "multiple",
    question: "¿Cuáles de estas etiquetas reconoces?",
    hint: "Selecciona todas las que apliquen.",
    required: false,
    scored: true,
    options: [
      { value: "section", label: "<section>", score: 1 },
      { value: "article", label: "<article>", score: 1 },
      { value: "form", label: "<form>", score: 1 },
      { value: "canvas", label: "<canvas>", score: 1 },
    ],
  },

  // ── CSS ──
  {
    id: "css_01",
    section: "css",
    type: "scale",
    question: "Del 1 al 5, ¿qué nivel consideras que tienes en CSS?",
    required: true,
    scored: true,
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: { min: "Nada", max: "Experto" },
  },
  {
    id: "css_02",
    section: "css",
    type: "card",
    question: "¿Cómo definirías tu experiencia general con maquetación web?",
    required: true,
    scored: true,
    options: [
      { value: "principiante", label: "Principiante", icon: "🟢", score: 0 },
      { value: "basico", label: "Básico", icon: "🟡", score: 1 },
      { value: "intermedio", label: "Intermedio", icon: "🔵", score: 2 },
      { value: "avanzado", label: "Avanzado", icon: "🟣", score: 3 },
    ],
  },

  // ── JAVASCRIPT ──
  {
    id: "js_01",
    section: "javascript",
    type: "boolean",
    question: "¿Has programado alguna vez en JavaScript?",
    required: true,
    scored: false,
  },
  {
    id: "js_02",
    section: "javascript",
    type: "number",
    question: "¿Cuántos lenguajes de programación conoces, aproximadamente?",
    required: true,
    scored: false,
    min: 0,
    max: 15,
  },
  {
    id: "js_03",
    section: "javascript",
    type: "short_text",
    question: "¿Cuánto tiempo llevas programando?",
    hint: "Puedes responder de forma aproximada, p. ej. «6 meses».",
    required: false,
    scored: false,
    placeholder: "p. ej. 6 meses",
    maxLength: 60,
  },

  // ── EXPECTATIVAS ──
  {
    id: "exp_01",
    section: "expectativas",
    type: "long_text",
    question: "¿Qué esperas aprender durante este curso?",
    required: false,
    scored: false,
    placeholder: "Escribe con libertad...",
    maxLength: 500,
  },
];
