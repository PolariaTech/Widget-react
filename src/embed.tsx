/**
 * embed.ts — API pública para embeber Mateo Support en un host (Polaria WMS).
 *
 * Build lib (IIFE): `window.MateoWidget` / ES: named exports.
 * El host puede llamar `configureTokenFetcher` antes de `init`/`mount`, o
 * pasar `tokenFetcher` en las opciones.
 */
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import widgetStyles from './index.css?inline';
import swalStyles from './swalTheme.css?inline';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  configureTokenFetcher,
  isTokenFetcherConfigured,
  onAuthError,
  type TokenAuthError,
  type TokenFetcher,
} from './lib/authToken';
import { setEmbedRuntimeConfig, resetEmbedRuntimeConfig } from './lib/embedConfig';
import { closeChatFromHost } from './lib/widgetHostBridge';
import { setLocale, type Locale } from './i18n';

export type {
  TokenFetcher,
  TokenFetchResult,
  TokenAuthError,
} from './lib/authToken';
export { configureTokenFetcher, onAuthError, isTokenFetcherConfigured } from './lib/authToken';

function ensureHostSwalStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('mateo-swal-theme')) return;
  const el = document.createElement('style');
  el.id = 'mateo-swal-theme';
  el.textContent = swalStyles;
  document.head.appendChild(el);
}

export interface InitMateoWidgetOptions {
  container: HTMLElement;
  /** Emisor de JWT widget (n8n). Opcional si ya se llamó `configureTokenFetcher`. */
  tokenFetcher?: TokenFetcher;
  locale?: Locale;
  onAuthError?: (err: TokenAuthError) => void;
  /** Base REST conversaciones, ej. `/api/mateo/conversaciones`. */
  conversationApiBase?: string;
  /**
   * Bearer para REST conversaciones (sesión WMS / Supabase).
   * Si se omite, se reutiliza el JWT del widget (solo válido si el API lo acepta).
   */
  conversationTokenFetcher?: TokenFetcher;
}

export interface MateoWidgetHandle {
  unmount: () => void;
  close: () => void;
}

interface MountInstance {
  root: Root;
  host: HTMLElement;
  shadowRoot: ShadowRoot;
  unsubscribeAuth?: () => void;
}

let active: MountInstance | null = null;

function mountReactIntoShadow(container: HTMLElement): MountInstance {
  ensureHostSwalStyles();

  // Reutilizar shadow si el host ya lo tiene (re-mount)
  const shadowRoot =
    container.shadowRoot ?? container.attachShadow({ mode: 'open' });

  shadowRoot.innerHTML = '';

  const styleEl = document.createElement('style');
  styleEl.textContent = widgetStyles;
  shadowRoot.appendChild(styleEl);

  const reactMount = document.createElement('div');
  shadowRoot.appendChild(reactMount);

  const root = createRoot(reactMount);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );

  return { root, host: container, shadowRoot };
}

/**
 * Monta el widget en `container` (Shadow DOM + Tailwind inline, ADR-0001).
 */
export function initMateoWidget(options: InitMateoWidgetOptions): MateoWidgetHandle {
  if (options.tokenFetcher) {
    configureTokenFetcher(options.tokenFetcher);
  } else if (!isTokenFetcherConfigured()) {
    throw new Error(
      'initMateoWidget: pasa tokenFetcher o llama configureTokenFetcher() antes.',
    );
  }

  if (options.locale) {
    setLocale(options.locale);
  }

  setEmbedRuntimeConfig({
    conversationApiBase: options.conversationApiBase ?? null,
    conversationTokenFetcher: options.conversationTokenFetcher ?? null,
    locale: options.locale ?? null,
  });

  if (active) {
    active.unsubscribeAuth?.();
    active.root.unmount();
    active = null;
  }

  const instance = mountReactIntoShadow(options.container);

  const hostAuth = options.onAuthError;
  const unsubscribeAuth = hostAuth
    ? onAuthError((err) => {
        closeChatFromHost();
        hostAuth(err);
      })
    : undefined;

  active = { ...instance, unsubscribeAuth };

  return {
    unmount: () => unmountMateoWidget(),
    close: () => closeMateoWidget(),
  };
}

/** Alias compatible con hosts que hacen configureTokenFetcher + mount. */
export function mount(
  container: HTMLElement,
  options?: Omit<InitMateoWidgetOptions, 'container' | 'tokenFetcher'> & {
    tokenFetcher?: TokenFetcher;
  },
): MateoWidgetHandle {
  return initMateoWidget({
    container,
    ...options,
  });
}

export function unmountMateoWidget(_container?: HTMLElement): void {
  if (!active) return;
  active.unsubscribeAuth?.();
  active.root.unmount();
  active.shadowRoot.innerHTML = '';
  active = null;
  resetEmbedRuntimeConfig();
}

export function closeMateoWidget(): void {
  closeChatFromHost();
}

export const MateoWidget = {
  init: initMateoWidget,
  mount,
  unmount: unmountMateoWidget,
  close: closeMateoWidget,
  configureTokenFetcher,
  onAuthError,
};

declare global {
  interface Window {
    MateoWidget?: typeof MateoWidget;
  }
}

if (typeof window !== 'undefined') {
  window.MateoWidget = MateoWidget;
}
