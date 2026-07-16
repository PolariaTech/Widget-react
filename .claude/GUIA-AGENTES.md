# Guía de agentes — Widget (migración a React)

Estos agentes viven en `.claude/agents/` y quedan disponibles como subagentes dentro de este proyecto. Cubren las fases de la migración del widget vanilla JS/HTML/CSS a React: diseñar la arquitectura, construir los componentes, cuidar la UI/UX, revisar seguridad, revisar código y mantener la documentación al día.

Si se crea `Widget-react/` como carpeta paralela (ver `../CLAUDE.md` del workspace), copia esta carpeta `.claude/` completa ahí también — estos agentes aplican igual al proyecto nuevo.

## Índice rápido — ¿cuál uso según lo que esté pasando?

| Situación | Agente |
|---|---|
| Definir cómo se parte el widget en componentes/estado antes de escribir código | `software-architect` |
| Traducir la UI actual (Tailwind + CSS a medida) a un sistema de componentes React consistente | `ui-designer` |
| Escribir los componentes, hooks y lógica de envío/estado en React | `frontend-developer` |
| Revisar que el flujo de fullscreen, scroll, textarea, etc. tenga una base CSS/estructura sólida | `ux-architect` |
| Migrar el patrón anti-XSS de imágenes, el trust boundary de Cloudinary, o cualquier cosa que toque `dangerouslySetInnerHTML` | `security-engineer` |
| Revisar un PR/diff de la migración antes de darlo por bueno | `code-reviewer` |
| Actualizar `README.md` / `CLAUDE.md` del widget para que reflejen la arquitectura React nueva | `technical-writer` |

## Detalle de cada uno

### `software-architect` — Software Architect
Antes de tocar código: decide cómo se traduce el estado global implícito de `config.js`/`storage.js` (conversación activa, mensajes, historial) a un modelo de estado React (hooks locales vs. context vs. store). Es el que debe encargarse explícitamente de la condición de carrera documentada en `CLAUDE.md` (`sendMessage` captura `capturedConvId`/`sentAt` antes de cualquier `await`, y `finishAiReply` solo pinta en pantalla si sigue siendo la conversación activa, pero siempre persiste) — en React esto normalmente se rompe si alguien usa el estado "vivo" dentro de un closure async sin capturarlo antes.

### `ui-designer` — UI Designer
Traduce el sistema visual actual (Tailwind vía CDN + `css/styles.css` con las clases semánticas `.chat-msg-text`/`.chat-msg-time` para el breakpoint móvil, más el truco de escala `#chat-scale-root` en fullscreen) a componentes React con estilos consistentes. Es quien decide si el proyecto migra a Tailwind instalado localmente, CSS Modules, o se mantiene el CDN, sin perder pixel-parity con el widget actual.

### `frontend-developer` — Frontend Developer
Construye los componentes y hooks reales: el modal, la columna de mensajes (`#messages-container` vs `#messages-column` deben seguir siendo elementos distintos), el textarea con auto-grow y Shift+Enter, el flujo de envío con Cloudinary, y la persistencia en `localStorage`. Es el agente principal de la migración día a día.

### `ux-architect` — UX Architect
Da la base técnica de CSS/layout — útil cuando la migración toque el contenedor de scroll vs. columna de lectura, el `max-w-[640px] mx-auto` duplicado (footer + columna de mensajes), o el comportamiento minimize-vs-close (`toggleChat` sin reset vs. `closeChat` con `resetWidget`). Estas dos rutas de "ocultar el modal" deben seguir siendo distintas en la versión React.

### `security-engineer` — Security Engineer
Punto de control obligatorio antes de mergear la migración de renderizado de mensajes. El widget actual evita XSS en imágenes construyendo el `<img>` vía `document.createElement` y asignando `.src` como propiedad DOM (nunca interpolando la URL en un string de `innerHTML`), porque la URL viene de la respuesta de Cloudinary, no solo de input local. En React es tentador usar `dangerouslySetInnerHTML` para el texto o pasar la URL directo a `<img src={...}>` sin pensarlo — este agente valida que el equivalente React preserve la misma garantía, y revisa el trust boundary de Cloudinary (preset unsigned, validación de `IMAGE_VALIDATION` es solo UX, no seguridad real).

### `code-reviewer` — Code Reviewer
Revisión general de cada PR de la migración: correctitud, mantenibilidad, performance. Complementa a `security-engineer` (que se enfoca solo en superficie de ataque) y a `software-architect` (que ya validó el diseño antes de escribir código).

### `technical-writer` — Technical Writer
Mantiene `Widget/README.md` y `Widget/CLAUDE.md` (o los de `Widget-react/` si se crea la carpeta nueva) sincronizados con la arquitectura real a medida que avanza la migración — mismo principio que `doc-updater` en el resto del workspace, pero sin gate de frase exacta: aplícalo cuando una decisión de arquitectura quede firme y valga la pena documentar para el siguiente hilo.

## Flujo sugerido para la migración a React

1. `software-architect` — decidir el modelo de estado y cómo se preserva la condición de carrera del envío de mensajes
2. `ui-designer` — mapear el sistema visual actual a componentes con estilos consistentes
3. `ux-architect` — validar la base CSS/layout de los puntos delicados (scroll vs. columna, fullscreen, minimize vs. close)
4. `frontend-developer` — implementar componentes, hooks y flujo de envío
5. `security-engineer` — auditar el renderizado de mensajes/imágenes y el trust boundary de Cloudinary antes de dar por cerrada cada tanda de componentes
6. `code-reviewer` — revisión general de cada PR
7. `technical-writer` — actualizar la documentación del widget al cierre de cada hito
