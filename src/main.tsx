/**
 * Entrada standalone (dev / preview). Delega en `initMateoWidget` sin token
 * real — en demo local el fetcher se configura solo si hay uno en window.
 * Para pruebas de chat hace falta un fetcher mock o el embed desde Polaria.
 */
import {
  configureTokenFetcher,
  isTokenFetcherConfigured,
} from './lib/authToken';
import { initMateoWidget } from './embed.tsx';

const host = document.getElementById('root');
if (!host) {
  throw new Error('No se encontró #root');
}

// Demo local: fetcher stub para no romper al abrir (n8n fallará auth hasta
// configurar uno real). En embed Polaria el host inyecta el fetcher real.
if (!isTokenFetcherConfigured()) {
  configureTokenFetcher(async () => {
    throw new Error(
      'Demo standalone: configura un tokenFetcher real (ver docs/EMBED-POLARIA.md).',
    );
  });
}

initMateoWidget({ container: host, locale: 'es' });
