import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { type NextRequest, NextResponse } from 'next/server';
import { buildPrompt, retrieveContext } from '@/lib/rag';
import prisma from '@/server/db';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await props.params;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { enableAiChat: true, aiChatApiKey: true },
  });

  if (!site) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!site.enableAiChat) {
    return NextResponse.json({ error: 'ai_chat_disabled' }, { status: 403 });
  }

  if (!site.aiChatApiKey) {
    return NextResponse.json({ error: 'missing_api_key' }, { status: 503 });
  }

  let body: {
    question: string;
    history?: MessageParam[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { question, history = [] } = body;
  if (!question) {
    return NextResponse.json({ error: 'question_required' }, { status: 400 });
  }

  const documents = await retrieveContext(siteId, question);
  const { system, messages } = buildPrompt(question, history, documents);
  const sourcePaths = documents.map((d) => d.path);

  const anthropic = new Anthropic({ apiKey: site.aiChatApiKey });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system,
          messages,
        });

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'token', content: chunk.delta.text })}\n\n`,
              ),
            );
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'sources', paths: sourcePaths })}\n\n`,
          ),
        );
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
