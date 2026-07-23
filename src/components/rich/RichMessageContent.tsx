import type { RichBlock } from '../../lib/parseRichContent';
import { hasStructuredBlocks, parseRichContent } from '../../lib/parseRichContent';
import { ChatSteps } from './ChatSteps';
import { ChatTable } from './ChatTable';
import { InlineText } from './InlineText';

interface RichMessageContentProps {
  content: string;
  onAskStep?: (prompt: string) => void;
  askDisabled?: boolean;
}

export function analyzeRichContent(content: string): {
  blocks: RichBlock[];
  structured: boolean;
} {
  const blocks = parseRichContent(content);
  return { blocks, structured: hasStructuredBlocks(blocks) };
}

function CalloutIcon({ tone }: { tone: 'info' | 'warning' | 'tip' }) {
  const color =
    tone === 'warning' ? '#f59e0b' : tone === 'tip' ? '#00e5cc' : 'rgba(248,248,246,0.7)';
  return (
    <svg className="mt-[2px] h-[14px] w-[14px] shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke={color} strokeWidth="1.3" />
      <path d="M8 5v.01M8 7.2V11" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function BlockView({
  block,
  onAskStep,
  askDisabled,
}: {
  block: RichBlock;
  onAskStep?: (prompt: string) => void;
  askDisabled?: boolean;
}) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="chat-msg-text leading-[19px] text-[rgba(248,248,246,0.85)] whitespace-pre-wrap break-words">
          <InlineText nodes={block.children} />
        </p>
      );
    case 'heading': {
      const size =
        block.level === 1 ? 'text-[14px]' : block.level === 2 ? 'text-[13px]' : 'text-[12px]';
      return (
        <p
          className={`chat-msg-text ${size} font-semibold leading-[20px] text-[rgba(248,248,246,0.95)] tracking-tight`}
        >
          <InlineText nodes={block.children} />
        </p>
      );
    }
    case 'table':
      return <ChatTable headers={block.headers} rows={block.rows} />;
    case 'steps':
      return <ChatSteps items={block.items} onAskStep={onAskStep} disabled={askDisabled} />;
    case 'list':
      return (
        <ul className="m-0 flex list-none flex-col gap-[5px] p-0">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-[8px] items-start">
              <span
                className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#00e5cc]"
                aria-hidden="true"
              />
              <span className="chat-msg-text leading-[19px] text-[rgba(248,248,246,0.85)] break-words">
                <InlineText nodes={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    case 'callout': {
      const border =
        block.tone === 'warning'
          ? 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)]'
          : block.tone === 'tip'
            ? 'border-[rgba(0,229,204,0.3)] bg-[rgba(0,229,204,0.08)]'
            : 'border-[rgba(248,248,246,0.12)] bg-[rgba(248,248,246,0.04)]';
      return (
        <div className={`flex gap-[8px] rounded-[10px] border px-[10px] py-[8px] ${border}`}>
          <CalloutIcon tone={block.tone} />
          <p className="chat-msg-text leading-[18px] text-[rgba(248,248,246,0.82)] break-words">
            <InlineText nodes={block.children} />
          </p>
        </div>
      );
    }
    case 'quote':
      return (
        <blockquote className="m-0 border-l-2 border-[#00e5cc] bg-[rgba(0,229,204,0.06)] pl-[10px] pr-[8px] py-[6px] rounded-r-[8px]">
          <p className="chat-msg-text leading-[18px] text-[rgba(248,248,246,0.75)] whitespace-pre-wrap break-words">
            <InlineText nodes={block.children} />
          </p>
        </blockquote>
      );
    case 'pre':
      return (
        <pre className="m-0 overflow-x-auto rounded-[8px] border border-[rgba(0,229,204,0.2)] bg-[rgba(0,0,0,0.35)] px-[10px] py-[8px] font-mono text-[11px] leading-[16px] text-[rgba(248,248,246,0.85)] whitespace-pre-wrap break-words">
          {block.text}
        </pre>
      );
    case 'divider':
      return <hr className="my-[4px] border-0 border-t border-[rgba(248,248,246,0.1)]" />;
    default:
      return null;
  }
}

interface RichBlocksProps {
  blocks: RichBlock[];
  structured: boolean;
  onAskStep?: (prompt: string) => void;
  askDisabled?: boolean;
}

/** Renderiza bloques ya parseados (evita parsear dos veces en MessageBubble). */
export function RichBlocks({ blocks, structured, onAskStep, askDisabled }: RichBlocksProps) {
  return (
    <div
      className={`chat-rich flex flex-col gap-[10px] w-full ${structured ? 'chat-rich--structured' : ''}`}
      data-structured={structured ? 'true' : 'false'}
    >
      {blocks.map((block, index) => (
        <BlockView
          key={`${block.type}-${index}`}
          block={block}
          onAskStep={onAskStep}
          askDisabled={askDisabled}
        />
      ))}
    </div>
  );
}

/**
 * Interpreta el texto de Mateo y lo muestra con formato formal (tablas,
 * pasos interactivos, listas, etc.). Si no hay estructura, cae a párrafo(s).
 */
export function RichMessageContent({ content, onAskStep, askDisabled }: RichMessageContentProps) {
  const { blocks, structured } = analyzeRichContent(content);
  return (
    <RichBlocks
      blocks={blocks}
      structured={structured}
      onAskStep={onAskStep}
      askDisabled={askDisabled}
    />
  );
}
