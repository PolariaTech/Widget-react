# Seguridad — Mateo Support Widget

> Audiencia: evaluar el widget antes de producción o responder a un incidente.

## Modelo de autenticación

El widget adjunta un JWT de vida corta (`Authorization: Bearer <jwt>`) en cada llamada al webhook de n8n (`src/lib/authToken.ts`, **POL-72**). El token vive solo en memoria (nunca `localStorage`), con refresh proactivo (~30s antes de `exp`) y reactivo ante 401; si el refresh falla, `onAuthError` cierra el chat y muestra `webhookAuthError`.

| Pieza | Responsable | Estado |
|-------|-------------|--------|
| Cliente JWT + fetcher | Widget-react (POL-72) | **Done** |
| Emisor `POST /auth/mateo/widget-token` | polaria-wms-api (POL-73) | **Done** (código + host) |
| Validación en webhook | n8n (POL-71) | Configurar secreto/`iss`/`aud`/`kid` en el workflow |
| Historial remoto | Nest `/mateo/conversaciones` + tablas `widget_*` | Migración 051 + RLS 052 (POL-138) |

### Claims del JWT (contrato n8n)

| Claim / header | Valor default |
|----------------|---------------|
| `alg` | HS256 |
| `kid` | `local-dev-v1` (`MATEO_WIDGET_JWT_KID`) |
| `iss` | `bodega-frio-v2` |
| `aud` | `mateo-support-widget` |
| `sub` | `usuario.id_auth` |
| TTL | 300 s |

Secreto: `MATEO_WIDGET_JWT_SECRET` en el API = credential store de n8n.

### Cierre POL-137

Identificación segura del chat embebido (sin sesión anónima / sin montar a ciegas):

| Escenario | Comportamiento |
|-----------|----------------|
| Montar sin tokenFetcher | `initMateoWidget` lanza error |
| Fetcher rechaza sesión | `TokenAuthError` + `onAuthError` |
| Historial REST | Bearer WMS vía `conversationTokenFetcher` del host Polaria |
| JWT widget | solo memoria, nunca `localStorage` |

Tests: `src/embed.test.ts`, `src/lib/authToken.test.ts`, `src/lib/conversationApi.test.ts`

## Datos sensibles

| Dato | Dónde vive |
|------|------------|
| Historial (texto + URLs imagen) | API WMS + Supabase `widget_*` en embed; `localStorage` solo mirror |
| JWT widget | Memoria del tab (~5 min) |
| URL webhook n8n | Bundle / env (`VITE_N8N_WEBHOOK_URL`) |

No hay PII de sistema pedida al visitante; lo que escriba en el chat es su responsabilidad.

## Checklist pre-producción

- [x] POL-72: Bearer en cada POST a n8n, sin token en `localStorage`
- [x] Build IIFE + Shadow DOM + `onAuthError`
- [x] POL-73: emisor widget-token + host `MateoWidgetHost`
- [x] Tablas `widget_conversacion` / `widget_mensaje` (+ `resolve_web_user`)
- [ ] POL-71: n8n valida JWT (secreto + iss/aud/kid) en **todos** los entornos
- [ ] CDN estable del IIFE en producción (no depender de copia manual a `public/`)

## Incidentes

1. Abuso del webhook: rotar URL n8n + `VITE_N8N_WEBHOOK_URL` / rebuild.
2. JWT filtrado: TTL corto; rotar `MATEO_WIDGET_JWT_SECRET` en API y n8n a la vez.
3. Escrituras Supabase desde n8n: usar **service_role** o Nest; no anon + RLS a ciegas.
