import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetTokenManagerForTests,
  TokenAuthError,
} from './authToken';
import {
  resetEmbedRuntimeConfig,
  setEmbedRuntimeConfig,
} from './embedConfig';
import { RemoteConversationRepository } from './conversationApi';

describe('RemoteConversationRepository — auth POL-137', () => {
  beforeEach(() => {
    __resetTokenManagerForTests();
    resetEmbedRuntimeConfig();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    __resetTokenManagerForTests();
    resetEmbedRuntimeConfig();
  });

  it('usa conversationTokenFetcher del host (Bearer WMS) y no el JWT widget', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    setEmbedRuntimeConfig({
      conversationTokenFetcher: async () => ({
        token: 'wms-bearer',
        expiresIn: 3600,
      }),
    });

    const repo = new RemoteConversationRepository('/api/mateo/conversaciones');
    await repo.list();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer wms-bearer');
  });

  it('rechaza list() si no hay fetcher de token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );

    const repo = new RemoteConversationRepository('/api/mateo/conversaciones');

    await expect(repo.list()).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof TokenAuthError ||
        (err instanceof Error && /fetcher/i.test(err.message)),
    );
  });

  it('persiste imagen con urlImagen y pie en contenido (POL-245 / url_imagen)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ idMensaje: '0053d141-8a76-4ae5-9c12-01135a1b2c3d' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setEmbedRuntimeConfig({
      conversationTokenFetcher: async () => ({ token: 'wms-bearer', expiresIn: 3600 }),
    });

    const repo = new RemoteConversationRepository('/api/mateo/conversaciones');
    const idMensaje = await repo.appendMessage('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', {
      role: 'user',
      type: 'image',
      content: 'https://cdn.example.com/img.png',
      caption: 'pallet dañado',
      timestamp: 1_000,
    });

    expect(idMensaje).toBe('0053d141-8a76-4ae5-9c12-01135a1b2c3d');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      contenido: string;
      tipo: string;
      urlImagen: string;
    };
    expect(body.tipo).toBe('image');
    expect(body.urlImagen).toBe('https://cdn.example.com/img.png');
    expect(body.contenido).toBe('pallet dañado');
  });
});
