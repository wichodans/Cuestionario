# System Check · Evaluación Inicial

Plantilla funcional de una plataforma de evaluación diagnóstica inicial para estudiantes. Es un **motor de cuestionario**, no un cuestionario concreto: el contenido real (las preguntas) se define aparte, en `js/questions.js`, para poder sustituirlo sin tocar el resto de la aplicación.

Coste: **0 €**. No necesita servidor propio, hosting de pago ni base de datos de pago.

```
ESTUDIANTE
   │
   ▼
GITHUB PAGES  (HTML + CSS + JS · interfaz del cuestionario)
   │  fetch() POST (JSON)
   ▼
GOOGLE APPS SCRIPT  (valida, calcula, registra)
   │
   ▼
GOOGLE SHEETS  (almacena las respuestas)
```

---

## Índice

1. [Arquitectura](#1-arquitectura)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Instalación paso a paso](#3-instalación-paso-a-paso)
4. [Pruebas (testing)](#4-pruebas-testing)
5. [Personalizar el cuestionario](#5-personalizar-el-cuestionario)
6. [Aspectos de privacidad a revisar](#6-aspectos-de-privacidad-a-revisar)

---

## 1. Arquitectura

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Estructura de las pantallas (portada, datos del alumno, pregunta, resumen, éxito/error). No contiene preguntas ni textos de configuración. |
| `css/style.css` | Todo el diseño visual: variables, layout, animaciones, responsive. |
| `js/config.js` | Textos de portada, IDs de evaluación y la URL del backend. Es lo único (junto a `questions.js`) que se toca para adaptar la app a otra asignatura. |
| `js/questions.js` | **Único** archivo con las preguntas y las secciones. El motor nunca contiene preguntas hardcodeadas. |
| `js/app.js` | El motor: renderiza preguntas según su `type`, valida, calcula progreso y puntuación, guarda en `localStorage`, y envía el resultado final. |
| `google-apps-script/Code.gs` | Backend. Recibe el POST, valida, y escribe una fila en Google Sheets. |

**Cómo se comunican:** `index.html` carga `config.js`, `questions.js` y `app.js` en ese orden. `app.js` lee `APP_CONFIG`, `SECTIONS` y `QUESTIONS` como variables globales — no hace falta ningún build ni módulos ES para que funcione directamente en GitHub Pages.

**Dónde se almacenan las respuestas:** en la hoja `RESPUESTAS` del Google Sheet vinculado al Apps Script. Cada envío es una fila nueva.

**Cómo se calcula la puntuación:** cada pregunta con `scored: true` aporta el `score` de la opción elegida (o del valor de la escala) a la puntuación de su sección (`section`). Las preguntas con `scored: false` (texto libre, opinión, sí/no informativo…) nunca puntúan, aunque tengan la propiedad `options`. `app.js` calcula un total por sección y un total global antes de enviar.

**Cómo modificar el cuestionario:** sustituyendo `js/questions.js` por otro que siga el mismo formato (ver [sección 5](#5-personalizar-el-cuestionario)). No hace falta tocar `index.html`, `style.css` ni `app.js`.

---

## 2. Estructura de carpetas

```
evaluacion-inicial/
│
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          ← motor (no tocar para cambiar preguntas)
│   ├── config.js        ← textos y URL del backend
│   └── questions.js      ← preguntas y secciones (ESTE es el que sustituyes)
├── assets/
│   ├── images/
│   └── icons/
├── google-apps-script/
│   └── Code.gs           ← pegar en Apps Script, no en GitHub Pages
├── README.md
└── .gitignore
```

---

## 3. Instalación paso a paso

Pensado para alguien que no ha usado GitHub ni Apps Script antes.

### Paso 1 — Crear el repositorio en GitHub

1. Entra en [github.com](https://github.com) y crea una cuenta si no tienes.
2. Pulsa **New repository**.
3. Ponle un nombre, por ejemplo `evaluacion-inicial`.
4. Marca el repositorio como **Public** (GitHub Pages gratuito requiere repos públicos, salvo que tengas GitHub Pro/Team).
5. Crea el repositorio.

### Paso 2 — Subir los archivos

Sube **todo** el contenido de esta carpeta (`index.html`, `css/`, `js/`, `assets/`, `google-apps-script/`, `README.md`, `.gitignore`) manteniendo la misma estructura de carpetas. Puedes hacerlo:

- Desde la web de GitHub: **Add file → Upload files**, arrastrando la carpeta.
- O con Git desde tu ordenador:
  ```bash
  git init
  git add .
  git commit -m "Primera versión de la evaluación inicial"
  git branch -M main
  git remote add origin https://github.com/TU_USUARIO/evaluacion-inicial.git
  git push -u origin main
  ```

### Paso 3 — Crear la hoja de Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja de cálculo en blanco.
2. Ponle un nombre, por ejemplo `Evaluación Inicial - Respuestas`.
3. No hace falta crear columnas a mano: `Code.gs` crea automáticamente la hoja `RESPUESTAS` con la fila de cabecera (timestamp, datos del alumno, una columna por cada pregunta y las puntuaciones) en el primer envío.
4. Opcional: puedes crear manualmente hojas adicionales si quieres organización extra:
   - **PREGUNTAS**: para llevar un registro legible de qué significa cada `question_id` (útil si luego analizas los datos).
   - **CONFIG**: para anotar qué `evaluationId` corresponde a qué asignatura/curso si vas a reutilizar el mismo Sheet para varias evaluaciones.
   - **RESULTADOS**: si más adelante quieres construir tablas dinámicas o gráficos a partir de `RESPUESTAS`.

### Paso 4 — Crear el proyecto de Google Apps Script

1. Con la hoja de cálculo abierta, ve a **Extensiones → Apps Script**.
2. Borra el contenido de `Code.gs` que aparece por defecto.
3. Pega el contenido completo de `google-apps-script/Code.gs` (de este proyecto).
4. Pulsa el icono de guardar (💾).

> Al crear el script desde **Extensiones → Apps Script** de la propia hoja, el script queda automáticamente vinculado a ese Sheet — no necesitas rellenar `SPREADSHEET_ID` en el código.

### Paso 5 — Configurar el ID de Google Sheets (opcional)

Solo si prefieres tener el Apps Script como proyecto independiente (no vinculado a un Sheet concreto):

1. Abre tu Google Sheet y copia el ID de la URL: `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`.
2. En `Code.gs`, pega ese ID en la constante `SPREADSHEET_ID` al principio del archivo.

Si has seguido el Paso 4 tal cual, puedes dejar `SPREADSHEET_ID = ""`.

### Paso 6 — Publicar Apps Script como Web App

1. En el editor de Apps Script, pulsa **Deploy → New deployment** (Implementar → Nueva implementación).
2. En "Select type", elige **Web app**.
3. Configura:
   - **Execute as (Ejecutar como):** `Me` (tu cuenta) — así el script escribe en el Sheet con tus permisos, sin pedir login al estudiante.
   - **Who has access (Quién tiene acceso):** `Anyone` (Cualquier usuario) — imprescindible para que GitHub Pages pueda llamar al script sin que el estudiante inicie sesión en Google.
4. Pulsa **Deploy**.
5. La primera vez, Google pedirá autorizar permisos: acepta (es tu propio script accediendo a tu propio Sheet).

### Paso 7 — Copiar la URL del Web App

Tras publicar, Google te da una URL con este formato:

```
https://script.google.com/macros/s/AKfycb.../exec
```

Cópiala.

### Paso 8 — Pegar la URL en `config.js`

1. Abre `js/config.js` en el repositorio.
2. Sustituye:
   ```javascript
   googleAppsScriptUrl: "PEGA_AQUI_LA_URL_DE_TU_WEB_APP",
   ```
   por la URL real que copiaste.
3. Sube el cambio al repositorio (commit + push, o edítalo directamente en GitHub).

### Paso 9 — Activar GitHub Pages

1. En el repositorio de GitHub, ve a **Settings → Pages**.
2. En **Source**, elige la rama `main` y la carpeta `/ (root)`.
3. Guarda. GitHub te dará una URL del tipo:
   ```
   https://TU_USUARIO.github.io/evaluacion-inicial/
   ```
4. Tarda uno o dos minutos en publicarse la primera vez.

### Paso 10 — Probar la aplicación

Abre la URL de GitHub Pages, completa el cuestionario demo de principio a fin y envíalo.

### Paso 11 — Comprobar que la respuesta aparece en Google Sheets

Abre tu hoja de cálculo y revisa la hoja `RESPUESTAS`: debería haber una fila nueva con timestamp, los datos del alumno, cada respuesta y las puntuaciones por sección.

Si no aparece nada, revisa la sección de pruebas más abajo y el mensaje de error mostrado en pantalla.

---

## 4. Pruebas (testing)

Antes de dar por terminada la instalación, comprueba:

- [ ] **Envío correcto**: completar todo el cuestionario y comprobar que aparece la pantalla de éxito y la fila en Google Sheets.
- [ ] **Campo obligatorio vacío**: intentar avanzar sin rellenar un campo `required` — debe mostrar el error y no dejar avanzar.
- [ ] **Respuesta inválida**: probar valores fuera de rango en preguntas numéricas o de escala.
- [ ] **Pérdida de conexión**: desactivar la red antes de enviar — debe mostrar la pantalla de error de conexión sin perder las respuestas.
- [ ] **Doble clic en enviar**: pulsar "Enviar" varias veces seguidas — solo debe registrarse un envío (el botón se desactiva mientras se envía).
- [ ] **Recarga de página**: recargar a mitad del cuestionario y comprobar el aviso de "escaneo sin terminar" y que se recupera el progreso.
- [ ] **Recuperación desde localStorage**: cerrar la pestaña y volver a abrir la URL — debe ofrecer continuar donde se dejó.
- [ ] **Móvil**: probar en una pantalla estrecha (320–414px) sin scroll horizontal y con botones cómodos al tacto.
- [ ] **Tablet**: comprobar en ~768px.
- [ ] **Escritorio**: comprobar en resoluciones amplias (1280px+).

---

## 5. Personalizar el cuestionario

**Para modificar el cuestionario solamente debes modificar `js/questions.js`.** No toques `index.html`, `style.css` ni `app.js`.

El archivo exporta dos variables globales: `SECTIONS` (bloques del cuestionario) y `QUESTIONS` (preguntas, cada una asociada a una sección por su `id`).

### Estructura de una sección

```javascript
{
  id: "html",              // identificador único, minúsculas, sin espacios
  title: "HTML",           // título en la pantalla de transición
  icon: "◆",               // carácter decorativo (opcional)
  description: "Estructura y semántica web."
}
```

### Campos comunes de toda pregunta

```javascript
{
  id: "html_01",       // ÚNICO. Nunca uses el texto de la pregunta como id.
  section: "html",     // debe coincidir con el id de una sección
  type: "single",       // ver tipos más abajo
  question: "¿...?",
  hint: "Texto de ayuda opcional",
  required: true,
  scored: true,          // si cuenta para la puntuación de la sección
}
```

### Ejemplos por tipo

**Selección única**
```javascript
{
  id: "html_01", section: "html", type: "single",
  question: "¿Qué experiencia tienes con HTML?",
  required: true, scored: true,
  options: [
    { value: "none", label: "Nunca lo he utilizado", score: 0 },
    { value: "basic", label: "Conocimientos básicos", score: 1 },
    { value: "advanced", label: "Bastante experiencia", score: 2 },
  ],
}
```

**Selección múltiple**
```javascript
{
  id: "html_02", section: "html", type: "multiple",
  question: "¿Cuáles de estas etiquetas reconoces?",
  required: false, scored: true,
  options: [
    { value: "section", label: "<section>", score: 1 },
    { value: "canvas", label: "<canvas>", score: 1 },
  ],
}
```

**Pregunta abierta (texto corto)**
```javascript
{
  id: "js_03", section: "javascript", type: "short_text",
  question: "¿Cuánto tiempo llevas programando?",
  required: false, scored: false,
  placeholder: "p. ej. 6 meses", maxLength: 60,
}
```

**Pregunta abierta (texto largo)**
```javascript
{
  id: "exp_01", section: "expectativas", type: "long_text",
  question: "¿Qué esperas aprender durante este curso?",
  required: false, scored: false,
  placeholder: "Escribe con libertad...", maxLength: 500,
}
```

**Escala**
```javascript
{
  id: "css_01", section: "css", type: "scale",
  question: "Del 1 al 5, ¿qué nivel tienes en CSS?",
  required: true, scored: true,
  scaleMin: 1, scaleMax: 5,
  scaleLabels: { min: "Nada", max: "Experto" },
}
```

**Sí / No**
```javascript
{
  id: "js_01", section: "javascript", type: "boolean",
  question: "¿Has programado alguna vez en JavaScript?",
  required: true, scored: false,
}
```

**Tarjetas**
```javascript
{
  id: "css_02", section: "css", type: "card",
  question: "¿Cómo definirías tu experiencia con maquetación web?",
  required: true, scored: true,
  options: [
    { value: "principiante", label: "Principiante", icon: "🟢", score: 0 },
    { value: "avanzado", label: "Avanzado", icon: "🟣", score: 3 },
  ],
}
```

**Numérica**
```javascript
{
  id: "js_02", section: "javascript", type: "number",
  question: "¿Cuántos lenguajes de programación conoces?",
  required: true, scored: false,
  min: 0, max: 15,
}
```

Después de sustituir `questions.js`, sube el cambio al repositorio: GitHub Pages se actualiza solo, no hace falta tocar nada más.

---

## 6. Aspectos de privacidad a revisar

Este proyecto solicita datos identificativos del alumnado (nombre, apellidos, grupo, centro) y sus respuestas. Antes de usarlo con estudiantes reales:

- Confirma con tu centro educativo si existe algún procedimiento o política interna de protección de datos que debas seguir para recoger y almacenar esta información en Google Sheets.
- Considera si necesitas informar explícitamente al alumnado (o a sus tutores legales, si son menores) sobre el uso que se dará a los datos, más allá del texto informativo ya incluido en la pantalla de portada.
- Este README no sustituye asesoría legal: si tienes dudas sobre normativa de protección de datos aplicable a tu centro o región, consúltalo con quien corresponda en tu organización.
