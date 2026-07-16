import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetTokenManagerForTests,
  configureTokenFetcher,
  forceRefresh,
  getValidToken,
  onAuthError,
  refreshToken,
  TokenAuthError,
} from './authToken';

beforeEach(() => {
  __resetTokenManagerForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  __resetTokenManagerForTests();
});

describe('getValidToken', () => {
  it('pide un token al fetcher inyectado la primera vez', async () => {
    const fetcher = vi.fn().mockResolvedValue({ token: 'jwt-1', expiresIn: 300 });
    configureTokenFetcher(fetcher);

    const token = await getValidToken();

    expect(token).toBe('jwt-1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('devuelve el token en memoria sin volver a llamar al fetcher mientras siga vigente', async () => {
    const fetcher = vi.fn().mockResolvedValue({ token: 'jwt-1', expiresIn: 300 });
    configureTokenFetcher(fetcher);

    await getValidToken();
    await getValidToken();
    await getValidToken();

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rechaza con TokenAuthError si nunca se configuró un fetcher', async () => {
    await expect(getValidToken()).rejects.toBeInstanceOf(TokenAuthError);
  });
});

describe('refresh proactivo', () => {
  it('pide un token nuevo ~30s antes de que expire el actual', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue({ token: 'jwt-1', expiresIn: 100 });
    configureTokenFetcher(fetcher);

    await getValidToken();
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 100s de vida - 30s de margen = a los 70s debería dispararse el refresh.
    await vi.advanceTimersByTimeAsync(69_000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('no dispara el refresh proactivo antes de tiempo', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue({ token: 'jwt-1', expiresIn: 300 });
    configureTokenFetcher(fetcher);

    await getValidToken();
    await vi.advanceTimersByTimeAsync(100_000);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('refresh reactivo (forceRefresh, ej. ante un 401)', () => {
  it('pide un token nuevo aunque el actual todavía sea válido', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ token: 'jwt-1', expiresIn: 300 })
      .mockResolvedValueOnce({ token: 'jwt-2', expiresIn: 300 });
    configureTokenFetcher(fetcher);

    const first = await getValidToken();
    const refreshed = await forceRefresh();

    expect(first).toBe('jwt-1');
    expect(refreshed).toBe('jwt-2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('el token nuevo queda vigente para llamadas posteriores', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ token: 'jwt-1', expiresIn: 300 })
      .mockResolvedValueOnce({ token: 'jwt-2', expiresIn: 300 });
    configureTokenFetcher(fetcher);

    await getValidToken();
    await forceRefresh();
    const afterward = await getValidToken();

    expect(afterward).toBe('jwt-2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('fallo del fetcher — no debe reintentar indefinidamente', () => {
  it('propaga TokenAuthError y no vuelve a llamar al fetcher en el siguiente intento', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('sesión de Bodega de Frío inválida'));
    configureTokenFetcher(fetcher);

    await expect(getValidToken()).rejects.toBeInstanceOf(TokenAuthError);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Segundo intento: el manager quedó "latcheado" en error, no debe volver
    // a invocar el fetcher por su cuenta.
    await expect(getValidToken()).rejects.toBeInstanceOf(TokenAuthError);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await expect(refreshToken()).rejects.toBeInstanceOf(TokenAuthError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('no sirve el último token conocido tras un fallo de refresh posterior', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ token: 'jwt-1', expiresIn: 300 }).mockRejectedValueOnce(new Error('expiró la sesión'));
    configureTokenFetcher(fetcher);

    await getValidToken();
    await expect(forceRefresh()).rejects.toBeInstanceOf(TokenAuthError);

    // Nada de "cachear el último token válido": getValidToken debe volver a
    // fallar, no devolver 'jwt-1'.
    await expect(getValidToken()).rejects.toBeInstanceOf(TokenAuthError);
  });

  it('notifica a los listeners de onAuthError cuando el fetcher rechaza', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('sesión inválida'));
    configureTokenFetcher(fetcher);
    const listener = vi.fn();
    const unsubscribe = onAuthError(listener);

    await expect(getValidToken()).rejects.toBeInstanceOf(TokenAuthError);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toBeInstanceOf(TokenAuthError);
    unsubscribe();
  });

  it('configureTokenFetcher limpia el estado de error y permite reintentar', async () => {
    const failingFetcher = vi.fn().mockRejectedValue(new Error('sesión inválida'));
    configureTokenFetcher(failingFetcher);
    await expect(getValidToken()).rejects.toBeInstanceOf(TokenAuthError);

    const workingFetcher = vi.fn().mockResolvedValue({ token: 'jwt-recovered', expiresIn: 300 });
    configureTokenFetcher(workingFetcher);

    const token = await getValidToken();
    expect(token).toBe('jwt-recovered');
    expect(workingFetcher).toHaveBeenCalledTimes(1);
  });
});

describe('llamadas concurrentes', () => {
  it('deduplica refreshes simultáneos: solo un fetcher en vuelo a la vez', async () => {
    let resolveFetch: (value: { token: string; expiresIn: number }) => void = () => {};
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<{ token: string; expiresIn: number }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    configureTokenFetcher(fetcher);

    const call1 = getValidToken();
    const call2 = getValidToken();

    resolveFetch({ token: 'jwt-1', expiresIn: 300 });
    const [token1, token2] = await Promise.all([call1, call2]);

    expect(token1).toBe('jwt-1');
    expect(token2).toBe('jwt-1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
