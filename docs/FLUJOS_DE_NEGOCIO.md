# Flujos end-to-end — Mateo Support Widget

> Audiencia: cualquiera (técnico o de producto) que necesite validar si el widget se comporta como debería, sin leer código. Términos usados aquí definidos en `docs/GLOSARIO.md`.

## Flujo 1 — Enviar un mensaje de texto

**Objetivo:** el visitante escribe una pregunta → Mateo responde dentro de la misma conversación.

**Actores:** Visitante, Mateo (vía webhook de n8n). En embed Polaria también interviene el API WMS (historial remoto).

**Precondiciones:** el widget está abierto (modo compacto o fullscreen), el visitante no tiene otro envío en curso (`isSending === false`). En embed: sesión WMS activa y `configureTokenFetcher` configurado (JWT para n8n).

| # | Actor | Acción | Estado del sistema |
|---|---|---|---|
| 1 | Visitante | Escribe texto en el input y presiona Enter (o clic en enviar) | Si `isSending` es `true`, no pasa nada (protegido con ref síncrono, ver ADR-0005) |
| 2 | Sistema | Crea una conversación nueva si no había una activa | `ensureConversation()` — de forma síncrona; en remoto crea UUID en paralelo |
| 3 | Sistema | Agrega el mensaje del usuario al historial, deshabilita el input | `isSending = true`; aparece el indicador "Mateo está escribiendo…" |
| 4 | Sistema | Envía el mensaje al webhook de n8n con Bearer JWT (ver `docs/INTEGRACIONES.md`) | Espera hasta 120s |
| 5 | Mateo (n8n) | Procesa y responde con el texto | — |
| 6 | Sistema | Agrega la respuesta al historial (resolviendo alias `conv_*`→UUID), rehabilita el input | `isSending = false`; sync remoto a `/mateo/conversaciones` si hay embed |

**Postcondiciones:** la conversación tiene 2 mensajes nuevos (usuario + Mateo), el título de la conversación quedó fijado al contenido del primer mensaje si no lo tenía ya. En embed, ambos mensajes comparten el mismo `id_conversacion` UUID en Supabase.

**Casos de error:**

| Situación | Qué pasa |
|---|---|
| Sin conexión a internet (`navigator.onLine === false`) | No se llama al webhook; aparece un mensaje de error inmediato ("Parece que no tienes conexión...") con estilo visual distinto |
| El webhook no responde a tiempo o responde con error | Aparece "Error al conectar con el servidor." con estilo de error |
| El webhook responde 200 pero con una forma inesperada | Aparece "Recibí una respuesta con un formato inesperado." con estilo de error |

**Casos borde:**

- El visitante mantiene Enter presionado (auto-repeat del teclado): el segundo evento no crea una segunda conversación ni duplica el mensaje — ver ADR-0005.
- El visitante escribe más de 2000 caracteres: el textarea simplemente no acepta más (`maxLength`).

## Flujo 2 — Enviar una imagen (con o sin caption)

**Objetivo:** el visitante adjunta evidencia visual (ej. una foto de un problema) → Mateo la recibe junto con el texto que la acompaña.

**Actores:** Visitante, Cloudinary, Mateo (vía webhook de n8n).

**Precondiciones:** el widget está abierto, sin envío en curso.

| # | Actor | Acción | Estado del sistema |
|---|---|---|---|
| 1 | Visitante | Hace clic en el ícono de adjuntar (o pega una imagen del portapapeles) | Se abre el selector de archivos / se procesa el clipboard |
| 2 | Sistema | Si ya había una imagen adjunta sin enviar, pide confirmación antes de reemplazarla | Diálogo "Reemplazar imagen adjunta" — si el visitante cancela, se conserva la imagen original |
| 3 | Sistema | Valida tamaño (≤5MB), tipo MIME permitido, y magic bytes reales del archivo | Si falla cualquiera, muestra el error correspondiente y no continúa (ver `docs/INTEGRACIONES.md`) |
| 4 | Sistema | Muestra la miniatura de la imagen en el input, lista para enviar junto con texto opcional | — |
| 5 | Visitante | Escribe un caption opcional y presiona enviar | — |
| 6 | Sistema | Persiste de inmediato el mensaje de imagen con el Data URL local (para que se vea sin esperar), y el caption como mensaje de texto aparte si lo hay | El título de la conversación usa el caption si existe, en vez de "Imagen" genérico |
| 7 | Sistema | Sube la imagen a Cloudinary en segundo plano | — |
| 8 | Sistema | Reemplaza el Data URL local por la `secure_url` de Cloudinary | Evita que el base64 completo quede persistido para siempre en `localStorage` |
| 9 | Sistema | Envía el mensaje de imagen (con la URL real) al webhook de n8n | Igual que el Flujo 1 desde aquí |

**Postcondiciones:** la conversación tiene el mensaje de imagen (con URL de Cloudinary, no base64), el caption si existía, y la respuesta de Mateo.

**Casos de error:**

| Situación | Qué pasa |
|---|---|
| La subida a Cloudinary falla (red, timeout, respuesta inválida) | El mensaje de imagen se reemplaza por el texto "No se pudo enviar la imagen." (nunca se deja el base64), y aparece un mensaje de error explicando el motivo |
| Sin conexión antes de intentar subir | Mismo reemplazo, con el mensaje de error de offline |

**Casos borde:**

- Adjuntar un archivo con extensión `.jpg` pero contenido que no es realmente una imagen (ej. un PDF renombrado): se rechaza por la verificación de magic bytes, con un mensaje distinto al de "tipo no permitido".
- Adjuntar una imagen que pesa más de 5MB: se rechaza **antes** de leerla (no llega a generarse el Data URL), con el tamaño exacto mostrado en el error.

## Flujo 3 — Ver, cambiar y eliminar conversaciones del historial

**Objetivo:** el visitante retoma una conversación anterior, o limpia su historial.

**Actores:** Visitante.

**Precondiciones:** el widget está abierto.

| # | Actor | Acción | Estado del sistema |
|---|---|---|---|
| 1 | Visitante | Abre el historial (ícono de reloj en el header) | En compacto: reemplaza la vista de mensajes. En fullscreen: aparece como sidebar persistente |
| 2 | Visitante | Selecciona una conversación distinta de la lista | Se limpia cualquier imagen adjunta o borrador de texto pendiente de la conversación anterior (no se traslada por error a la nueva) |
| 3 | Visitante | (Opcional) Hace clic en el ícono de papelera de una conversación | Diálogo de confirmación "Eliminar conversación" — si confirma, se borra solo esa conversación |
| 4 | Visitante | (Opcional) Hace clic en "Borrar todo el historial" | Diálogo de confirmación — si confirma, se vacía todo el historial |

**Postcondiciones:** la conversación seleccionada se muestra como activa; si se eliminó la conversación activa, vuelve al estado de "sin conversación" (próximo mensaje crea una nueva).

**Casos borde:**

- Dos pestañas del navegador abiertas con el mismo widget: si una elimina una conversación, la otra se resincroniza automáticamente al detectar el cambio en `localStorage` (evento `storage`) — ver `docs/ARQUITECTURA.md`.
- El historial guardado es de una versión de esquema más nueva que la que el código actual conoce (ej. se volvió a una build vieja): se descarta con seguridad en vez de arriesgarse a interpretarlo mal — el visitante ve el historial vacío, no un error.

## Reglas de negocio que aplican a todos los flujos

- Ningún mensaje de error se disfraza visualmente de una respuesta real de Mateo (regla transversal, ver `docs/GLOSARIO.md` → "Mensaje de error").
- El historial es exclusivamente local a este navegador — nunca se sincroniza entre dispositivos ni se envía a ningún backend propio del widget (solo a n8n como parte del mensaje que se envía activamente).
- Cerrar el chat (no minimizar) siempre reinicia a una conversación nueva; minimizar nunca lo hace.
