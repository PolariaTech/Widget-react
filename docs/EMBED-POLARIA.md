# Embed en Polaria WMS — Mateo Support Widget

Guía para montar el bundle embebible (`mateo-widget.js`) en **polaria-wms-web** con autenticación silenciosa (sin login propio del widget).

## Gate producción

| Pieza | Estado |
|-------|--------|
| **POL-72** (este repo) | JWT en memoria + `configureTokenFetcher` — **done** |
| **POL-73** (polaria-wms-api + host) | `POST /auth/mateo/widget-token` + `MateoWidgetHost` — **done** en código |
| **POL-71** (n8n) | Guard JWT (`iss`/`aud`/`kid` + secreto) — configurar en workflow |
| Migración `051` | Tablas `widget_*` en Supabase — **aplicada** en dev |

Ver `docs/SEGURIDAD.md`.

## Build del script

```bash
npm run build:lib
# → dist/assets/mateo-widget.js   (IIFE, window.MateoWidget)
# → dist/mateo-widget.es.js       (ES module)
```

Copiar a Polaria WMS (dev local):

```bash
copy dist\assets\mateo-widget.js ..\polaria-wms-web\public\assets\mateo-widget.js
```

En el host: `NEXT_PUBLIC_MATEO_WIDGET_SCRIPT_URL=/assets/mateo-widget.js` (reiniciar Next tras cambiar `.env`).

## Contrato del host

1. `MateoWidget.configureTokenFetcher(fn)` **antes** de `init`/`mount` (o pasar `tokenFetcher` en opciones).
2. `tokenFetcher` → `POST /auth/mateo/widget-token` → `{ token, expiresIn }` (JWT para **n8n**).
3. Historial remoto:
   - `conversationApiBase`: `'/api/mateo/conversaciones'`
   - `conversationTokenFetcher`: Bearer de **sesión WMS** (distinto del JWT widget)

### Alias de ids (importante)

Al crear una conversación remota, el id local `conv_*` se remapea a **UUID**.  
`addMessage` / `replaceMessage` resuelven ese alias para que la respuesta de n8n se pinte en el mismo hilo y no genere otra conversación en BD.

## Snippet — host React (polaria-wms-web)

Implementación real: `MateoWidgetHost` en el shell autenticado.

```ts
api.configureTokenFetcher(() =>
  apiRequest('/auth/mateo/widget-token', { method: 'POST', auth: true }),
);
await api.mount(containerEl, {
  conversationApiBase: '/api/mateo/conversaciones',
  conversationTokenFetcher: async () => ({
    token: accessTokenWms,
    expiresIn: 3600,
  }),
  onAuthError: () => {
    /* toast host; no logout del shell */
  },
});
```

## Shadow DOM

React dentro de shadow root + Tailwind inline (ADR-0001). SweetAlert2 en `document.body`.

## localStorage

Solo mirror/cache. Con `conversationApiBase`, la fuente de verdad es Nest + tablas Supabase.  
Si falla el `GET` remoto, el widget **no** rehidrata ids `conv_*` del cache (evitarían 400 en `/:id/mensajes`).

## Docs cruzadas

- polaria-wms-web: `docs/MATEO-WIDGET.md`
- polaria-wms-api: `docs/MATEO-INTEGRATION.md`
- polaria-wms-db: `docs/WIDGET-MATEO-CONVERSACIONES.md`
