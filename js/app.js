/**
 * app.js
 * ─────────────────────────────────────────────────────────────
 * Motor de la aplicación. NO contiene preguntas ni texto de
 * cuestionario: todo el contenido viene de config.js y questions.js.
 *
 * Flujo de pantallas:
 *   intro → student → [section → question* ]* → summary → (sending) → success | fail
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  /* ============================================================
     ESTADO
     ============================================================ */

  // Construye la lista plana de "pasos" navegables: primero un
  // paso "section" por cada sección con preguntas, seguido de un
  // paso "question" por cada pregunta de esa sección.
  function buildSteps() {
    const steps = [];
    SECTIONS.forEach((section) => {
      const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);
      if (sectionQuestions.length === 0) return;
      steps.push({ kind: "section", section });
      sectionQuestions.forEach((q) => steps.push({ kind: "question", section, question: q }));
    });
    return steps;
  }

  const STEPS = buildSteps();

  const state = {
    screen: "intro", // intro | student | flow | summary | success | fail
    stepIndex: 0, // índice dentro de STEPS cuando screen === 'flow'
    student: { studentName: "", studentSurname: "", studentGroup: "", studentCenter: "" },
    answers: {}, // { questionId: value }
    submitting: false,
    lastSectionShown: null, // evita repetir la pantalla de sección al volver atrás
  };

  /* ============================================================
     UTILIDADES DE ALMACENAMIENTO LOCAL
     ============================================================ */

  function saveProgress() {
    if (!APP_CONFIG.enableLocalStorage) return;
    try {
      const payload = {
        evaluationId: APP_CONFIG.evaluationId,
        screen: state.screen,
        stepIndex: state.stepIndex,
        student: state.student,
        answers: state.answers,
        savedAt: Date.now(),
      };
      localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(payload));
    } catch (e) {
      // localStorage puede fallar (modo privado, cuota, etc.). No es crítico.
      console.warn("No se pudo guardar el progreso local:", e);
    }
  }

  function loadProgress() {
    if (!APP_CONFIG.enableLocalStorage) return null;
    try {
      const raw = localStorage.getItem(APP_CONFIG.storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.evaluationId !== APP_CONFIG.evaluationId) return null; // evaluación distinta
      return data;
    } catch (e) {
      return null;
    }
  }

  function clearProgress() {
    try {
      localStorage.removeItem(APP_CONFIG.storageKey);
    } catch (e) {
      /* noop */
    }
  }

  /* ============================================================
     VALIDACIÓN
     ============================================================ */

  function sanitizeText(value, maxLength) {
    if (typeof value !== "string") return "";
    let v = value.trim();
    if (maxLength && v.length > maxLength) v = v.slice(0, maxLength);
    return v;
  }

  function validateAnswer(question, value) {
    // Devuelve "" si es válido, o un mensaje de error si no lo es.
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (question.required && isEmpty) {
      return "Esta pregunta es obligatoria.";
    }
    if (isEmpty) return ""; // opcional y vacía: válida

    switch (question.type) {
      case "single":
      case "card": {
        const valid = question.options.some((o) => o.value === value);
        if (!valid) return "Selecciona una opción válida.";
        break;
      }
      case "multiple": {
        if (!Array.isArray(value)) return "Selecciona una opción válida.";
        const allowed = new Set(question.options.map((o) => o.value));
        if (!value.every((v) => allowed.has(v))) return "Selecciona una opción válida.";
        break;
      }
      case "scale": {
        const n = Number(value);
        if (Number.isNaN(n) || n < question.scaleMin || n > question.scaleMax) {
          return "Selecciona un valor de la escala.";
        }
        break;
      }
      case "number": {
        const n = Number(value);
        if (Number.isNaN(n)) return "Introduce un número válido.";
        if (question.min !== undefined && n < question.min) return `El valor mínimo es ${question.min}.`;
        if (question.max !== undefined && n > question.max) return `El valor máximo es ${question.max}.`;
        break;
      }
      case "short_text":
      case "long_text": {
        if (typeof value !== "string") return "Respuesta no válida.";
        const max = question.maxLength || 1000;
        if (value.length > max) return `Máximo ${max} caracteres.`;
        break;
      }
      case "boolean": {
        if (value !== "yes" && value !== "no") return "Selecciona una opción válida.";
        break;
      }
      case "ranking": {
        if (!Array.isArray(value)) return "Ordena las opciones.";
        break;
      }
      default:
        break;
    }
    return "";
  }

  function validateStudentField(name, value) {
    const v = sanitizeText(value, 120);
    if (!v) return "Este campo es obligatorio.";
    if (v.length < 2) return "Escribe al menos 2 caracteres.";
    return "";
  }

  /* ============================================================
     PUNTUACIÓN
     ============================================================ */

  function calculateResults() {
    const bySection = {};
    SECTIONS.forEach((s) => (bySection[s.id] = { score: 0, max: 0 }));

    QUESTIONS.forEach((q) => {
      if (!q.scored) return;
      const value = state.answers[q.id];
      if (value === undefined || value === null || value === "") return;

      if (q.type === "single" || q.type === "card") {
        const opt = (q.options || []).find((o) => o.value === value);
        if (opt && typeof opt.score === "number") {
          bySection[q.section].score += opt.score;
        }
        const max = Math.max(0, ...(q.options || []).map((o) => o.score || 0));
        bySection[q.section].max += max;
      } else if (q.type === "multiple") {
        const values = Array.isArray(value) ? value : [];
        values.forEach((v) => {
          const opt = (q.options || []).find((o) => o.value === v);
          if (opt && typeof opt.score === "number") bySection[q.section].score += opt.score;
        });
        const max = (q.options || []).reduce((acc, o) => acc + (o.score || 0), 0);
        bySection[q.section].max += max;
      } else if (q.type === "scale") {
        bySection[q.section].score += Number(value) || 0;
        bySection[q.section].max += q.scaleMax || 0;
      }
    });

    const totals = Object.values(bySection).reduce(
      (acc, s) => ({ score: acc.score + s.score, max: acc.max + s.max }),
      { score: 0, max: 0 }
    );

    return { bySection, total: totals };
  }

  /* ============================================================
     REFERENCIAS AL DOM
     ============================================================ */

  const el = {
    topbar: document.getElementById("topbar"),
    progressFill: document.getElementById("progressFill"),
    progressValue: document.getElementById("progressValue"),
    progressBar: document.getElementById("progressBar"),
    brandEvalId: document.getElementById("brandEvalId"),
    restartBtn: document.getElementById("restartBtn"),

    // intro
    introEyebrow: document.getElementById("introEyebrow"),
    introTitle: document.getElementById("introTitle"),
    introSubtitle: document.getElementById("introSubtitle"),
    introSubject: document.getElementById("introSubject"),
    introCourse: document.getElementById("introCourse"),
    introDescription: document.getElementById("introDescription"),
    startBtn: document.getElementById("startBtn"),
    resumeNotice: document.getElementById("resumeNotice"),
    resumeBtn: document.getElementById("resumeBtn"),

    // student
    studentForm: document.getElementById("studentForm"),

    // section
    sectionIcon: document.getElementById("sectionIcon"),
    sectionEyebrow: document.getElementById("sectionEyebrow"),
    sectionTitle: document.getElementById("sectionTitle"),
    sectionDesc: document.getElementById("sectionDesc"),
    sectionContinueBtn: document.getElementById("sectionContinueBtn"),

    // question
    qSectionLabel: document.getElementById("qSectionLabel"),
    qCount: document.getElementById("qCount"),
    qQuestionText: document.getElementById("qQuestionText"),
    qQuestionHint: document.getElementById("qQuestionHint"),
    qBody: document.getElementById("qBody"),
    qError: document.getElementById("qError"),
    qBackBtn: document.getElementById("qBackBtn"),
    qNextBtn: document.getElementById("qNextBtn"),

    // summary
    summaryList: document.getElementById("summaryList"),
    summaryError: document.getElementById("summaryError"),
    submitBtn: document.getElementById("submitBtn"),
    submitBtnLabel: document.getElementById("submitBtnLabel"),

    // success / fail
    successMessage: document.getElementById("successMessage"),
    failMessage: document.getElementById("failMessage"),
    retryBtn: document.getElementById("retryBtn"),
  };

  const screens = Array.from(document.querySelectorAll("[data-screen]"));

  /* ============================================================
     RENDER: NAVEGACIÓN ENTRE PANTALLAS
     ============================================================ */

  function showScreen(id) {
    screens.forEach((s) => {
      s.hidden = s.id !== id;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateProgress() {
    let percent = 0;
    if (state.screen === "student") {
      percent = 4;
    } else if (state.screen === "flow") {
      const questionSteps = STEPS.filter((s) => s.kind === "question");
      const currentStep = STEPS[state.stepIndex];
      const doneCount =
        currentStep && currentStep.kind === "question"
          ? questionSteps.indexOf(currentStep) + 1
          : questionSteps.findIndex((s) => STEPS.indexOf(s) > state.stepIndex);
      const idx = Math.max(
        0,
        questionSteps.findIndex((s) => STEPS.indexOf(s) >= state.stepIndex)
      );
      percent = 8 + Math.round((idx / Math.max(1, questionSteps.length)) * 84);
    } else if (state.screen === "summary" || state.screen === "success") {
      percent = 100;
    }
    percent = Math.max(0, Math.min(100, percent));
    el.progressFill.style.width = percent + "%";
    el.progressValue.textContent = percent + "%";
    el.progressBar.setAttribute("aria-valuenow", String(percent));
    el.topbar.hidden = state.screen === "intro";
  }

  /* ============================================================
     RENDER: INTRO
     ============================================================ */

  function renderIntro() {
    el.introTitle.textContent = APP_CONFIG.tagline;
    el.introSubtitle.textContent = APP_CONFIG.subtitleIntro;
    el.introSubject.textContent = APP_CONFIG.subject || "—";
    el.introCourse.textContent = APP_CONFIG.course || "—";
    el.introDescription.textContent = APP_CONFIG.description || "";
    el.brandEvalId.textContent = "EVAL-" + APP_CONFIG.evaluationId.toUpperCase();

    const saved = loadProgress();
    const hasSavedProgress =
      saved && (saved.screen === "flow" || saved.screen === "summary" || saved.screen === "student");
    el.resumeNotice.hidden = !hasSavedProgress;
  }

  /* ============================================================
     RENDER: DATOS DEL ESTUDIANTE
     ============================================================ */

  function renderStudentForm() {
    Object.keys(state.student).forEach((key) => {
      const input = document.getElementById(key);
      if (input) input.value = state.student[key] || "";
    });
  }

  function collectStudentForm() {
    const fields = ["studentName", "studentSurname", "studentGroup", "studentCenter"];
    let valid = true;
    fields.forEach((name) => {
      const input = document.getElementById(name);
      const errorEl = document.getElementById("err-" + name);
      const value = sanitizeText(input.value, 120);
      const error = validateStudentField(name, value);
      state.student[name] = value;
      if (error) {
        valid = false;
        input.classList.add("is-invalid");
        errorEl.textContent = error;
      } else {
        input.classList.remove("is-invalid");
        errorEl.textContent = "";
      }
    });
    return valid;
  }

  /* ============================================================
     RENDER: PANTALLA DE SECCIÓN
     ============================================================ */

  function renderSectionScreen(section) {
    el.sectionIcon.textContent = section.icon || "◆";
    el.sectionEyebrow.textContent = "BLOQUE";
    el.sectionTitle.textContent = section.title;
    el.sectionDesc.textContent = section.description || "";
  }

  /* ============================================================
     RENDER: PREGUNTAS (por tipo)
     ============================================================ */

  const renderers = {
    single: renderSingleChoice,
    card: renderCardChoice,
    multiple: renderMultipleChoice,
    scale: renderScaleQuestion,
    boolean: renderBooleanQuestion,
    short_text: renderTextQuestion,
    long_text: renderTextQuestion,
    number: renderNumberQuestion,
    ranking: renderRankingQuestion,
  };

  function renderQuestion(question) {
    el.qQuestionText.textContent = question.question;
    if (question.hint) {
      el.qQuestionHint.hidden = false;
      el.qQuestionHint.textContent = question.hint;
    } else {
      el.qQuestionHint.hidden = true;
    }
    el.qError.hidden = true;
    el.qError.textContent = "";
    el.qBody.innerHTML = "";

    const renderFn = renderers[question.type];
    if (!renderFn) {
      el.qBody.innerHTML = `<p class="q-card__error">Tipo de pregunta no soportado: ${question.type}</p>`;
      return;
    }
    renderFn(question, state.answers[question.id]);
  }

  function renderSingleChoice(question, currentValue) {
    const wrap = document.createElement("div");
    wrap.className = "opt-list";
    question.options.forEach((opt) => {
      const isSelected = currentValue === opt.value;
      const item = document.createElement("label");
      item.className = "opt" + (isSelected ? " is-selected" : "");
      item.innerHTML = `
        <input type="radio" name="${question.id}" value="${opt.value}" ${isSelected ? "checked" : ""}>
        <span class="opt__mark"></span>
        <span class="opt__label">${escapeHtml(opt.label)}</span>
      `;
      item.querySelector("input").addEventListener("change", () => {
        state.answers[question.id] = opt.value;
        saveProgress();
        renderQuestion(question);
      });
      wrap.appendChild(item);
    });
    el.qBody.appendChild(wrap);
  }

  function renderCardChoice(question, currentValue) {
    const wrap = document.createElement("div");
    wrap.className = "card-grid";
    question.options.forEach((opt) => {
      const isSelected = currentValue === opt.value;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card-opt" + (isSelected ? " is-selected" : "");
      card.setAttribute("aria-pressed", String(isSelected));
      card.innerHTML = `
        <span class="card-opt__icon" aria-hidden="true">${opt.icon || "◆"}</span>
        <span class="card-opt__label">${escapeHtml(opt.label)}</span>
      `;
      card.addEventListener("click", () => {
        state.answers[question.id] = opt.value;
        saveProgress();
        renderQuestion(question);
      });
      wrap.appendChild(card);
    });
    el.qBody.appendChild(wrap);
  }

  function renderMultipleChoice(question, currentValue) {
    const selected = new Set(Array.isArray(currentValue) ? currentValue : []);
    const wrap = document.createElement("div");
    wrap.className = "opt-list";
    question.options.forEach((opt) => {
      const isSelected = selected.has(opt.value);
      const item = document.createElement("label");
      item.className = "opt opt--multi" + (isSelected ? " is-selected" : "");
      item.innerHTML = `
        <input type="checkbox" name="${question.id}" value="${opt.value}" ${isSelected ? "checked" : ""}>
        <span class="opt__mark"></span>
        <span class="opt__label">${escapeHtml(opt.label)}</span>
      `;
      item.querySelector("input").addEventListener("change", (e) => {
        if (e.target.checked) selected.add(opt.value);
        else selected.delete(opt.value);
        state.answers[question.id] = Array.from(selected);
        saveProgress();
        renderQuestion(question);
      });
      wrap.appendChild(item);
    });
    el.qBody.appendChild(wrap);
  }

  function renderScaleQuestion(question, currentValue) {
    const min = question.scaleMin ?? 1;
    const max = question.scaleMax ?? 5;
    const wrap = document.createElement("div");

    const row = document.createElement("div");
    row.className = "scale-row";
    for (let n = min; n <= max; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scale-pt" + (Number(currentValue) === n ? " is-selected" : "");
      btn.textContent = String(n);
      btn.setAttribute("aria-pressed", String(Number(currentValue) === n));
      btn.addEventListener("click", () => {
        state.answers[question.id] = n;
        saveProgress();
        renderQuestion(question);
      });
      row.appendChild(btn);
    }
    wrap.appendChild(row);

    if (question.scaleLabels) {
      const labels = document.createElement("div");
      labels.className = "scale-labels";
      labels.innerHTML = `<span>${escapeHtml(question.scaleLabels.min || "")}</span><span>${escapeHtml(
        question.scaleLabels.max || ""
      )}</span>`;
      wrap.appendChild(labels);
    }
    el.qBody.appendChild(wrap);
  }

  function renderBooleanQuestion(question, currentValue) {
    const wrap = document.createElement("div");
    wrap.className = "bool-row";
    [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
    ].forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isSelected = currentValue === opt.value;
      btn.className = "bool-opt" + (isSelected ? ` is-selected--${opt.value}` : "");
      btn.textContent = opt.label;
      btn.setAttribute("aria-pressed", String(isSelected));
      btn.addEventListener("click", () => {
        state.answers[question.id] = opt.value;
        saveProgress();
        renderQuestion(question);
      });
      wrap.appendChild(btn);
    });
    el.qBody.appendChild(wrap);
  }

  function renderTextQuestion(question, currentValue) {
    const isLong = question.type === "long_text";
    const maxLength = question.maxLength || (isLong ? 500 : 120);
    const wrap = document.createElement("div");

    const input = document.createElement(isLong ? "textarea" : "input");
    input.className = isLong ? "q-textarea" : "q-input";
    if (!isLong) input.type = "text";
    input.placeholder = question.placeholder || "";
    input.maxLength = maxLength;
    input.value = currentValue || "";
    input.setAttribute("aria-label", question.question);

    const counter = document.createElement("div");
    counter.className = "q-charcount";
    counter.textContent = `${input.value.length} / ${maxLength}`;

    input.addEventListener("input", () => {
      state.answers[question.id] = input.value;
      counter.textContent = `${input.value.length} / ${maxLength}`;
      saveProgress();
    });

    wrap.appendChild(input);
    wrap.appendChild(counter);
    el.qBody.appendChild(wrap);
  }

  function renderNumberQuestion(question, currentValue) {
    const min = question.min ?? 0;
    const max = question.max ?? 999;
    let value = currentValue !== undefined && currentValue !== "" ? Number(currentValue) : "";

    const wrap = document.createElement("div");
    wrap.className = "num-stepper";
    wrap.innerHTML = `
      <button type="button" class="num-dec" aria-label="Disminuir">−</button>
      <input type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}" aria-label="${escapeHtml(
      question.question
    )}">
      <button type="button" class="num-inc" aria-label="Aumentar">+</button>
    `;
    const input = wrap.querySelector("input");
    const commit = (n) => {
      if (n === "" || Number.isNaN(n)) {
        state.answers[question.id] = "";
        input.value = "";
      } else {
        n = Math.max(min, Math.min(max, n));
        state.answers[question.id] = n;
        input.value = n;
      }
      saveProgress();
    };
    wrap.querySelector(".num-dec").addEventListener("click", () => {
      const n = (Number(input.value) || min) - 1;
      commit(n);
    });
    wrap.querySelector(".num-inc").addEventListener("click", () => {
      const n = (Number(input.value) || min - 1) + 1;
      commit(n);
    });
    input.addEventListener("input", () => {
      commit(input.value === "" ? "" : Number(input.value));
    });
    el.qBody.appendChild(wrap);
  }

  function renderRankingQuestion(question, currentValue) {
    // Arquitectura preparada para ranking; UI funcional simple con botones subir/bajar.
    let order = Array.isArray(currentValue) && currentValue.length
      ? currentValue.slice()
      : question.options.map((o) => o.value);

    function renderList() {
      el.qBody.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "rank-list";
      order.forEach((value, index) => {
        const opt = question.options.find((o) => o.value === value);
        const item = document.createElement("div");
        item.className = "rank-item";
        item.innerHTML = `
          <span class="rank-item__pos">${index + 1}</span>
          <span class="rank-item__label">${escapeHtml(opt ? opt.label : value)}</span>
          <span class="rank-item__ctrls">
            <button type="button" class="rank-up" ${index === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
            <button type="button" class="rank-down" ${
              index === order.length - 1 ? "disabled" : ""
            } aria-label="Bajar">↓</button>
          </span>
        `;
        item.querySelector(".rank-up").addEventListener("click", () => {
          if (index === 0) return;
          [order[index - 1], order[index]] = [order[index], order[index - 1]];
          state.answers[question.id] = order;
          saveProgress();
          renderList();
        });
        item.querySelector(".rank-down").addEventListener("click", () => {
          if (index === order.length - 1) return;
          [order[index + 1], order[index]] = [order[index], order[index + 1]];
          state.answers[question.id] = order;
          saveProgress();
          renderList();
        });
        wrap.appendChild(item);
      });
      el.qBody.appendChild(wrap);
    }

    state.answers[question.id] = order;
    renderList();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  /* ============================================================
     RENDER: RESUMEN
     ============================================================ */

  function renderSummary() {
    el.summaryList.innerHTML = "";
    SECTIONS.forEach((section) => {
      const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);
      if (sectionQuestions.length === 0) return;
      const requiredQuestions = sectionQuestions.filter((q) => q.required);
      const allRequiredAnswered = requiredQuestions.every((q) => {
        const v = state.answers[q.id];
        return !(v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0));
      });

      const li = document.createElement("li");
      li.className = "summary-item";
      li.innerHTML = `
        <span class="summary-item__label">${escapeHtml(section.title)}</span>
        <span class="summary-item__status ${
          allRequiredAnswered ? "summary-item__status--ok" : "summary-item__status--pending"
        }">
          ${allRequiredAnswered ? "✓ Completo" : "Pendiente"}
        </span>
      `;
      li.addEventListener("click", () => {
        const firstStepIndex = STEPS.findIndex((s) => s.kind === "section" && s.section.id === section.id);
        if (firstStepIndex >= 0) {
          state.screen = "flow";
          state.stepIndex = firstStepIndex;
          render();
        }
      });
      el.summaryList.appendChild(li);
    });
  }

  function allRequiredQuestionsAnswered() {
    return QUESTIONS.filter((q) => q.required).every((q) => {
      const v = state.answers[q.id];
      return !(v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0));
    });
  }

  /* ============================================================
     ENVÍO
     ============================================================ */

  let sendingOverlay = null;
  function ensureSendingOverlay() {
    if (sendingOverlay) return sendingOverlay;
    sendingOverlay = document.createElement("div");
    sendingOverlay.className = "sending-overlay";
    sendingOverlay.innerHTML = `
      <div class="sending-spinner" aria-hidden="true"></div>
      <p class="sending-overlay__text">Enviando tus respuestas…</p>
    `;
    document.body.appendChild(sendingOverlay);
    return sendingOverlay;
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function buildSubmissionPayload() {
    const results = calculateResults();
    const answersOut = {};
    QUESTIONS.forEach((q) => {
      const v = state.answers[q.id];
      answersOut[q.id] = Array.isArray(v) ? v.join("|") : v ?? "";
    });

    return {
      evaluationId: APP_CONFIG.evaluationId,
      timestampClient: new Date().toISOString(),
      student: state.student,
      answers: answersOut,
      scores: {
        bySection: Object.fromEntries(
          Object.entries(results.bySection).map(([id, v]) => [id, v.score])
        ),
        total: results.total.score,
        totalMax: results.total.max,
      },
    };
  }

  async function submitResults() {
    if (state.submitting) return; // previene doble envío
    state.submitting = true;
    el.submitBtn.disabled = true;
    el.submitBtnLabel.textContent = "Enviando…";
    ensureSendingOverlay().classList.add("is-visible");

    const payload = buildSubmissionPayload();

    try {
      if (!APP_CONFIG.googleAppsScriptUrl || APP_CONFIG.googleAppsScriptUrl.includes("PEGA_AQUI")) {
        throw new Error("CONFIG_MISSING");
      }

      // Google Apps Script Web Apps no gestionan bien las cabeceras
      // personalizadas en CORS preflight; se envía como text/plain
      // para evitar el preflight y que el propio script parsee el JSON.
      const response = await fetch(APP_CONFIG.googleAppsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("HTTP_" + response.status);

      const data = await response.json().catch(() => ({ ok: true }));
      if (data.ok === false) throw new Error(data.error || "SERVER_ERROR");

      clearProgress();
      state.screen = "success";
      el.successMessage.textContent = APP_CONFIG.successMessage;
      render();
    } catch (err) {
      console.error("Error al enviar la evaluación:", err);
      state.screen = "fail";
      el.failMessage.textContent =
        err && err.message === "CONFIG_MISSING"
          ? "La aplicación aún no está configurada con la URL del backend. Contacta con tu profesor."
          : "Comprueba tu conexión a internet e inténtalo de nuevo. Tu progreso está guardado.";
      render();
    } finally {
      state.submitting = false;
      el.submitBtn.disabled = false;
      el.submitBtnLabel.textContent = "Enviar";
      ensureSendingOverlay().classList.remove("is-visible");
    }
  }

  /* ============================================================
     RENDER PRINCIPAL
     ============================================================ */

  function render() {
    updateProgress();

    if (state.screen === "intro") {
      renderIntro();
      showScreen("screen-intro");
      return;
    }

    if (state.screen === "student") {
      renderStudentForm();
      showScreen("screen-student");
      return;
    }

    if (state.screen === "flow") {
      const step = STEPS[state.stepIndex];
      if (!step) {
        state.screen = "summary";
        render();
        return;
      }
      if (step.kind === "section") {
        renderSectionScreen(step.section);
        showScreen("screen-section");
      } else {
        const questionSteps = STEPS.filter((s) => s.kind === "question");
        const idx = questionSteps.indexOf(step);
        el.qSectionLabel.textContent = step.section.title;
        el.qCount.textContent = `${idx + 1} / ${questionSteps.length}`;
        renderQuestion(step.question);
        el.qBackBtn.disabled = state.stepIndex === 0;
        showScreen("screen-question");
      }
      saveProgress();
      return;
    }

    if (state.screen === "summary") {
      renderSummary();
      showScreen("screen-summary");
      saveProgress();
      return;
    }

    if (state.screen === "success") {
      showScreen("screen-success");
      return;
    }

    if (state.screen === "fail") {
      showScreen("screen-fail");
      return;
    }
  }

  /* ============================================================
     NAVEGACIÓN: EVENTOS
     ============================================================ */

  el.startBtn.addEventListener("click", () => {
    state.screen = "student";
    render();
  });

  el.resumeBtn.addEventListener("click", () => {
    const saved = loadProgress();
    if (!saved) return;
    state.screen = saved.screen === "student" ? "student" : "flow";
    state.stepIndex = saved.stepIndex || 0;
    state.student = Object.assign(state.student, saved.student || {});
    state.answers = saved.answers || {};
    render();
  });

  el.studentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!collectStudentForm()) return;
    state.screen = "flow";
    state.stepIndex = 0;
    render();
  });

  document.querySelectorAll('[data-nav="back"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.screen = "intro";
      render();
    });
  });

  el.sectionContinueBtn.addEventListener("click", () => {
    state.stepIndex += 1;
    render();
  });

  el.qBackBtn.addEventListener("click", () => {
    if (state.stepIndex === 0) return;
    state.stepIndex -= 1;
    render();
  });

  el.qNextBtn.addEventListener("click", () => {
    const step = STEPS[state.stepIndex];
    if (step.kind !== "question") return;
    const error = validateAnswer(step.question, state.answers[step.question.id]);
    if (error) {
      el.qError.hidden = false;
      el.qError.textContent = error;
      return;
    }
    if (state.stepIndex + 1 >= STEPS.length) {
      state.screen = "summary";
    } else {
      state.stepIndex += 1;
    }
    render();
  });

  document.querySelectorAll('[data-nav="review"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.screen = "flow";
      state.stepIndex = Math.max(0, STEPS.length - 1);
      render();
    });
  });

  el.submitBtn.addEventListener("click", () => {
    if (!allRequiredQuestionsAnswered()) {
      el.summaryError.hidden = false;
      el.summaryError.textContent = "Aún hay preguntas obligatorias sin responder. Revisa los bloques marcados como pendientes.";
      return;
    }
    el.summaryError.hidden = true;
    submitResults();
  });

  el.retryBtn.addEventListener("click", () => {
    state.screen = "summary";
    render();
  });

  el.restartBtn.addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres reiniciar la evaluación? Se perderá tu progreso.")) return;
    clearProgress();
    state.screen = "intro";
    state.stepIndex = 0;
    state.answers = {};
    state.student = { studentName: "", studentSurname: "", studentGroup: "", studentCenter: "" };
    render();
  });

  /* ============================================================
     ARRANQUE
     ============================================================ */

  render();
})();
