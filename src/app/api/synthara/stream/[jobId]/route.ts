import { NextRequest } from 'next/server';
import { addSyntharaClient, removeSyntharaClient } from '@/lib/synthara/sse-bus';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  } as const;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { jobId } = await context.params;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const initial = JSON.stringify({
        type: 'info',
        message: `Synthara stream established for job ${jobId}`,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${initial}\n\n`));

      const clientId = addSyntharaClient(jobId, controller);

      const heartbeat = setInterval(() => {
        try {
          if (controller.desiredSize !== null) {
            const hb = JSON.stringify({
              type: 'info',
              message: 'Connection alive',
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${hb}\n\n`));
          }
        } catch {
          clearInterval(heartbeat);
          removeSyntharaClient(jobId, controller);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeSyntharaClient(jobId, controller);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...corsHeaders(),
    },
  });
}
