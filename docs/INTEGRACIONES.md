# Integraciones externas — Mateo Support Widget

> Audiencia: cualquiera que necesite entender o probar cómo el widget habla con n8n o Cloudinary. Este widget no expone OpenAPI propia — consume las APIs de abajo.

## 1. Webhook de n8n (Mateo)

### Qué es

El widget envía cada mensaje del usuario al workflow de n8n del canal web con un **body plano** (ya no imita el envelope de WhatsApp Business). La autenticación va en `Authorization: Bearer <jwt>` (POL-72). n8n debe validar ese JWT (POL-71) antes de procesar.

| Campo | Valor |
|---|---|
| Endpoint | `VITE_N8N_WEBHOOK_URL` (ver `docs/VARIABLES_DE_ENTORNO.md`) |
| Método | `POST` |
| Autenticación | `Authorization: Bearer <jwt>` — JWT emitido por `POST /auth/mateo/widget-token` (POL-73). n8n valida secreto + `iss`/`aud`/`kid` (POL-71). |
| Content-Type | `application/json` |
| Timeout del cliente | 120000 ms (`FETCH_TIMEOUT_MS` en `config.ts`) |

### Request — mensaje de texto

```json
{
  "message_text": "¿Cómo descongelo la cámara 2?",
  "message_type": "text"
}
```

### Request — mensaje de imagen

```json
{
  "message_text": "https://res.cloudinary.com/.../abc123.jpg",
  "message_type": "image"
}
```

`message_text` en imágenes es la `secure_url` de Cloudinary (nunca el Data URL local). Caption e imagen se envían como dos POSTs secuenciales si el usuario escribió texto junto a la imagen.

### Respuesta esperada — 200 OK

El widget acepta JSON:

```json
{ "output": "Para descongelar la cámara 2..." }
```

También `{ "reply": "..." }` o `{ "text": "..." }` (en ese orden). Si el body no es JSON, usa el texto plano.

### Errores

| Situación | Qué ve el usuario | `isError` |
|---|---|---|
| No hay token / fetcher falló / 401 tras refresh | `webhookAuthError` (cierra chat vía `onAuthError`) | `true` |
| HTTP no-2xx (distinto de auth) | `webhookConnectionError` | `true` |
| Timeout / red | `webhookConnectionError` | `true` |
| 200 sin `output`/`reply`/`text` string | `webhookUnexpectedReply` | `true` |

### Probarlo manualmente

```bash
curl -X POST "$VITE_N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <widget_jwt>" \
  -d '{"message_text":"prueba manual","message_type":"text"}'
```

## 2. Cloudinary (subida de imágenes)

### Qué es

Unsigned upload desde el navegador; la `secure_url` alimenta el `message_type: "image"` de la sección 1.

| Campo | Valor |
|---|---|
| Endpoint | `https://api.cloudinary.com/v1_1/{VITE_CLOUDINARY_CLOUD_NAME}/image/upload` |
| Método | `POST`, `multipart/form-data` |
| Autenticación | Preset *unsigned* (`VITE_CLOUDINARY_UPLOAD_PRESET`) |
| Timeout | 120000 ms |

### Validaciones cliente (`validateImage`)

| Validación | Límite |
|---|---|
| MIME | `image/jpeg`, `image/png`, `image/webp` |
| Tamaño | 5 MB |
| Magic bytes | Debe coincidir con el tipo real |

Son de UX, no de seguridad real — el preset en consola Cloudinary debe restringir formato/tamaño (ver `docs/SEGURIDAD.md`).

### Request

```
POST https://api.cloudinary.com/v1_1/{cloud}/image/upload
Content-Type: multipart/form-data

file=data:image/jpeg;base64,...
upload_preset={preset}
```

### Respuesta

Usa solo `secure_url` validada con `new URL(...)`.

## 3. API conversaciones (Polaria WMS)

En embed Polaria: `conversationApiBase` → CRUD `/mateo/conversaciones` (tablas `widget_*`).

| Campo | Valor |
|-------|--------|
| Base | p. ej. `/api/mateo/conversaciones` (proxy Next → Nest) |
| Auth | Bearer **sesión WMS** (`conversationTokenFetcher`) — **no** el JWT de n8n |
| Create | `POST /` body `{ titulo? }` → detalle con `idConversacion` UUID |
| Append | `POST /:id/mensajes` — `:id` **debe ser UUID** |
| List / detail / delete | `GET /`, `GET /:id`, `DELETE /:id` |

Body append:

```json
{
  "rol": "user",
  "tipo": "text",
  "contenido": "Hola",
  "esError": false,
  "createdAt": "2026-07-16T17:45:00.000Z"
}
```

### Race id local → UUID

El widget crea primero un id `conv_*` y luego remapea al UUID del servidor.  
`addMessage` resuelve el alias; sin eso, la respuesta de Mateo no se pinta y el sync puede crear **otra** conversación. Ver `docs/EMBED-POLARIA.md`.

Docs: `docs/EMBED-POLARIA.md`, polaria-wms-api `docs/MATEO-INTEGRATION.md`, polaria-wms-db `docs/WIDGET-MATEO-CONVERSACIONES.md`.

