import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildImageMessage, buildTextMessage, sendToN8n } from './webhook';
import { __resetTokenManagerForTests, configureTokenFetcher } from './authToken';
import { N8N_WEBHOOK_URL } from '../config';
import { t } from '../i18n';

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  __resetTokenManagerForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  __resetTokenManagerForTests();
});

describe('buildTextMessage / buildImageMessage', () => {
  it('arma un body plano de texto sin envoltura de WhatsApp', () => {
    expect(buildTextMessage('hola')).toEqual({ message_text: 'hola', message_type: 'text' });
  });

  it('arma un body plano de imagen usando la URL como message_text', () => {
    expect(buildImageMessage('https://cdn.example.com/img.png')).toEqual({
      message_text: 'https://cdn.example.com/img.png',
      message_type: 'image',
    });
  });

  it('el body base solo incluye message_text y message_type', () => {
    const message = buildTextMessage('hola');
    expect(Object.keys(message).sort()).toEqual(['message_text', 'message_type']);
  });
});

describe('sendToN8n', () => {
  function toBase64UrlJson(value: unknown): string {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function widgetJwt(payload: Record<string, unknown>): string {
    return `${toBase64UrlJson({ alg: 'HS256' })}.${toBase64UrlJson(payload)}.sig`;
  }

  it('envía el body con rol del JWT y Authorization: Bearer <jwt>', async () => {
    const jwt = widgetJwt({
      idUsuario: 'usr-1',
      idRol: 'operador_cuenta',
      rol: 'operador_cuenta',
      email: 'ops@acme.test',
      given_name: 'Luis',
      codigoEmpresa: 'ACME',
      codigoCuenta: 'ACME-01',
    });
    configureTokenFetcher(async () => ({ token: jwt, expiresIn: 300 }));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ output: 'hola, soy Mateo' }));
    vi.stubGlobal('fetch', fetchMock);

    const reply = await sendToN8n(buildTextMessage('hola'));

    expect(reply).toEqual({ text: 'hola, soy Mateo', isError: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(N8N_WEBHOOK_URL);
    expect(options.method).toBe('POST');
    expect((options.headers as Record<string, string>).Authorization).toBe(`Bearer ${jwt}`);
    expect(JSON.parse(options.body as string)).toEqual({
      message_text: 'hola',
      message_type: 'text',
      id_rol: 'operador_cuenta',
      rol: 'operador_cuenta',
      id_usuario: 'usr-1',
      email: 'ops@acme.test',
      given_name: 'Luis',
      codigo_empresa: 'ACME',
      codigo_cuenta: 'ACME-01',
    });
  });

  it('extrae el texto de reply/text además de output', async () => {
    configureTokenFetcher(async () => ({ token: 'jwt-valid', expiresIn: 300 }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ reply: 'segunda forma' })));

    const reply = await sendToN8n(buildTextMessage('hola'));
    expect(reply).toEqual({ text: 'segunda forma', isError: false });
  });

  it('acepta la forma array típica de n8n: [{ output: "..." }]', async () => {
    configureTokenFetcher(async () => ({ token: 'jwt-valid', expiresIn: 300 }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse([{ output: 'hola desde array' }])),
    );

    const reply = await sendToN8n(buildTextMessage('hola'));
    expect(reply).toEqual({ text: 'hola desde array', isError: false });
  });

  it('convierte output tabular (array de objetos) a markdown de pipes', async () => {
    configureTokenFetcher(async () => ({ token: 'jwt-valid', expiresIn: 300 }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          output: [
            { Ticket: 'T-1', Estado: 'Abierto' },
            { Ticket: 'T-2', Estado: 'Cerrado' },
          ],
        }),
      ),
    );

    const reply = await sendToN8n(buildTextMessage('dame tabla'));
    expect(reply.isError).toBe(false);
    expect(reply.text).toContain('Ticket | Estado');
    expect(reply.text).toContain('T-1 | Abierto');
    expect(reply.text).toContain('T-2 | Cerrado');
  });

  it('devuelve un error legible (no el JSON crudo) si la forma de la respuesta es inesperada', async () => {
    configureTokenFetcher(async () => ({ token: 'jwt-valid', expiresIn: 300 }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })));

    const reply = await sendToN8n(buildTextMessage('hola'));
    expect(reply).toEqual({ text: t('webhookUnexpectedReply'), isError: true });
  });

  it('devuelve un error de conexión si la respuesta HTTP no es ok', async () => {
    configureTokenFetcher(async () => ({ token: 'jwt-valid', expiresIn: 300 }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));

    const reply = await sendToN8n(buildTextMessage('hola'));
    expect(reply).toEqual({ text: t('webhookConnectionError'), isError: true });
  });

  it('devuelve un error de auth sin llamar a fetch si no hay token disponible', async () => {
    // Ningún fetcher configurado (estado inicial tras __resetTokenManagerForTests).
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const reply = await sendToN8n(buildTextMessage('hola'));

    expect(reply).toEqual({ text: t('webhookAuthError'), isError: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ante un 401, refresca el token una vez y reintenta la misma solicitud', async () => {
    const tokenFetcher = vi.fn().mockResolvedValueOnce({ token: 'jwt-expired', expiresIn: 300 }).mockResolvedValueOnce({ token: 'jwt-fresh', expiresIn: 300 });
    configureTokenFetcher(tokenFetcher);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ output: 'respuesta tras reintentar' }));
    vi.stubGlobal('fetch', fetchMock);

    const reply = await sendToN8n(buildTextMessage('hola'));

    expect(reply).toEqual({ text: 'respuesta tras reintentar', isError: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(tokenFetcher).toHaveBeenCalledTimes(2);

    const secondCallOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect((secondCallOptions.headers as Record<string, string>).Authorization).toBe('Bearer jwt-fresh');
  });

  it('si el reintento tras 401 también falla, no reintenta en loop y devuelve error de auth', async () => {
    const tokenFetcher = vi.fn().mockResolvedValueOnce({ token: 'jwt-expired', expiresIn: 300 }).mockResolvedValueOnce({ token: 'jwt-fresh', expiresIn: 300 });
    configureTokenFetcher(tokenFetcher);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('unauthorized again', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const reply = await sendToN8n(buildTextMessage('hola'));

    expect(reply).toEqual({ text: t('webhookAuthError'), isError: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ante un 403 de n8n, trata como auth: refresca y si sigue fallando muestra error de sesión', async () => {
    const tokenFetcher = vi
      .fn()
      .mockResolvedValueOnce({ token: 'jwt-bad', expiresIn: 300 })
      .mockResolvedValueOnce({ token: 'jwt-fresh', expiresIn: 300 });
    configureTokenFetcher(tokenFetcher);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const reply = await sendToN8n(buildTextMessage('hola'));

    expect(reply).toEqual({ text: t('webhookAuthError'), isError: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('si el refresh reactivo tras un 401 falla, devuelve un error de auth sin reintentar la solicitud', async () => {
    const tokenFetcher = vi.fn().mockResolvedValueOnce({ token: 'jwt-expired', expiresIn: 300 }).mockRejectedValueOnce(new Error('sesión inválida'));
    configureTokenFetcher(tokenFetcher);

    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const reply = await sendToN8n(buildTextMessage('hola'));

    expect(reply).toEqual({ text: t('webhookAuthError'), isError: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
