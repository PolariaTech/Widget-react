export type MessageRole = 'user' | 'ai';
export type MessageType = 'text' | 'image';

export interface Message {
  role: MessageRole;
  type: MessageType;
  /** Texto del mensaje, o URL/Data URL de la imagen si `type` es `'image'`. */
  content: string;
  timestamp: number;
  /** Pie de imagen (POL-245): texto enviado junto a la foto, no un mensaje aparte. */
  caption?: string;
  /** `true` si este mensaje es un error (fallo de red/subida), no una respuesta real de Mateo — MessageBubble lo distingue visualmente. */
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface SelectedImage {
  /** Data URL (base64) de la imagen, tal como la devuelve FileReader.readAsDataURL(). */
  data: string;
  name: string;
  type: string;
}
