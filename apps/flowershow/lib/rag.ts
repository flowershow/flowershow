import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { typesense } from './typesense';

export type ContextDocument = {
  title: string;
  content: string;
  path: string;
};

export async function retrieveContext(
  siteId: string,
  question: string,
): Promise<ContextDocument[]> {
  try {
    const results = await typesense
      .collections(siteId)
      .documents()
      .search({
        q: question,
        query_by: 'embedding,title,content',
        vector_query: 'embedding:([], k:3, alpha:0.7)',
        exclude_fields: 'embedding',
        per_page: 3,
      } as any);

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
