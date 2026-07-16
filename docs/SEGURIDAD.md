# Seguridad — Mateo Support Widget

> Audiencia: cualquiera que necesite evaluar el widget antes de producción, o responder a un incidente. El widget adjunta un JWT de sesión de vida corta a cada llamada al webhook de n8n (POL-72), pero no emite ese token ni lo hace cumplir por sí mismo — depende de dos piezas externas (POL-71 en n8n, POL-73/Bodega de Frío V2) todavía no desplegadas. Este documento describe ese modelo y los riesgos conocidos mientras esas piezas no estén completas.

## Modelo de autenticación y autorización

El widget adjunta un JWT de vida corta (`Authorization: Bearer <jwt>`) en cada llamada al webhook de n8n, gestionado por `src/lib/authToken.ts` (POL-72). El token vive únicamente en variables de módulo — nunca en `localStorage` — con refresh proactivo (~30s antes de expirar) y reactivo (ante un 401 de n8n); si el refresh falla porque el fetcher inyectado rechaza, el manager no reintenta indefinidamente ni sirve el último token conocido, y expone el fallo vía excepción/`onAuthError` para que la UI (todavía sin construir) pueda forzar el cierre del chat.

**Esto por sí solo no cierra el riesgo.** El widget no emite el token: recibe una función "fetcher" inyectable (`configureTokenFetcher`) que debe conectarse, cuando exista, al endpoint real `POST /api/mateo/widget-token` de Bodega de Frío V2 (POL-73, sección 2.5 del plan de acción — otro repositorio, todavía no existe). Y el JWT solo protege algo si n8n lo valida antes de procesar el mensaje (POL-71, guard inline `Verificar JWT Canal Web`, en paralelo) — hasta que ambas piezas estén desplegadas, el `Authorization` header viaja pero nada lo hace cumplir del otro lado. Ver "Riesgos conocidos" abajo para el estado real mientras tanto.

## Datos sensibles

| Dato | Dónde vive | Sensibilidad |
|---|---|---|
| Historial de conversaciones (texto + imágenes) | `localStorage` del navegador del visitante | Puede contener información personal que el visitante comparta con Mateo. Local al dispositivo, nunca sale de ahí salvo lo que se envía activamente a n8n/Cloudinary. |
| Imágenes adjuntas | Se suben a Cloudinary (URL pública), y el Data URL local se descarta tan pronto se reemplaza por esa URL | Las URLs de Cloudinary son públicas por diseño de un preset *unsigned* — cualquiera con la URL puede verla, no hay control de acceso. |
| JWT de sesión del visitante | Variables de módulo en `src/lib/authToken.ts`, nunca `localStorage` | Vida corta (~5 min por diseño del emisor, sección 2.5 del plan), se pierde al recargar la página. Ya no existe el `USER_PHONE` fijo compartido por todos los visitantes que existía antes — ver "Riesgos conocidos". |

**No hay PII propia del sistema** (no se pide nombre, email ni teléfono real al visitante) — cualquier dato personal que aparezca en la conversación es el que el propio visitante decide escribirle a Mateo.

## Gestión de secretos

| Secreto/credencial | Dónde se almacena | Rotación |
|---|---|---|
| `VITE_N8N_WEBHOOK_URL` | Variable de entorno, embebida en el bundle de JavaScript (es un cliente, no hay forma de ocultarla del todo) | Rotar si el endpoint es abusado: cambiar la URL en n8n + actualizar la variable de entorno del widget. Ver `docs/VARIABLES_DE_ENTORNO.md`. |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Variable de entorno, también embebida en el bundle | No es un secreto per se (es un preset *unsigned*, diseñado para ser público) — pero si se detecta abuso (subidas masivas no deseadas), regenerar el preset en Cloudinary. |

**No hay ningún secreto commiteado en este repositorio** (no hay API keys firmadas, ni credenciales de base de datos). El JWT de sesión (ver "Modelo de autenticación" arriba) es la excepción parcial: no es un secreto de build ni vive en el bundle, se obtiene en tiempo de ejecución y solo en memoria (nunca `localStorage`), pero mientras exista es una credencial de sesión real — si se filtrara (XSS, log de proxy), permitiría enviar mensajes en nombre de ese visitante hasta que expire (~5 min por diseño, sección 2.5 del plan). El secreto HS256 que firma esos tokens vive del lado del servidor (credential store de n8n / vault de Bodega de Frío V2), nunca en este repositorio.

## Riesgos conocidos (documentados, no resueltos completamente en este repositorio)

El lado del cliente (este repositorio, POL-72) ya envía el JWT en cada llamada y ya no hay ningún identificador hardcodeado. Pero cerrar el riesgo de verdad depende de dos piezas fuera de este repositorio — **el riesgo permanece abierto en producción hasta que ambas existan**:

| Riesgo | Impacto | Estado |
|---|---|---|
| El webhook de n8n valida el JWT recién a partir de POL-71 | Hasta que ese guard esté desplegado, cualquiera que descubra la URL sigue pudiendo enviarle payloads directamente sin un `Authorization` válido — el header que manda el widget no obliga a nada por sí solo | Pendiente — POL-71, guard inline `Verificar JWT Canal Web` en n8n, en paralelo. Ver gate de secuencia: no pasa a producción hasta que POL-26 cierre. |
| El widget todavía no tiene un emisor de tokens real | `configureTokenFetcher()` (`src/lib/authToken.ts`) necesita una función real que llame a `POST /api/mateo/widget-token`; ese endpoint vive en Bodega de Frío V2 y todavía no existe | Pendiente — POL-73, spec del endpoint en sección 2.5 del plan de acción. Sin esto, no hay token real que emitir ni validar. |
| Ya no hay un identificador fijo compartido (`USER_PHONE`) — corregido en este repositorio | El backend ahora puede distinguir visitantes por el `sub` del JWT en vez de correlacionar erróneamente a todos los visitantes web como un mismo "usuario de WhatsApp" | Resuelto del lado del cliente. Requiere `web_user_id` en Supabase (POL-71, sección 2.4) para que la identidad se resuelva correctamente también del lado del servidor. |
| Plan B explícito si Bodega de Frío V2 no prioriza el endpoint emisor | Cero tolerancia: nunca se lanza a producción con el `USER_PHONE` fijo anterior | POL-71/73 quedan en DEFER si esto no se resuelve — ver sección 0 del plan de acción. |

## Vulnerabilidades corregidas (para referencia — ya resueltas)

| Vulnerabilidad | Corrección |
|---|---|
| `crypto.randomUUID()` sin protección bloqueaba el envío permanentemente en contextos no-HTTPS | Ver ADR-0004 |
| Imagen con subida fallida quedaba persistida en base64 completo en `localStorage`, agotando su cuota | Se reemplaza por un placeholder de texto corto en el `catch` de la subida (ver `docs/FLUJOS_DE_NEGOCIO.md`, Flujo 2) |
| `sendToN8n` no comprobaba `res.ok`, mostrando el cuerpo de errores HTTP como si fuera una respuesta real de Mateo | Corregido — ver `docs/INTEGRACIONES.md` |
| `secure_url` de Cloudinary se usaba sin validar que fuera una URL bien formada | Se valida con `new URL(...)` antes de usarla (`src/lib/cloudinary.ts`) |

## Consideración de XSS en el renderizado de imágenes

La URL de una imagen enviada (`message.content` cuando `type === 'image'`) puede venir de dos fuentes: un Data URL local (`FileReader.readAsDataURL`) o la `secure_url` que devuelve Cloudinary — nunca de una fuente no confiable ajena al propio flujo de subida del widget. Se asigna siempre vía atributo JSX normal (`<img src={message.content} />`), **nunca** interpolada dentro de un string de `innerHTML` — ver el comentario en `src/components/MessageBubble.tsx`.

## Checklist de seguridad antes de producción con tráfico real

- [x] El widget adjunta `Authorization: Bearer <jwt>` en cada llamada al webhook, con refresh proactivo/reactivo y sin cachear el token en `localStorage` (POL-72, `src/lib/authToken.ts`)
- [x] Ya no existe un `USER_PHONE` fijo compartido por todos los visitantes del lado del cliente
- [ ] El webhook de n8n valida ese JWT antes de procesar cualquier mensaje (POL-71, guard inline — no pasa a producción hasta que POL-26 cierre)
- [ ] Bodega de Frío V2 expone el endpoint real emisor de tokens (`POST /api/mateo/widget-token`, POL-73) y `configureTokenFetcher()` está conectado a él
- [ ] Se definió cómo el backend distingue visitantes web entre sí vía `web_user_id` en Supabase (POL-71, sección 2.4 del plan de acción)
- [ ] Se confirmaron en la consola de Cloudinary los límites reales de formato/tamaño del preset unsigned (la validación del cliente es solo una primera barrera de UX, no de seguridad — se puede saltar desde DevTools o `curl`)
- [ ] `.env.staging`/`.env.production` existen con valores propios de cada ambiente, no reutilizando los de desarrollo (ver `docs/ENTORNOS.md`)
- [ ] Se estableció una política de retención para el historial guardado en `localStorage` de los visitantes reales
- [ ] Ningún valor real de producción está commiteado en `.env.development` ni en el historial de git

## Procedimiento ante un incidente de seguridad

1. Si el incidente involucra el webhook de n8n o Cloudinary siendo abusados: rotar la URL/preset afectado (ver tabla de gestión de secretos arriba) y notificar al equipo de n8n si aplica.
2. Si el incidente involucra datos de un visitante expuestos vía `localStorage` (ej. acceso físico al dispositivo): recordar que es responsabilidad del visitante — el widget no tiene control sobre el dispositivo del usuario final; documentar el caso si revela que se necesita una política de retención más corta.
3. Documentar el incidente y su resolución en `CHANGELOG.md` bajo la sección `Security` de la próxima versión (sin exponer detalles explotables, ver la guía de documentación del equipo).
