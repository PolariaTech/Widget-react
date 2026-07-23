import type { InlineNode } from '../../lib/parseRichContent';

interface InlineTextProps {
  nodes: InlineNode[];
}

/** Renderiza nodos inline estilo WhatsApp (negrita, cursiva, tachado, mono) sin HTML crudo. */
export function InlineText({ nodes }: InlineTextProps) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${node.type}-${index}`;
        switch (node.type) {
          case 'text':
            return <span key={key}>{node.text}</span>;
          case 'bold':
            return (
              <strong key={key} className="font-semibold text-[rgba(248,248,246,0.95)]">
                <InlineText nodes={node.children} />
              </strong>
            );
          case 'italic':
            return (
              <em key={key} className="italic text-[rgba(248,248,246,0.88)]">
                <InlineText nodes={node.children} />
              </em>
            );
          case 'strike':
            return (
              <span key={key} className="line-through text-[rgba(248,248,246,0.55)]">
                <InlineText nodes={node.children} />
              </span>
            );
          case 'code':
            return (
              <code
                key={key}
                className="rounded-[4px] bg-[rgba(0,229,204,0.12)] border border-[rgba(0,229,204,0.2)] px-[5px] py-[1px] font-mono text-[0.92em] text-[#00e5cc]"
              >
                {node.text}
              </code>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
