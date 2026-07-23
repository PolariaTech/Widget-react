/**
 * Decodifica el payload de un JWT sin verificar firma.
 * Solo para leer claims ya emitidos (p. ej. `idRol`) y enriquecer el body a n8n;
 * la autenticación real sigue siendo `Authorization: Bearer` validado en n8n.
 */
function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  const payloadPart = parts[1];
  if (!payloadPart) return null;

  try {
    const bytes = base64UrlToBytes(payloadPart);
    const json = new TextDecoder().decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface WidgetSpeakerClaims {
  id_rol: string;
  rol: string;
  id_usuario: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  codigo_empresa?: string | null;
  codigo_cuenta?: string | null;
}

/** Extrae identidad del hablante desde el JWT del widget. */
export function speakerClaimsFromToken(token: string): WidgetSpeakerClaims | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const idRol =
    (typeof payload.idRol === 'string' && payload.idRol) ||
    (typeof payload.rol === 'string' && payload.rol) ||
    null;
  const idUsuario = typeof payload.idUsuario === 'string' ? payload.idUsuario : null;
  if (!idRol || !idUsuario) return null;

  return {
    id_rol: idRol,
    rol: typeof payload.rol === 'string' ? payload.rol : idRol,
    id_usuario: idUsuario,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    given_name: typeof payload.given_name === 'string' ? payload.given_name : undefined,
    family_name: typeof payload.family_name === 'string' ? payload.family_name : undefined,
    codigo_empresa:
      typeof payload.codigoEmpresa === 'string' || payload.codigoEmpresa === null
        ? (payload.codigoEmpresa as string | null)
        : undefined,
    codigo_cuenta:
      typeof payload.codigoCuenta === 'string' || payload.codigoCuenta === null
        ? (payload.codigoCuenta as string | null)
        : undefined,
  };
}
