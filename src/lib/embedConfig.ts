/**
 * Configuración de runtime inyectada por `initMateoWidget` (embed) o defaults
 * del build standalone.
 */
import type { TokenFetcher } from './authToken';

export interface EmbedRuntimeConfig {
  conversationApiBase: string | null;
  /** Token para REST conversaciones (típicamente sesión WMS). Si null, usa JWT widget. */
  conversationTokenFetcher: TokenFetcher | null;
  locale: 'es' | 'en' | null;
}

let config: EmbedRuntimeConfig = {
  conversationApiBase: null,
  conversationTokenFetcher: null,
  locale: null,
};

export function setEmbedRuntimeConfig(next: Partial<EmbedRuntimeConfig>): void {
  config = { ...config, ...next };
}

export function getEmbedRuntimeConfig(): EmbedRuntimeConfig {
  return config;
}

export function resetEmbedRuntimeConfig(): void {
  config = {
    conversationApiBase: null,
    conversationTokenFetcher: null,
    locale: null,
  };
}
