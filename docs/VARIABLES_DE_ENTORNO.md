# Variables de entorno — Mateo Support Widget

> Audiencia: cualquier persona que necesite configurar el widget en un ambiente nuevo (dev/staging/producción) sin tener que leer `config.ts`.

Todas las variables usan el prefijo `VITE_` porque Vite solo expone al código del cliente las variables que empiezan así — es una regla de seguridad del propio framework, no una convención opcional de este proyecto. Ver `docs/ENTORNOS.md` para qué archivo `.env.*` corresponde a cada ambiente.

## Tabla completa

| Variable | Tipo | Requerida | Default (dev) | Dónde obtenerla | Impacto si falta o es incorrecta |
|---|---|---|---|---|---|
| `VITE_N8N_WEBHOOK_URL` | URL | Sí | `https://polariatech.app.n8n.cloud/webhook/test-mateo-support` | Consola de n8n → workflow "Mateo Support" → nodo Webhook → URL de producción/test | El widget carga normalmente, pero cada mensaje enviado responde "Error al conectar con el servidor." (timeout a los 120s si la URL no existe, o error inmediato si responde 404/500). |
| `VITE_PHONE_NUMBER_ID` | String (numérico) | Sí | `1104260132766227` | Debe coincidir exactamente con el `phone_number_id` que el workflow de n8n espera recibir en `metadata.phone_number_id` | Si no coincide con lo que n8n espera, el workflow puede rechazar el mensaje o enrutarlo mal — coordinar con el equipo de n8n antes de cambiarlo. |
| `VITE_CLOUDINARY_CLOUD_NAME` | String | Sí (si se usan imágenes) | `ujssaxx6` | Cloudinary → Dashboard → "Cloud name" (arriba a la izquierda) | Sin ella (o con un valor incorrecto), cualquier intento de adjuntar imagen falla con "No se pudo subir la imagen a Cloudinary". El chat de texto sigue funcionando normalmente. |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | String | Sí (si se usan imágenes) | `mateo_test_unsigned` | Cloudinary → Settings → Upload → Upload presets → debe ser un preset marcado **Unsigned** | Mismo impacto que `CLOUDINARY_CLOUD_NAME`: falla la subida de imágenes con error de Cloudinary. |

### No es una variable de entorno (a propósito)

| Constante | Por qué no está en `import.meta.env` |
|---|---|
| `USER_PHONE` (`config.ts`) | Número de teléfono simulado que figura como remitente de todos los mensajes web. No es específico de ambiente — el mismo valor sirve en dev/staging/prod, así que mantenerlo como constante hardcodeada evita una variable más que configurar sin ganar nada a cambio. Ver `docs/SEGURIDAD.md` sobre el riesgo de que sea un valor fijo compartido. |

## Clasificación

Ninguna de las 4 variables de arriba es secreta hoy:

- El webhook de n8n **no tiene autenticación** — la URL en sí no otorga ningún privilegio que no tenga ya cualquiera que la descubra inspeccionando el tráfico de red del widget (es visible en el bundle de JavaScript de todas formas, al ser una app de cliente).
- El preset de Cloudinary es **unsigned por diseño** — confía en la validación del lado del cliente, nunca debería tratarse como si otorgara acceso privilegiado.

Esto **no significa que no importe protegerlas** — ver el checklist de `docs/SEGURIDAD.md` antes de ir a producción con tráfico real.

## Archivos de entorno

| Archivo | Contenido | ¿Se versiona? |
|---|---|---|
| `.env.development` | Valores de desarrollo (los mismos 4 de la tabla de arriba). | **Sí** — no son secretos, y así `npm run dev`/`npm run build` funcionan out-of-the-box para cualquiera que clone el repo. |
| `.env.example` | Plantilla documentada con los 4 nombres de variable, sin valores. | Sí — es la referencia para crear `.env.staging`/`.env.production`. |
| `.env.staging` | Valores reales de staging. | **No** — falta crearlo cuando el equipo tenga las credenciales de staging. |
| `.env.production` | Valores reales de producción. | **No** — falta crearlo cuando el equipo tenga las credenciales de producción. |

`.gitignore` excluye `.env`, `.env.staging`, `.env.production` y `.env.*.local`, dejando pasar únicamente `.env.development` y `.env.example`.

## Cómo se leen en el código

`src/config.ts` lee cada variable con un fallback al valor de desarrollo:

```ts
export const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL ?? 'https://polariatech.app.n8n.cloud/webhook/test-mateo-support';
```

El fallback existe **solo** para que `npm run dev`/`npm run build` no se rompan mientras `.env.staging`/`.env.production` no existan todavía — una vez que ese archivo exista con los valores reales de ese ambiente, Vite los carga automáticamente según `--mode` y el fallback nunca se activa.

`src/vite-env.d.ts` declara el tipo de cada variable explícitamente (`ImportMetaEnv`), en modo estricto (`ViteTypeOptions.strictImportMetaEnv`) — si agregas una variable nueva en `config.ts` sin declararla ahí primero, TypeScript no compila. Esto evita el `any` implícito que Vite usaría por defecto.

## Cómo agregar una variable nueva

1. Agrégala a `src/vite-env.d.ts` dentro de `interface ImportMetaEnv`.
2. Léela en `src/config.ts` con `import.meta.env.VITE_TU_VARIABLE ?? 'valor-default-de-dev'`.
3. Agrégala a `.env.development` (con el valor real de dev) y a `.env.example` (documentada, sin valor).
4. Documéntala en la tabla de este archivo.
5. Avisa al equipo si `.env.staging`/`.env.production` ya existen — necesitan el valor real de esa variable para ese ambiente.
