import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { typesense } from './typesense';

export type ContextDocument = {
  title: string;
  content: string;
  path: string;
};

// Filler words that hurt BM25 retrieval when included in a natural-language question
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'about',
  'into',
  'through',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'can',
  'may',
  'might',
  'shall',
  'how',
  'what',
  'where',
  'when',
  'why',
  'which',
  'who',
  'whose',
  'i',
  'me',
  'my',
  'you',
  'your',
  'it',
  'its',
  'we',
  'our',
  'they',
  'their',
  'this',
  'that',
  'these',
  'those',
  'get',
  'set',
]);

export function extractKeywords(question: string): string {
  const keywords = question
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  // Fall back to original question if every word was stripped
  return keywords.length > 0 ? keywords.join(' ') : question;
}

export async function retrieveContext(
  siteId: string,
  question: string,
): Promise<ContextDocument[]> {
  try {
    const results = await typesense
      .collections(siteId)
      .documents()
      .search({
        q: extractKeywords(question),
        query_by: 'title,content',
        per_page: 5,
      });

    return (results.hits ?? []).map((hit: any) => ({
      title: (hit.document.title as string) ?? '',
      content: (hit.document.content as string) ?? '',
      path: (hit.document.path as string) ?? '',
    }));
  } catch (error: any) {
    if (error?.httpStatus === 404) {
      return [];
    }
    throw error;
  }
}

export function buildPrompt(
  question: string,
  history: MessageParam[],
  documents: ContextDocument[],
): { system: string; messages: MessageParam[] } {
  const contextSection =
    documents.length > 0
      ? documents
          .map((d, i) => `[${i + 1}] ${d.title}\n${d.content}`)
          .join('\n\n')
      : 'No relevant content found.';

  const system = `You are a helpful assistant for this website. Answer questions using ONLY the site content provided below.

Rules:
- If the answer is in the context, answer directly and concisely.
- If the answer is NOT in the context, say "I don't have that information in the site content." Do NOT describe or summarise what the context does contain — just say you don't have it.
- Never reference the context documents by number or describe their contents to the user.
- Never answer from general knowledge outside the provided context.

Site content:
${contextSection}`;

  return {
    system,
    messages: [...history, { role: 'user', content: question }],
  };
}
