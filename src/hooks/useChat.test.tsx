import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat, type UseChatResult } from './useChat';
import { uploadToCloudinary } from '../lib/cloudinary';
import { sendToN8n } from '../lib/webhook';
import type { SelectedImage } from '../types';

vi.mock('../lib/cloudinary', () => ({
  uploadToCloudinary: vi.fn(),
}));

vi.mock('../lib/webhook', async () => {
  const actual = await vi.importActual<typeof import('../lib/webhook')>('../lib/webhook');
  return {
    ...actual,
    sendToN8n: vi.fn(),
  };
});

const IMAGE: SelectedImage = {
  data: 'data:image/png;base64,AAAA',
  name: 'evidencia.png',
  type: 'image/png',
};

const REMOTE_MESSAGE_ID = '0053d141-8a76-4ae5-9c12-01135a1b2c3d';

describe('useChat — POL-245 imagen + texto', () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadToCloudinary).mockResolvedValue('https://cdn.example.com/img.png');
    vi.mocked(sendToN8n).mockResolvedValue({ text: 'recibí la evidencia', isError: false });
    vi.stubGlobal('navigator', { onLine: true });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  function mountChat() {
    const addMessage = vi.fn();
    const replaceMessage = vi.fn();
    const ensureConversation = vi.fn(() => 'conv_local');
    const resolveConversationIdForN8n = vi.fn(async () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    const persistUserMessageForN8n = vi.fn(async () => REMOTE_MESSAGE_ID);
    let api: UseChatResult | null = null;

    function Probe() {
      api = useChat({
        ensureConversation,
        resolveConversationIdForN8n,
        persistUserMessageForN8n,
        addMessage,
        replaceMessage,
      });
      return null;
    }

    act(() => {
      root!.render(<Probe />);
    });

    return {
      api: () => api!,
      addMessage,
      replaceMessage,
      resolveConversationIdForN8n,
      persistUserMessageForN8n,
    };
  }

  it('envía un solo POST con image_caption, message_id y una sola burbuja de usuario', async () => {
    const chat = mountChat();

    act(() => {
      chat.api().setSelectedImage(IMAGE);
    });

    await act(async () => {
      await chat.api().sendMessage('Hola mateo, no me funciona el chat');
    });

    const userMessages = chat.addMessage.mock.calls.filter((call) => call[1] === 'user');
    expect(userMessages).toHaveLength(1);
    expect(userMessages[0]?.slice(0, 6)).toEqual([
      'conv_local',
      'user',
      'image',
      IMAGE.data,
      expect.any(Number),
      'Hola mateo, no me funciona el chat',
    ]);

    expect(chat.persistUserMessageForN8n).toHaveBeenCalledTimes(1);
    expect(sendToN8n).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendToN8n).mock.calls[0]?.[0]).toMatchObject({
      message_type: 'image',
      message_text: 'Hola mateo, no me funciona el chat',
      image_url: 'https://cdn.example.com/img.png',
      image_caption: 'Hola mateo, no me funciona el chat',
      message_id: REMOTE_MESSAGE_ID,
    });

    const aiMessages = chat.addMessage.mock.calls.filter((call) => call[1] === 'ai');
    expect(aiMessages).toHaveLength(1);
  });

  it('no manda image_caption si solo hay imagen, pero sí message_id', async () => {
    const chat = mountChat();

    act(() => {
      chat.api().setSelectedImage(IMAGE);
    });

    await act(async () => {
      await chat.api().sendMessage('   ');
    });

    expect(sendToN8n).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendToN8n).mock.calls[0]?.[0]).toEqual({
      message_text: '',
      message_type: 'image',
      conversation_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      message_id: REMOTE_MESSAGE_ID,
      image_url: 'https://cdn.example.com/img.png',
      message_url: 'https://cdn.example.com/img.png',
    });
  });

  it('incluye message_id del id_mensaje persistido en mensajes de texto (POL-291)', async () => {
    const chat = mountChat();

    await act(async () => {
      await chat.api().sendMessage('no me carga la pantalla de recepcion');
    });

    expect(chat.persistUserMessageForN8n).toHaveBeenCalledWith(
      'conv_local',
      expect.objectContaining({
        role: 'user',
        type: 'text',
        content: 'no me carga la pantalla de recepcion',
      }),
    );
    expect(vi.mocked(sendToN8n).mock.calls[0]?.[0]).toEqual({
      message_text: 'no me carga la pantalla de recepcion',
      message_type: 'text',
      conversation_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      message_id: REMOTE_MESSAGE_ID,
    });
  });
});
