/**
 * conversationApi.ts — Persistencia remota contra polaria-wms-api
 * (`GET/POST/DELETE /mateo/conversaciones`).
 *
 * Auth: por defecto JWT widget (`getValidToken`). En embed Polaria, el host
 * debe pasar `conversationTokenFetcher` con el Bearer de sesión WMS (Supabase),
 * porque esos endpoints usan JwtAuthGuard + TenantGuard.
 */
import type { Conversation, Message } from '../types';
import { getValidToken } from './authToken';
import { getEmbedRuntimeConfig } from './embedConfig';
import type { ConversationRepository } from './storage';
import { coalesceImageCaptionMessages, decodeImageContent } from './imageCaption';

interface ApiMensaje {
  idMensaje: string;
  rol: 'user' | 'ai';
  tipo: 'text' | 'image';
  contenido: string;
  /** URL Cloudinary cuando tipo = image (columna url_imagen). */
  urlImagen?: string | null;
  esError: boolean;
  createdAt: string;
}

interface ApiConversacionListItem {
  idConversacion: string;
  titulo: string | null;
  codigoCuenta?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiConversacionDetalle extends ApiConversacionListItem {
  mensajes: ApiMensaje[];
}

function toTimestamp(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Date.now();
}

function mapMensaje(m: ApiMensaje): Message {
  if (m.tipo === 'image') {
    // Preferir columna url_imagen; fallback al encoding legacy en contenido.
    if (m.urlImagen?.trim()) {
      const caption = m.contenido.trim() || undefined;
      return {
        id: m.idMensaje,
        role: m.rol,
        type: 'image',
        content: m.urlImagen.trim(),
        caption,
        timestamp: toTimestamp(m.createdAt),
        isError: m.esError || undefined,
      };
    }
    const { url, caption } = decodeImageContent(m.contenido);
    return {
      id: m.idMensaje,
      role: m.rol,
      type: 'image',
      content: url,
      caption,
      timestamp: toTimestamp(m.createdAt),
      isError: m.esError || undefined,
    };
  }
  return {
    id: m.idMensaje,
    role: m.rol,
    type: m.tipo,
    content: m.contenido,
    timestamp: toTimestamp(m.createdAt),
    isError: m.esError || undefined,
  };
}

function mapConversacion(
  row: ApiConversacionListItem,
  mensajes: ApiMensaje[] = [],
): Conversation {
  return {
    id: row.idConversacion,
    title: row.titulo,
    createdAt: toTimestamp(row.createdAt),
    updatedAt: toTimestamp(row.updatedAt),
    messages: coalesceImageCaptionMessages(mensajes.map(mapMensaje)),
  };
}

async function resolveConversationBearer(): Promise<string> {
  const custom = getEmbedRuntimeConfig().conversationTokenFetcher;
  if (custom) {
    const { token } = await custom();
    return token;
  }
  return getValidToken();
}

export class RemoteConversationRepository implements ConversationRepository {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private url(path = ''): string {
    const root = this.baseUrl.replace(/\/$/, '');
    if (!path) return root;
    return `${root}/${path.replace(/^\//, '')}`;
  }

  private async authHeaders(): Promise<HeadersInit> {
    const token = await resolveConversationBearer();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async list(): Promise<Conversation[]> {
    const res = await fetch(this.url(), {
      method: 'GET',
      headers: await this.authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`No se pudo listar conversaciones (${res.status})`);
    }
    const rows = (await res.json()) as ApiConversacionListItem[];
    return rows.map((row) => mapConversacion(row));
  }

  async create(titulo?: string | null): Promise<Conversation> {
    const res = await fetch(this.url(), {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify(titulo ? { titulo } : {}),
    });
    if (!res.ok) {
      throw new Error(`No se pudo crear conversación (${res.status})`);
    }
    const row = (await res.json()) as ApiConversacionDetalle;
    return mapConversacion(row, row.mensajes ?? []);
  }

  async getDetail(id: string): Promise<Conversation> {
    const res = await fetch(this.url(id), {
      method: 'GET',
      headers: await this.authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`No se pudo cargar conversación (${res.status})`);
    }
    const row = (await res.json()) as ApiConversacionDetalle;
    return mapConversacion(row, row.mensajes ?? []);
  }

  /**
   * Persiste el mensaje y devuelve `idMensaje` (`widget_mensaje.id_mensaje`)
   * para usarlo como `message_id` hacia n8n (POL-291).
   */
  async appendMessage(id: string, message: Message): Promise<string> {
    const isImage = message.type === 'image';
    const res = await fetch(this.url(`${id}/mensajes`), {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify({
        rol: message.role,
        tipo: message.type,
        // Texto / pie: ya no embebemos la URL en contenido.
        contenido: isImage ? message.caption?.trim() || '' : message.content,
        ...(isImage ? { urlImagen: message.content } : {}),
        esError: message.isError ?? false,
        createdAt: new Date(message.timestamp).toISOString(),
      }),
    });
    if (!res.ok) {
      throw new Error(`No se pudo guardar mensaje (${res.status})`);
    }
    const row = (await res.json()) as Pick<ApiMensaje, 'idMensaje'>;
    if (typeof row.idMensaje !== 'string' || !row.idMensaje.trim()) {
      throw new Error('La API no devolvió idMensaje al guardar el mensaje');
    }
    return row.idMensaje.trim();
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(this.url(id), {
      method: 'DELETE',
      headers: await this.authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`No se pudo eliminar conversación (${res.status})`);
    }
  }
}
