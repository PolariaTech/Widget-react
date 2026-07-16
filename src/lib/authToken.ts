/**
 * authToken.ts — Token manager en memoria para el JWT de autenticación del
 * canal web (POL-72, ver `borradores/PLAN_ACCION_WIDGET_POL-70-71-72-73.md`
 * secciones 2.3/2.5/3).
 *
 * El JWT SOLO vive en variables de módulo, nunca en `localStorage` — mismo
 * invariante que ya sigue el historial de conversaciones para no persistir
 * nada sensible (ver storage.ts / docs/SEGURIDAD.md). Recargar la página
 * pierde el token; eso es lo esperado, fuerza un fetch fresco contra el
 * emisor real.
 *
 * El endpoint real que emite estos tokens (`POST /api/mateo/widget-token` en
 * Bodega de Frío V2, sección 2.5 del plan) vive en otro repositorio y todavía
 * no existe. Este módulo nunca hardcodea su URL ni sabe nada de sesiones de
 * Bodega de Frío: recibe un "fetcher" inyectable — quien integre el widget
 * ahí (POL-73) provee la función real vía `configureTokenFetcher()`.
 */

/** Resultado de pedir un token nuevo al fetcher inyectado. `expiresIn` en segundos, igual que la respuesta documentada del endpoint real (`{ token, expiresIn }`, sección 2.5 del plan). */
export interface TokenFetchResult {
  token: string;
  expiresIn: number;
}

/** Función inyectable que obtiene un JWT nuevo. Nunca provista por este módulo — ver nota de archivo. */
export type TokenFetcher = () => Promise<TokenFetchResult>;

/**
 * Se lanza cuando no hay forma de obtener un token válido: no hay fetcher
 * configurado, o el fetcher inyectado rechazó (ej. la sesión de Bodega de
 * Frío V2 ya no es válida). Nunca se reintenta automáticamente tras esto —
 * ver `onAuthError` y el comentario "HOOK" más abajo.
 */
export class TokenAuthError extends Error {
  /** Error original que causó el fallo (ej. la excepción que lanzó el fetcher inyectado), si lo hay. */
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'TokenAuthError';
    this.cause = cause;
  }
}

/** Margen de refresh proactivo: se pide un token nuevo este tiempo antes de que expire el actual, para que nunca haya un mensaje saliente compitiendo con la expiración. */
const PROACTIVE_REFRESH_MARGIN_MS = 30_000;

let fetcher: TokenFetcher | null = null;
let currentToken: string | null = null;
let expiresAt: number | null = null; // epoch ms
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightRefresh: Promise<string> | null = null;

/**
 * `true` tras el último intento de refresh fallido (fetcher ausente o
 * rechazado). Mientras esté en este estado, `getValidToken`/`forceRefresh`/
 * `refreshToken` fallan de inmediato sin volver a invocar el fetcher — así
 * se cumple "no reintentar indefinidamente": el manager nunca reintenta por
 * su cuenta, solo un nuevo `configureTokenFetcher()` (ej. tras un re-login
 * futuro) limpia este estado.
 */
let erroredOut = false;

const authErrorListeners = new Set<(error: TokenAuthError) => void>();

/**
 * Inyecta (o reemplaza) la función que obtiene un token nuevo. Se llama antes
 * de enviar el primer mensaje del canal web, y también sirve para
 * "recuperarse" de un estado de error previo.
 */
export function configureTokenFetcher(newFetcher: TokenFetcher): void {
  fetcher = newFetcher;
  erroredOut = false;
}

/**
 * Suscribe un listener a fallos de autenticación irrecuperables (fetcher
 * ausente o rechazado). Devuelve una función para desuscribirse.
 *
 * HOOK PARA UI FUTURA: acá es donde, cuando exista una UI de login del
 * widget, se debe enganchar el forzado de cierre de chat / re-login.
 */
export function onAuthError(listener: (error: TokenAuthError) => void): () => void {
  authErrorListeners.add(listener);
  return () => authErrorListeners.delete(listener);
}

function clearProactiveTimer(): void {
  if (proactiveTimer !== null) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

function notifyAuthError(error: TokenAuthError): void {
  for (const listener of authErrorListeners) listener(error);
}

/** Limpia todo estado de token vigente. Nunca se sirve un token cacheado tras un fallo de refresh. */
function clearToken(): void {
  currentToken = null;
  expiresAt = null;
  clearProactiveTimer();
}

function scheduleProactiveRefresh(): void {
  clearProactiveTimer();
  if (expiresAt === null) return;
  const delay = Math.max(0, expiresAt - Date.now() - PROACTIVE_REFRESH_MARGIN_MS);
  proactiveTimer = setTimeout(() => {
    // Refresh proactivo "en segundo plano": nadie espera esta promesa
    // directamente. Si falla, el error ya se propagó vía `onAuthError`
    // dentro de `refreshToken` — acá solo evitamos un unhandled rejection.
    void refreshToken().catch(() => {});
  }, delay);
}

/**
 * Pide un token nuevo al fetcher inyectado. Es el único camino que realmente
 * llama al fetcher — el refresh inicial, el proactivo y el reactivo (ante un
 * 401) pasan todos por acá. Deduplica llamadas concurrentes: si ya hay un
 * refresh en vuelo, todos los llamadores esperan la misma promesa en vez de
 * disparar fetchers en paralelo.
 *
 * @throws {TokenAuthError} Si no hay fetcher configurado, si el manager ya
 *   quedó en estado de error tras un fallo previo, o si el fetcher rechaza.
 */
export function refreshToken(): Promise<string> {
  if (inFlightRefresh) return inFlightRefresh;

  if (erroredOut) {
    const error = new TokenAuthError(
      'El token manager quedó en estado de error; requiere configureTokenFetcher() de nuevo antes de reintentar.',
    );
    notifyAuthError(error);
    return Promise.reject(error);
  }

  if (!fetcher) {
    const error = new TokenAuthError('No hay un token fetcher configurado (configureTokenFetcher nunca fue llamado).');
    erroredOut = true;
    clearToken();
    notifyAuthError(error);
    return Promise.reject(error);
  }

  const activeFetcher = fetcher;
  inFlightRefresh = (async () => {
    try {
      const result = await activeFetcher();
      currentToken = result.token;
      expiresAt = Date.now() + result.expiresIn * 1000;
      scheduleProactiveRefresh();
      return currentToken;
    } catch (err) {
      erroredOut = true;
      clearToken();
      const authError = new TokenAuthError(err instanceof Error ? err.message : 'El fetcher de token rechazó sin mensaje.', err);
      notifyAuthError(authError);
      throw authError;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

/** Fuerza un refresh ignorando el token actual en memoria — camino reactivo ante un 401 de `sendToN8n` (ver webhook.ts). */
export function forceRefresh(): Promise<string> {
  clearToken();
  return refreshToken();
}

/** Devuelve un token válido: el actual en memoria si no está por expirar, o dispara un refresh si no hay uno vigente. */
export function getValidToken(): Promise<string> {
  if (currentToken && expiresAt !== null && Date.now() < expiresAt) {
    return Promise.resolve(currentToken);
  }
  return refreshToken();
}

/** Solo para tests: limpia todo el estado del módulo entre casos (el token vive en variables de módulo, no en una instancia). */
export function __resetTokenManagerForTests(): void {
  fetcher = null;
  currentToken = null;
  expiresAt = null;
  clearProactiveTimer();
  inFlightRefresh = null;
  erroredOut = false;
  authErrorListeners.clear();
}
