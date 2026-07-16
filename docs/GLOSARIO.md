# Glosario — Mateo Support Widget

> Audiencia: cualquiera (técnico o no) que necesite entender los términos que usa este proyecto. Organizado por categoría.

## Entidades del dominio

**Conversación**
Un hilo completo de mensajes entre el visitante y Mateo, con un título (derivado del primer mensaje o su caption), fecha de creación/actualización, y su lista de mensajes. Representación en el sistema: objeto `Conversation` en `src/types.ts`, persistido dentro del array `conversations` en `localStorage`.
Estados: no tiene estados propios — existe desde que se crea (`ensureConversation`) hasta que se elimina explícitamente o se borra todo el historial.
No confundir con: **Historial**, que es la *lista* de todas las conversaciones, no una conversación individual.

**Mensaje**
Una unidad de contenido dentro de una conversación: texto o imagen, enviado por el usuario o por Mateo (`role: 'user' | 'ai'`). Representación: objeto `Message` en `src/types.ts` — `{ role, type, content, timestamp, isError? }`.
Ejemplo: el usuario adjunta una foto de un evaporador con la nota "esto no debería estar así" → se crean dos mensajes (`type: 'image'` y `type: 'text'`), ambos con `role: 'user'` y el mismo `timestamp`.

**Historial**
La colección completa de conversaciones guardadas en este navegador, ordenada por fecha de última actividad. Representación: array `conversations` dentro del envelope `{ schemaVersion, conversations }` en la clave `mateo_chat_conversations` de `localStorage`. Se muestra en `HistoryPanel.tsx`.
No confundir con: **Conversación** (una entrada individual del historial).

**Mensaje de error**
Un mensaje con `role: 'ai'` e `isError: true` — no es una respuesta real de Mateo, sino un aviso generado localmente por el widget cuando algo falló (sin conexión, timeout, formato de respuesta inesperado). Se distingue visualmente con fondo rojo tenue e ícono de advertencia (`MessageBubble.tsx`), precisamente para que nunca se confunda con algo que Mateo realmente dijo.
Ejemplo: el visitante envía un mensaje sin internet → aparece "Parece que no tienes conexión a internet. Revisa tu conexión e intenta de nuevo." con estilo de error, no como burbuja normal de Mateo.

## Interfaz y estados de la ventana

**Modo compacto**
El widget como una ventana pequeña flotante (320×420px, o menos en viewports angostos) anclada a la esquina inferior derecha. Es el modo por defecto al abrir el chat.

**Modo pantalla completa (fullscreen)**
El widget expandido a ocupar casi toda la ventana del navegador (`inset-4`), con un backdrop oscuro detrás y el historial como columna lateral persistente en vez de una vista que reemplaza la conversación. Se activa con el botón de expandir del header.

**Minimizar**
Cerrar la ventana del widget pero conservar el estado de la conversación en memoria (no se pierde el historial ni la conversación activa) — vuelve a mostrarse el botón flotante. Distinto de **Cerrar**, que además reinicia la conversación activa a una nueva.

**Botón flotante**
El ícono circular con el logo "sparkle" que aparece en la esquina inferior derecha cuando el widget está minimizado/cerrado. Al hacer clic, abre el chat. Puede mostrar un punto teal (indicador de "mensaje nuevo") si llegó una respuesta mientras estaba minimizado.

**Overlay de historial**
En modo compacto, la vista que *reemplaza* completamente el área de mensajes + input para mostrar la lista de conversaciones (`HistoryOverlay.tsx`). Distinto del **sidebar de historial**, que es la versión persistente de fullscreen (`HistorySidebar.tsx`) — ambos muestran el mismo `HistoryPanel.tsx` por dentro, pero con "chrome" distinto alrededor.

**Lightbox**
La vista de pantalla completa que amplía una imagen (enviada o adjunta) al hacer clic sobre su miniatura (`ImageLightbox.tsx`). Es el único elemento del widget que atrapa el foco de teclado por completo (ver `docs/ARQUITECTURA.md` sobre `useFocusTrap`).

## Técnicos, específicos de este proyecto

**Shadow root / Shadow DOM**
La técnica de aislamiento de estilos que usa el widget para poder embeberse en `polaria.tech` sin que su CSS (el preflight de Tailwind) filtre hacia el sitio anfitrión ni viceversa. Ver ADR-0001 y `docs/ARQUITECTURA.md`.

**Locale**
El idioma resuelto una sola vez al cargar el widget, a partir de `navigator.language` (español por defecto, inglés si el navegador reporta `en*`). No cambia dentro de una misma sesión — no hay selector de idioma en la UI. Ver ADR-0002.

**`t()`**
La función de traducción del widget (`src/i18n/index.ts`). Recibe una clave y variables opcionales, devuelve el string en el idioma resuelto. Se usa igual desde componentes React que desde módulos puros de `lib/`.

**Envelope de esquema**
La forma `{ schemaVersion, conversations }` en la que se persiste el historial en `localStorage`, en vez de guardar el array de conversaciones directo. Permite distinguir datos de una versión futura del widget (que se descartan de forma segura) de datos simplemente corruptos. Ver ADR-0006.

**wamid**
El identificador de mensaje saliente que el widget genera para cada mensaje (`wamid.` + timestamp en base36 + string aleatorio), imitando el formato de ID de mensaje de WhatsApp Business (`wamid.*`). No es un secreto, es solo un identificador de correlación para el payload que recibe n8n. Ver ADR-0004.

## Términos que NO son lo que parecen

**`USER_PHONE`** no es el número de teléfono de un usuario real — es un valor fijo (`573006188395`) compartido por *todos* los visitantes del widget web, porque no existe un canal de WhatsApp real detrás de una visita web. Ver `docs/SEGURIDAD.md` sobre el riesgo de identidad cruzada que esto implica en el backend de n8n.

**`isSending`** no es "hay una petición HTTP en curso" en un sentido genérico — es específicamente el estado que bloquea un *nuevo* envío mientras el flujo completo de `sendMessage` (que puede incluir subir una imagen a Cloudinary *y luego* llamar al webhook de n8n, secuencialmente) todavía no terminó.
