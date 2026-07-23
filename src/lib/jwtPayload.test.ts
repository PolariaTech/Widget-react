import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, speakerClaimsFromToken } from './jwtPayload';

function toBase64UrlJson(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Arma un JWT fake (sin firma válida) solo para pruebas de decode. */
function fakeJwt(payload: Record<string, unknown>): string {
  return `${toBase64UrlJson({ alg: 'HS256', typ: 'JWT' })}.${toBase64UrlJson(payload)}.sig`;
}

describe('decodeJwtPayload / speakerClaimsFromToken', () => {
  it('lee idRol/rol e identidad del payload', () => {
    const token = fakeJwt({
      sub: 'auth-1',
      idUsuario: 'usr-9',
      idRol: 'administrador_cuenta',
      rol: 'administrador_cuenta',
      email: 'ana@acme.test',
      given_name: 'Ana',
      family_name: 'Pérez',
      codigoEmpresa: 'ACME',
      codigoCuenta: 'ACME-01',
    });

    expect(decodeJwtPayload(token)).toMatchObject({
      idUsuario: 'usr-9',
      idRol: 'administrador_cuenta',
    });

    expect(speakerClaimsFromToken(token)).toEqual({
      id_rol: 'administrador_cuenta',
      rol: 'administrador_cuenta',
      id_usuario: 'usr-9',
      email: 'ana@acme.test',
      given_name: 'Ana',
      family_name: 'Pérez',
      codigo_empresa: 'ACME',
      codigo_cuenta: 'ACME-01',
    });
  });

  it('devuelve null si faltan claims mínimos', () => {
    expect(speakerClaimsFromToken(fakeJwt({ sub: 'x' }))).toBeNull();
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  });
});
