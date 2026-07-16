import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addMessage,
  CONVERSATIONS_STORAGE_KEY,
  createConversation,
  deleteConversation,
  loadConversations,
  replaceMessageContent,
  saveConversations,
} from './storage';
import type { Conversation } from '../types';
import { t } from '../i18n';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createConversation', () => {
  it('crea una conversación vacía con id único', () => {
    const a = createConversation();
    const b = createConversation();
    expect(a.id).not.toBe(b.id);
    expect(a.messages).toEqual([]);
    expect(a.title).toBeNull();
  });
});

describe('addMessage', () => {
  it('agrega un mensaje a la conversación indicada y actualiza el título con el primer mensaje de texto', () => {
    const conv = createConversation();
    const result = addMessage([conv], conv.id, 'user', 'text', 'hola mundo', 1000);
    expect(result[0]?.messages).toHaveLength(1);
    expect(result[0]?.title).toBe('hola mundo');
  });

  it('usa "Imagen" como título si el primer mensaje es de tipo image', () => {
    const conv = createConversation();
    const result = addMessage([conv], conv.id, 'user', 'image', 'data:image/png;base64,AAAA', 1000);
    expect(result[0]?.title).toBe(t('storageImageTitle'));
  });

  it('no sobrescribe un título ya asignado', () => {
    const conv = createConversation();
    const afterFirst = addMessage([conv], conv.id, 'user', 'text', 'primero', 1000);
    const afterSecond = addMessage(afterFirst, conv.id, 'user', 'text', 'segundo', 2000);
    expect(afterSecond[0]?.title).toBe('primero');
    expect(afterSecond[0]?.messages).toHaveLength(2);
  });

  it('devuelve el arreglo sin cambios si convId no existe', () => {
    const conv = createConversation();
    const result = addMessage([conv], 'no-existe', 'user', 'text', 'hola', 1000);
    expect(result).toEqual([conv]);
  });
});

describe('replaceMessageContent', () => {
  it('reemplaza el contenido de un mensaje existente manteniendo su tipo por defecto', () => {
    const conv = createConversation();
    const withMsg = addMessage([conv], conv.id, 'user', 'image', 'data:image/png;base64,AAAA', 1000);
    const replaced = replaceMessageContent(withMsg, conv.id, 'image', 1000, 'https://cdn.example.com/img.png');
    expect(replaced[0]?.messages[0]?.content).toBe('https://cdn.example.com/img.png');
    expect(replaced[0]?.messages[0]?.type).toBe('image');
  });

  it('permite cambiar el tipo del mensaje (imagen fallida -> placeholder de texto)', () => {
    const conv = createConversation();
    const withMsg = addMessage([conv], conv.id, 'user', 'image', 'data:image/png;base64,AAAA'.repeat(1000), 1000);
    const replaced = replaceMessageContent(withMsg, conv.id, 'image', 1000, 'No se pudo enviar la imagen.', 'text');
    expect(replaced[0]?.messages[0]?.type).toBe('text');
    expect(replaced[0]?.messages[0]?.content).toBe('No se pudo enviar la imagen.');
  });

  it('devuelve el arreglo sin cambios si no encuentra el mensaje', () => {
    const conv = createConversation();
    const result = replaceMessageContent([conv], conv.id, 'image', 9999, 'x');
    expect(result).toEqual([conv]);
  });
});

describe('deleteConversation', () => {
  it('elimina la conversación indicada', () => {
    const a = createConversation();
    const b = createConversation();
    const result = deleteConversation([a, b], a.id);
    expect(result).toEqual([b]);
  });

  it('no cambia nada si el id no existe', () => {
    const a = createConversation();
    const result = deleteConversation([a], 'no-existe');
    expect(result).toEqual([a]);
  });
});

describe('loadConversations / saveConversations', () => {
  it('devuelve [] cuando no hay nada guardado', () => {
    expect(loadConversations()).toEqual([]);
  });

  it('guarda y recupera conversaciones válidas', () => {
    const conv = createConversation();
    const ok = saveConversations([conv]);
    expect(ok).toBe(true);
    expect(loadConversations()).toEqual([conv]);
  });

  it('descarta solo los registros corruptos, no todo el historial (regresión del bug de Fase 0)', () => {
    const valid: Conversation = createConversation();
    const corrupt = { id: 'corrupt', title: null }; // falta createdAt/updatedAt/messages
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify([valid, corrupt]));
    const result = loadConversations();
    expect(result).toEqual([valid]);
  });

  it('guarda con un envelope { schemaVersion, conversations }', () => {
    const conv = createConversation();
    saveConversations([conv]);
    const raw = JSON.parse(localStorage.getItem(CONVERSATIONS_STORAGE_KEY)!);
    expect(raw).toEqual({ schemaVersion: 1, conversations: [conv] });
  });

  it('sigue leyendo el formato sin envelope de antes de la versión de esquema (compatibilidad hacia atrás)', () => {
    const valid = createConversation();
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify([valid]));
    expect(loadConversations()).toEqual([valid]);
  });

  it('descarta el historial completo si su versión de esquema es más nueva de la que este código conoce', () => {
    const valid = createConversation();
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, conversations: [valid] }));
    expect(loadConversations()).toEqual([]);
  });

  it('devuelve [] si el valor guardado no es un array', () => {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(loadConversations()).toEqual([]);
  });

  it('devuelve [] si el JSON guardado está corrupto', () => {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, '{not valid json');
    expect(loadConversations()).toEqual([]);
  });

  it('saveConversations devuelve false si localStorage.setItem falla', () => {
    vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const ok = saveConversations([createConversation()]);
    expect(ok).toBe(false);
  });
});
