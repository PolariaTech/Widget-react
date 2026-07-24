import type { RichBlock } from '../../lib/parseRichContent';
import { hasStructuredBlocks, parseRichContent } from '../../lib/parseRichContent';

export function analyzeRichContent(content: string): {
  blocks: RichBlock[];
  structured: boolean;
} {
  const blocks = parseRichContent(content);
  return { blocks, structured: hasStructuredBlocks(blocks) };
}
