/**
 * parseRichContent — convierte el texto plano de Mateo en bloques tipados
 * (párrafos, tablas GFM, pasos numerados, listas, títulos, callouts) para
 * que MessageBubble pueda renderizarlos con UI formal al estilo Polaria.
 *
 * No usa HTML crudo: el AST se traduce a nodos React en los componentes rich/.
 */

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'strike'; children: InlineNode[] }
  | { type: 'code'; text: string };

export type RichBlock =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'steps'; title?: string; items: { title: string; detail?: string }[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }
  | { type: 'callout'; tone: 'info' | 'warning' | 'tip'; children: InlineNode[] }
  | { type: 'quote'; children: InlineNode[] }
  | { type: 'pre'; text: string }
  | { type: 'divider' };

const STEP_RE =
  /^(?:(?:paso|step)\s*)?(\d+)[.):\-–—]\s+(.+)$/i;
const BULLET_RE = /^[-*•]\s+(.+)$/;
const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const CALLOUT_RE = /^(nota|importante|aviso|advertencia|tip|consejo|info)\s*:\s*(.+)$/i;
const DIVIDER_RE = /^-{3,}$|^\*{3,}$|^_{3,}$/;
const QUOTE_RE = /^>\s+(.+)$/;
const PRE_FENCE_RE = /^```/;

function splitPipeRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutEnd = inner.endsWith('|') ? inner.slice(0, -1) : inner;
  return withoutEnd.split('|').map((cell) => cell.trim());
}

/** Fila con al menos 2 celdas separadas por `|` (con o sin pipes externos). */
function isPipeDataRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return splitPipeRow(trimmed).length >= 2;
}

/** Fila separadora GFM: `|---|---|` o `---|---` o `:---:`. */
function isPipeSepRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('-') || !trimmed.includes('|')) return false;
  const cells = splitPipeRow(trimmed);
  if (cells.length < 2) return false;
  return cells.every((cell) => cell === '' || /^:?-{1,}:?$/.test(cell));
}

function normalizeRow(cells: string[], width: number): string[] {
  const next = cells.slice(0, width);
  while (next.length < width) next.push('');
  return next;
}

/**
 * Formato inline estilo WhatsApp (solo diseño visual):
 * - `*negrita*` / `**negrita**`
 * - `_cursiva_`
 * - `~tachado~`
 * - `` `mono` `` / ```mono``` en una línea
 */
export function parseInline(text: string): InlineNode[] {
  if (!text) return [];

  const nodes: InlineNode[] = [];
  const pattern =
    /```([^`]+?)```|\*\*(.+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_|~([^~\n]+?)~|`([^`\n]+?)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      nodes.push({ type: 'code', text: match[1] });
    } else if (match[2] !== undefined) {
      nodes.push({ type: 'bold', children: parseInline(match[2]) });
    } else if (match[3] !== undefined) {
      nodes.push({ type: 'bold', children: parseInline(match[3]) });
    } else if (match[4] !== undefined) {
      nodes.push({ type: 'italic', children: parseInline(match[4]) });
    } else if (match[5] !== undefined) {
      nodes.push({ type: 'strike', children: parseInline(match[5]) });
    } else if (match[6] !== undefined) {
      nodes.push({ type: 'code', text: match[6] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }];
}

function calloutTone(label: string): 'info' | 'warning' | 'tip' {
  const key = label.toLowerCase();
  if (/importante|aviso|advertencia|warning/.test(key)) return 'warning';
  if (/tip|consejo/.test(key)) return 'tip';
  return 'info';
}

/**
 * Consume una tabla aunque Mateo omita los `|` externos o la fila `---|---`.
 */
function tryConsumeTable(lines: string[], start: number): { block: RichBlock; next: number } | null {
  if (!isPipeDataRow(lines[start]!) || isPipeSepRow(lines[start]!)) return null;

  const headers = splitPipeRow(lines[start]!);
  if (headers.length < 2) return null;

  let i = start + 1;
  const rows: string[][] = [];

  if (i < lines.length && isPipeSepRow(lines[i]!)) {
    i += 1;
  }

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) break;
    if (isPipeSepRow(trimmed)) {
      i += 1;
      continue;
    }
    if (!isPipeDataRow(trimmed)) break;

    const cells = splitPipeRow(trimmed);
    // Misma familia de columnas (±2) para no engullir prosa con un `|` suelto
    if (Math.abs(cells.length - headers.length) > 2) break;
    rows.push(normalizeRow(cells, headers.length));
    i += 1;
  }

  // Sin separador GFM exigimos ≥1 fila de datos; con solo header no es tabla útil
  if (rows.length === 0) return null;

  return { block: { type: 'table', headers, rows }, next: i };
}

function tryConsumeSteps(
  lines: string[],
  start: number,
): { block: RichBlock; next: number } | null {
  const first = STEP_RE.exec(lines[start]!.trim());
  if (!first) return null;

  const items: { title: string; detail?: string }[] = [];
  let i = start;
  let expected = Number(first[1]);

  while (i < lines.length) {
    const m = STEP_RE.exec(lines[i]!.trim());
    if (!m || Number(m[1]) !== expected) break;

    let title = m[2]!.trim();
    let detail: string | undefined;
    i += 1;

    const detailParts: string[] = [];
    while (i < lines.length) {
      const line = lines[i]!;
      const trimmed = line.trim();
      if (!trimmed) break;
      if (
        STEP_RE.test(trimmed) ||
        BULLET_RE.test(trimmed) ||
        isPipeDataRow(trimmed) ||
        HEADING_RE.test(trimmed) ||
        CALLOUT_RE.test(trimmed) ||
        QUOTE_RE.test(trimmed) ||
        PRE_FENCE_RE.test(trimmed) ||
        DIVIDER_RE.test(trimmed)
      ) {
        break;
      }
      detailParts.push(trimmed);
      i += 1;
    }

    if (detailParts.length > 0) {
      detail = detailParts.join(' ');
    }

    const splitTitle = title.match(/^(.+?)(?:\s+[—–-]\s+|\s*:\s+)(.+)$/);
    if (!detail && splitTitle) {
      title = splitTitle[1]!.trim();
      detail = splitTitle[2]!.trim();
    }

    items.push({ title, detail });
    expected += 1;
  }

  if (items.length < 2) return null;
  return { block: { type: 'steps', items }, next: i };
}

function tryConsumeList(
  lines: string[],
  start: number,
): { block: RichBlock; next: number } | null {
  const first = BULLET_RE.exec(lines[start]!.trim());
  if (!first) return null;

  const items: InlineNode[][] = [];
  let i = start;

  while (i < lines.length) {
    const m = BULLET_RE.exec(lines[i]!.trim());
    if (!m) break;
    items.push(parseInline(m[1]!));
    i += 1;
  }

  if (items.length === 0) return null;
  return { block: { type: 'list', ordered: false, items }, next: i };
}

/**
 * Detecta si el texto tiene al menos un bloque estructurado (tabla, pasos ≥2,
 * lista ≥2, heading, callout, cita o bloque mono). Útil para ensanchar la burbuja.
 */
export function hasStructuredBlocks(blocks: RichBlock[]): boolean {
  return blocks.some(
    (b) =>
      b.type === 'table' ||
      b.type === 'steps' ||
      b.type === 'list' ||
      b.type === 'heading' ||
      b.type === 'callout' ||
      b.type === 'quote' ||
      b.type === 'pre',
  );
}

function tryConsumePre(
  lines: string[],
  start: number,
): { block: RichBlock; next: number } | null {
  const first = lines[start]!.trim();
  if (!PRE_FENCE_RE.test(first)) return null;

  // ```código``` en una sola línea
  const sameLine = /^```([\s\S]*?)```$/.exec(first);
  if (sameLine && first !== '```') {
    return { block: { type: 'pre', text: sameLine[1] ?? '' }, next: start + 1 };
  }

  if (first !== '```' && !/^```\w*$/.test(first)) return null;

  const body: string[] = [];
  let i = start + 1;
  while (i < lines.length) {
    if (lines[i]!.trim() === '```') {
      return { block: { type: 'pre', text: body.join('\n') }, next: i + 1 };
    }
    body.push(lines[i]!);
    i += 1;
  }

  // Fence sin cierre: no consumir (evitar comerse el resto del mensaje)
  return null;
}

function tryConsumeQuote(
  lines: string[],
  start: number,
): { block: RichBlock; next: number } | null {
  const first = QUOTE_RE.exec(lines[start]!.trim());
  if (!first) return null;

  const parts: string[] = [first[1]!];
  let i = start + 1;
  while (i < lines.length) {
    const m = QUOTE_RE.exec(lines[i]!.trim());
    if (!m) break;
    parts.push(m[1]!);
    i += 1;
  }

  return {
    block: { type: 'quote', children: parseInline(parts.join('\n')) },
    next: i,
  };
}

export function parseRichContent(raw: string): RichBlock[] {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks: RichBlock[] = [];
  let i = 0;
  let paragraphBuf: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    // Conservar saltos de línea (estilo chat WhatsApp)
    const text = paragraphBuf.join('\n').trim();
    paragraphBuf = [];
    if (!text) return;
    blocks.push({ type: 'paragraph', children: parseInline(text) });
  };

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    if (DIVIDER_RE.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'divider' });
      i += 1;
      continue;
    }

    const pre = tryConsumePre(lines, i);
    if (pre) {
      flushParagraph();
      blocks.push(pre.block);
      i = pre.next;
      continue;
    }

    const heading = HEADING_RE.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1]!.length, 3) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, children: parseInline(heading[2]!) });
      i += 1;
      continue;
    }

    const callout = CALLOUT_RE.exec(trimmed);
    if (callout) {
      flushParagraph();
      blocks.push({
        type: 'callout',
        tone: calloutTone(callout[1]!),
        children: parseInline(callout[2]!),
      });
      i += 1;
      continue;
    }

    const quote = tryConsumeQuote(lines, i);
    if (quote) {
      flushParagraph();
      blocks.push(quote.block);
      i = quote.next;
      continue;
    }

    const table = tryConsumeTable(lines, i);
    if (table) {
      flushParagraph();
      blocks.push(table.block);
      i = table.next;
      continue;
    }

    const steps = tryConsumeSteps(lines, i);
    if (steps) {
      flushParagraph();
      blocks.push(steps.block);
      i = steps.next;
      continue;
    }

    const list = tryConsumeList(lines, i);
    if (list) {
      flushParagraph();
      blocks.push(list.block);
      i = list.next;
      continue;
    }

    paragraphBuf.push(trimmed);
    i += 1;
  }

  flushParagraph();
  return blocks;
}
