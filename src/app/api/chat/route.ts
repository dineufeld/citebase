import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from 'ai';
import { getGateway, CHAT_MODEL } from '@/lib/ai/gateway';
import { ensureDefaultCollection } from '@/lib/db/default-collection';
import { hybridSearch } from '@/lib/retrieval';
import { buildSystemPrompt, formatContextBlock } from '@/lib/prompts/system';
import type { CitationSource } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function messageText(message: UIMessage): string {
  if (!message?.parts) return '';
  return message.parts
    .map((p) => (p.type === 'text' && 'text' in p ? p.text : ''))
    .filter(Boolean)
    .join('\n');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = (body.messages ?? []) as UIMessage[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages required' }, { status: 400 });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const userQuery = lastUser ? messageText(lastUser).trim() : '';
    if (!userQuery) {
      return Response.json({ error: 'Empty user message' }, { status: 400 });
    }

    const collectionId = await ensureDefaultCollection();
    const search = await hybridSearch(userQuery, {
      collectionId,
      limit: 6,
    });

    console.log(
      `[chat] mode=${search.mode} chunks=${search.chunks.length} latency=${search.latencyMs}ms bm25=${search.bm25Count} vector=${search.vectorCount}`,
    );

    const sources: CitationSource[] = search.chunks.map((c, i) => ({
      index: i + 1,
      chunkId: c.chunkId,
      documentId: c.documentId,
      filename: c.filename,
      page: c.page,
      excerpt: c.content.slice(0, 240),
      score: c.score,
    }));

    const contextBlock = formatContextBlock(search.chunks);
    const system = buildSystemPrompt({
      contextBlock,
      hasContext: search.chunks.length > 0,
    });

    const modelMessages = await convertToModelMessages(messages);
    const gateway = getGateway();

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Custom data part so the client can render citation chips
        writer.write({
          type: 'data-sources',
          data: sources,
        } as never);

        const result = streamText({
          model: gateway(CHAT_MODEL),
          system,
          messages: modelMessages,
          temperature: 0.2,
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error('[chat]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 },
    );
  }
}
