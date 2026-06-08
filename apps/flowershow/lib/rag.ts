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
    const results = await typesense.collections(siteId).documents().search({
      q: question,
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

  const system = `You are an AI assistant for this site. Answer the user's question based only on the provided context. If the context does not contain enough information to answer the question, say so clearly.

Context:
${contextSection}`;

  return {
    system,
    messages: [...history, { role: 'user', content: question }],
  };
}
