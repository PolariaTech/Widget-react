# Mateo Support — Widget de Chat (React)

Widget de chat de soporte para **Mateo**, el asistente de IA de Polaria. Embebible en **polaria-wms-web** (Shadow DOM) o usable standalone. Habla con n8n (mismo workflow del canal web), sube imágenes a Cloudinary y, en embed, persiste el historial en Supabase vía el API WMS (`widget_*`).

[![Build](https://img.shields.io/badge/build-manual-lightgrey)]() [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]() [![i18n](https://img.shields.io/badge/i18n-es%20%7C%20en-blueviolet)]()

> **Embed Polaria:** `npm run build:lib` → `dist/assets/mateo-widget.js`. Guía: [`docs/EMBED-POLARIA.md`](docs/EMBED-POLARIA.md). Seguridad / POL-71–73: [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md).

## Stack tecnológico

| Tecnología | Versión | Rol en este proyecto |
|---|---|---|
| React | 19.2.7 | UI del widget, montada dentro de un shadow root (ver `docs/ARQUITECTURA.md`) |
| TypeScript | ~6.0.2 (modo `strict`) | Tipado de todo el código; `noUncheckedIndexedAccess` activo |
| Vite | 8.1.1 | Dev server, build, y motor de tests (Vitest comparte su config) |
| Tailwind CSS | v4.3.2 | Estilos, inyectados como `<style>` dentro del shadow root vía `?inline` |
| Vitest + happy-dom | 4.1.10 / 20.10.6 | Suite de tests de los módulos puros de `lib/` |
| SweetAlert2 | 11.26.25 | Diálogos de alerta/confirmación — cargado de forma diferida (`import()` dinámico) |
| oxlint | 1.71.0 | Linter del proyecto |
| n8n (externo) | — | Backend conversacional de Mateo — el widget le habla igual que WhatsApp Business |
| Cloudinary (externo) | — | Almacenamiento de las imágenes que el usuario adjunta |

## Prerrequisitos

- **Node.js 20.x LTS o superior** (recomendado; el proyecto usa sintaxis ES2023) — [descargar](https://nodejs.org)
- **npm** (incluido con Node.js) — no se ha probado con yarn/pnpm
- Acceso a una **cuenta de Cloudinary** con un upload preset *unsigned* configurado (o usar el de desarrollo ya presente en `.env.development`)
- El **webhook de n8n** de Mateo Support debe estar activo y accesible (ver `docs/INTEGRACIONES.md`) — sin él, el widget carga pero no puede enviar/recibir mensajes

## Instalación

1. Clona el repositorio y entra a esta carpeta:
   ```bash
   cd Widget-react
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```
   Resultado esperado: instala ~230 paquetes en menos de 1 minuto, sin errores. Pueden aparecer warnings de dependencias peer — son normales e ignorables.

3. Las variables de entorno de desarrollo **ya vienen configuradas** en `.env.development` (valores de prueba, no son secretos reales — ver `docs/VARIABLES_DE_ENTORNO.md`). No necesitas crear nada para levantar el proyecto localmente. Si vas a apuntar a un ambiente distinto, copia `.env.example` a `.env.staging` o `.env.production` y completa los valores reales.

## Cómo correr el proyecto

```bash
npm run dev
```

Abre automáticamente en **http://localhost:5173**. Verás una página en blanco con solo el botón flotante del chat en la esquina inferior derecha — es el widget real tal como se vería embebido en un sitio host, sin ningún contenido de arnés de pruebas alrededor.

## Cómo correr los tests

```bash
npm run test
```

Corre la suite de Vitest una vez (56 tests en 6 archivos, todos sobre módulos puros de `src/lib/`: `format`, `fileSignature`, `cloudinary`, `storage`, `authToken`, `webhook`). Resultado esperado: `Test Files 6 passed (6)` / `Tests 56 passed (56)` en menos de 2 segundos. Ver `docs/TESTING.md` para la convención de nombres y cómo escribir un test nuevo.

Otros comandos útiles:

```bash
npm run build      # app standalone → dist/
npm run build:lib  # IIFE/ES embebible → dist/assets/mateo-widget*.js
npm run lint
npm run preview
```

Embed en Polaria: ver **`docs/EMBED-POLARIA.md`**. Ejemplo mínimo:

```js
MateoWidget.init({
  container: document.getElementById('mateo-root'),
  tokenFetcher: () =>
    fetch('/api/auth/mateo/widget-token', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + wmsToken },
    }).then((r) => r.json()),
});
```

## Variables de entorno

El widget lee su configuración de `import.meta.env.VITE_*` (Vite carga `.env.development`, `.env.staging` o `.env.production` según el modo). Ejemplo mínimo (ver `.env.example` para la plantilla completa y `docs/VARIABLES_DE_ENTORNO.md` para el detalle de cada variable):

```bash
VITE_N8N_WEBHOOK_URL=https://polariatech.app.n8n.cloud/webhook/test-mateo-support
VITE_CLOUDINARY_CLOUD_NAME=ujssaxx6
VITE_CLOUDINARY_UPLOAD_PRESET=mateo_test_unsigned
```

Ninguna de estas es un secreto de build (no hay API keys ni credenciales aquí): la URL del webhook va embebida en el bundle de JS de cualquier app cliente y no hay forma de ocultarla del todo (mitigación = poder rotarla, no mantenerla en secreto), y el preset de Cloudinary es *unsigned* por diseño. Pero **cada llamada al webhook sí lleva autenticación** — el widget adjunta `Authorization: Bearer <jwt>` en cada request (`src/lib/authToken.ts`, POL-72); ver `docs/SEGURIDAD.md` para el estado real de si el lado de n8n ya lo hace cumplir. Estos valores **sí son específicos de ambiente**: no reutilices los de desarrollo en producción sin coordinarlo primero con el equipo de n8n.

## Estructura del proyecto

```
Widget-react/
├── src/
│   ├── components/     # Componentes de UI (ChatButton, ChatModal, Header, HistoryPanel...)
│   ├── hooks/          # useChat (envío de mensajes), useConversations (historial),
│   │                   # useFocusTrap/useFocusRestore (accesibilidad)
│   ├── lib/            # Módulos puros: webhook.ts, cloudinary.ts, http.ts, storage.ts,
│   │                   # alerts.ts, format.ts, fileSignature.ts (+ sus *.test.ts)
│   ├── i18n/           # Diccionarios es/en y la función t() — ver ADR-0002
│   ├── config.ts       # Constantes y variables de entorno (VITE_*)
│   ├── types.ts        # Message, Conversation, SelectedImage
│   └── main.tsx        # Punto de entrada — monta el widget en un shadow root
├── docs/
│   ├── ARQUITECTURA.md
│   ├── INTEGRACIONES.md
│   ├── VARIABLES_DE_ENTORNO.md
│   ├── GLOSARIO.md
│   ├── FLUJOS_DE_NEGOCIO.md
│   ├── TESTING.md
│   ├── SEGURIDAD.md
│   ├── ENTORNOS.md
│   ├── DOCUMENTACION_CHECKLIST.md
│   └── adr/            # Architecture Decision Records
├── CONTRIBUTING.md
└── CHANGELOG.md
```

## Documentación relacionada

| Documento | Contenido |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Diagramas de arquitectura, capas del sistema, por qué Shadow DOM |
| [`docs/INTEGRACIONES.md`](docs/INTEGRACIONES.md) | Contrato del webhook de n8n y de la subida a Cloudinary |
| [`docs/VARIABLES_DE_ENTORNO.md`](docs/VARIABLES_DE_ENTORNO.md) | Cada variable `VITE_*`: tipo, origen, impacto si falta |
| [`docs/GLOSARIO.md`](docs/GLOSARIO.md) | Términos del dominio (conversación, historial, locale...) |
| [`docs/FLUJOS_DE_NEGOCIO.md`](docs/FLUJOS_DE_NEGOCIO.md) | Flujos end-to-end: enviar mensaje, adjuntar imagen, historial |
| [`docs/TESTING.md`](docs/TESTING.md) | Cómo correr y escribir tests |
| [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) | Modelo de datos, secretos, checklist antes de producción |
| [`docs/ENTORNOS.md`](docs/ENTORNOS.md) | dev / staging / producción |
| [`docs/adr/`](docs/adr/) | Decisiones arquitecturales y por qué se tomaron |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Convención de ramas, commits, Definition of Done |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial de cambios del widget |

## Troubleshooting rápido

| Problema | Solución |
|---|---|
| `npm run dev` levanta pero el botón flotante no responde | Revisa la consola del navegador — si ves un error de React, probablemente el `ErrorBoundary` ya lo capturó y muestra "Algo salió mal con el chat de soporte"; recarga con el botón que aparece. |
| Los mensajes se quedan en "Mateo está escribiendo…" para siempre | El webhook de n8n (`VITE_N8N_WEBHOOK_URL`) no está respondiendo o no está activo. Verifica en `docs/INTEGRACIONES.md` cómo probarlo directamente con `curl`. |
| Las imágenes no se suben (error de Cloudinary) | Confirma que `VITE_CLOUDINARY_CLOUD_NAME`/`VITE_CLOUDINARY_UPLOAD_PRESET` coinciden con un preset *unsigned* real y activo en la consola de Cloudinary. |
| El historial de conversaciones desapareció | Revisa la consola: si dice "Se descartó el historial: versión de esquema... no soportada", es que volviste a una build vieja del widget con datos de una versión más nueva del esquema — ver `docs/adr/` sobre versionado de `localStorage`. |
| `npm run test` falla con textos en inglés inesperados | El entorno de test (`happy-dom`) puede resolver `navigator.language` distinto a tu navegador real — los tests ya están escritos para ser agnósticos al idioma (usan `t()`); si ves uno que no lo es, es un bug del test, no del código. |
