# Integraciones externas — Mateo Support Widget

> Audiencia: cualquier persona (interna o externa) que necesite entender o probar cómo el widget habla con el webhook de n8n o con Cloudinary, sin necesidad de leer el código fuente. Este widget no expone ninguna API propia — solo consume las dos de abajo — así que este documento reemplaza a una spec OpenAPI tradicional.

## 1. Webhook de n8n (Mateo)

### Qué es

El widget le envía cada mensaje del usuario al mismo workflow de n8n que atiende Mateo en WhatsApp Business, imitando la forma real del webhook de la **WhatsApp Business Cloud API**. El campo `messaging_product: "web"` es lo que le permite al workflow distinguir estos mensajes de los de WhatsApp real. **No cambiar esta forma de payload sin verificar primero con el workflow de n8n** (`src/lib/webhook.ts`).

| Campo | Valor |
|---|---|
| Endpoint | `VITE_N8N_WEBHOOK_URL` (ver `docs/VARIABLES_DE_ENTORNO.md`) — hoy en dev: `https://polariatech.app.n8n.cloud/webhook/test-mateo-support` |
| Método | `POST` |
| Autenticación | **Ninguna hoy** — ver `docs/SEGURIDAD.md`, es un riesgo conocido pendiente de coordinar con el equipo de n8n |
| Content-Type | `application/json` |
| Timeout del cliente | 120000 ms (`FETCH_TIMEOUT_MS` en `config.ts`) — si no responde en ese tiempo, el request se aborta |

### Request — mensaje de texto

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messaging_product": "web",
            "metadata": { "phone_number_id": "1104260132766227" },
            "messages": [
              {
                "from": "573006188395",
                "id": "wamid.md3k9x2ap8xzf1q",
                "type": "text",
                "text": { "body": "¿Cómo descongelo la cámara 2?" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

- `from`: `USER_PHONE` — número fijo compartido por **todos** los visitantes web (no es un canal de WhatsApp real, ver `docs/SEGURIDAD.md` sobre el riesgo de identidad cruzada).
- `id`: un `wamid.*` generado localmente con `Date.now().toString(36) + Math.random().toString(36)` — no usa `crypto.randomUUID()` (ver ADR-0004). Es un identificador de correlación, no un secreto.

### Request — mensaje de imagen (con o sin caption)

```json
{
  "entry": [{ "changes": [{ "value": {
    "messaging_product": "web",
    "metadata": { "phone_number_id": "1104260132766227" },
    "messages": [
      {
        "from": "573006188395",
        "id": "wamid.md3k9y7bq2xzf1q",
        "type": "image",
        "image": {
          "url": "https://res.cloudinary.com/ujssaxx6/image/upload/v1234567890/abc123.jpg",
          "caption": "Así se ve la fuga"
        }
      }
    ]
  } }] }]
}
```

`image.url` es siempre la `secure_url` que devolvió Cloudinary (nunca el Data URL local) — ver la sección 2 de este documento sobre cómo llega a existir esa URL antes de este request.

### Respuesta esperada — 200 OK

El widget acepta **dos formas** de respuesta 200 con `Content-Type` JSON:

```json
{ "output": "Para descongelar la cámara 2, primero baja la temperatura de setpoint a -5°C..." }
```

También acepta `{ "reply": "..." }` o `{ "text": "..." }` en vez de `output` (se prueban en ese orden). Si el body no es JSON válido, se muestra el texto plano tal cual (útil si n8n responde solo texto).

### Respuestas de error — cómo las interpreta el widget

| Situación | Qué ve el usuario | `isError` |
|---|---|---|
| Respuesta HTTP no-2xx (`res.ok === false`) | "Error al conectar con el servidor." | `true` |
| Timeout (120s sin respuesta) o fallo de red (`fetch` lanza excepción) | "Error al conectar con el servidor." | `true` |
| Respuesta 200 pero JSON sin `output`/`reply`/`text` como string (ej. array, objeto vacío) | "Recibí una respuesta con un formato inesperado." | `true` |
| Respuesta 200 con `output`/`reply`/`text` string | El texto de Mateo, normal | `false` |

Los mensajes con `isError: true` se renderizan con un estilo visualmente distinto (fondo rojo tenue + ícono de advertencia) — nunca se disfrazan de una respuesta real de Mateo. Ver `docs/FLUJOS_DE_NEGOCIO.md`.

### Probarlo manualmente

```bash
curl -X POST "https://polariatech.app.n8n.cloud/webhook/test-mateo-support" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{ "changes": [{ "value": {
      "messaging_product": "web",
      "metadata": { "phone_number_id": "1104260132766227" },
      "messages": [{ "from": "573006188395", "id": "wamid.test123", "type": "text", "text": { "body": "prueba manual" } }]
    } }] }]
  }'
```

Resultado esperado: `200 OK` con un JSON `{ "output": "..." }` (o equivalente) en menos de ~10 segundos en el caso normal.

## 2. Cloudinary (subida de imágenes)

### Qué es

Cuando el usuario adjunta una imagen, el widget la sube directo desde el navegador a Cloudinary usando un **unsigned upload** (sin pasar por ningún backend propio), y usa la `secure_url` que devuelve para construir el mensaje de imagen de la sección 1.

| Campo | Valor |
|---|---|
| Endpoint | `https://api.cloudinary.com/v1_1/{VITE_CLOUDINARY_CLOUD_NAME}/image/upload` |
| Método | `POST`, `multipart/form-data` |
| Autenticación | Ninguna — preset *unsigned* (`VITE_CLOUDINARY_UPLOAD_PRESET`), confía en la validación del lado del cliente + lo que esté configurado en el preset (ver `docs/SEGURIDAD.md`) |
| Timeout del cliente | 120000 ms, mismo `fetchWithTimeout` que el webhook (`src/lib/http.ts`) |

### Validaciones del lado del cliente antes de subir (`src/lib/cloudinary.ts` → `validateImage`)

| Validación | Límite | Dónde se aplica primero |
|---|---|---|
| Tipo MIME permitido | `image/jpeg`, `image/png`, `image/webp` | Al seleccionar el archivo (`InputFooter.tsx`), antes de leerlo |
| Tamaño máximo | 5 MB (`IMAGE_VALIDATION.MAX_FILE_SIZE`) | Al seleccionar el archivo, antes de leerlo — evita cargar un Data URL enorme en memoria innecesariamente |
| Firma de contenido (magic bytes) | Debe coincidir con JPEG/PNG/WebP real, no solo la extensión | Después de leer los primeros bytes (`fileSignature.ts`) — detecta un PDF renombrado a `.jpg` |

**Estas validaciones son de UX, no de seguridad real** — un preset unsigned se puede saltar fácilmente desde DevTools o `curl`. La restricción real de formato/tamaño debe vivir en la consola de Cloudinary, sobre el propio upload preset (pendiente de confirmar — ver `docs/SEGURIDAD.md`).

### Request

```
POST https://api.cloudinary.com/v1_1/ujssaxx6/image/upload
Content-Type: multipart/form-data

file=data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...
upload_preset=mateo_test_unsigned
```

### Respuesta esperada — 200 OK

```json
{
  "secure_url": "https://res.cloudinary.com/ujssaxx6/image/upload/v1234567890/abc123.jpg",
  "public_id": "abc123",
  "format": "jpg",
  "bytes": 482913
}
```

El widget solo usa `secure_url`, y la valida como una URL bien formada (`new URL(...)`, no solo que exista) antes de usarla — si Cloudinary devolviera un `secure_url` corrupto, el widget lo trata como error en vez de intentar renderizar una imagen rota.

### Respuestas de error

| Situación | Mensaje mostrado al usuario |
|---|---|
| Cloudinary responde no-2xx | "Cloudinary respondió con error {status}: {cuerpo, primeros 200 caracteres}", envuelto en "No se pudo subir la imagen a Cloudinary: ..." |
| Respuesta 200 sin `secure_url` (o no es una URL válida) | "Respuesta de Cloudinary no contiene secure_url" |
| Timeout / fallo de red | "La solicitud tardó demasiado y fue cancelada. Intenta de nuevo." |

Cuando la subida falla, el widget **reemplaza** el Data URL local del mensaje de imagen (que se mostraba de inmediato, de forma optimista) por un placeholder de texto corto ("No se pudo enviar la imagen.") — nunca deja el base64 completo (hasta ~6.7MB para una imagen de 5MB) persistido en `localStorage`. Ver ADR relacionado y `docs/FLUJOS_DE_NEGOCIO.md`.

### Probarlo manualmente

```bash
curl -X POST "https://api.cloudinary.com/v1_1/ujssaxx6/image/upload" \
  -F "file=@/ruta/a/una/imagen.jpg" \
  -F "upload_preset=mateo_test_unsigned"
```

Resultado esperado: `200 OK` con JSON que incluye `secure_url`.
