/**
 * config.js
 * ─────────────────────────────────────────────────────────────
 * Configuración general de la evaluación.
 * Este es el ÚNICO lugar (junto a questions.js) donde debes tocar
 * algo para adaptar la app a una asignatura distinta.
 *
 * NO modifiques app.js para cambiar textos, IDs o la URL del backend.
 * ─────────────────────────────────────────────────────────────
 */

const APP_CONFIG = {
  // Identificador único de esta evaluación. Se guarda en cada respuesta
  // y sirve para diferenciar evaluaciones distintas en la misma hoja.
  evaluationId: "demo-2026",

  // Textos de la pantalla de portada
  title: "System Check",
  tagline: "¿Qué nivel tienes realmente?",
  subtitleIntro: "Vamos a descubrirlo.",
  subject: "Demo · Fundamentos Web",
  course: "1º DAM",
  teacher: "",
  description:
    "Esta evaluación inicial nos ayuda a conocer tu punto de partida antes de comenzar el curso. No es un examen: no hay respuestas correctas o incorrectas, solo queremos saber desde dónde empezamos.",

  // URL del Google Apps Script publicado como Web App (ver README, paso 6-8).
  // Ejemplo: "https://script.google.com/macros/s/AKfycb.../exec"
  googleAppsScriptUrl: "PEGA_AQUI_LA_URL_DE_TU_WEB_APP",

  // Comportamiento
  enableLocalStorage: true,
  showResultsToStudent: false, // si true, se podría mostrar una puntuación al final (no implementado por defecto)

  // Clave usada en localStorage para guardar el progreso
  storageKey: "evaluation_progress",

  // Mensaje final mostrado en la pantalla de éxito
  successMessage:
    "Gracias por completar la evaluación inicial. Tu perfil ha sido registrado correctamente. ¡Nos vemos en clase!",
};
