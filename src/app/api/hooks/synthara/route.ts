import { NextRequest, NextResponse } from 'next/server';
import { updateJobByNodeJobId } from '@/lib/synthara/job-store';
import { publishSyntharaEvent } from '@/lib/synthara/sse-bus';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  } as const;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const event = payload?.event as string | undefined;
    const nodeJobId = String(payload?.jobId ?? '').trim();

    if (!event || !nodeJobId) {
      return NextResponse.json(
        { success: false, error: 'event and jobId are required' },
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const job = updateJobByNodeJobId(nodeJobId, (current) => {
      const updated = { ...current };

      if (event === 'job_start') {
        updated.status = 'processing';
        updated.logs = [...updated.logs, 'Synthara Node: job started'];
      } else if (event === 'progress') {
        const data = payload.data || {};
        const rows = Array.isArray(data.rows) ? data.rows : [];
        const progress = data.progress ?? undefined;
        const logs: string = data.logs ?? '';

        if (rows.length > 0) {
          updated.rows = [...updated.rows, ...rows];
        }
        if (progress && typeof progress.current === 'number' && typeof progress.total === 'number') {
          updated.progress = {
            current: progress.current,
            total: progress.total,
          };
        }
        if (logs) {
          updated.logs = [...updated.logs, String(logs)];
        }
        updated.status = 'processing';
      } else if (event === 'job_complete') {
        updated.status = 'completed';
        updated.logs = [...updated.logs, 'Synthara Node: extraction completed'];
      } else if (event === 'data_cleaned') {
        const data = payload.data || {};
        const rows = Array.isArray(data.rows) ? data.rows : [];
        const csv = typeof data.csv === 'string' ? data.csv : undefined;

        if (rows.length > 0) {
          updated.rows = rows;
        }
        if (csv) {
          updated.csv = csv;
        }
        updated.status = 'cleaned';
        updated.logs = [...updated.logs, 'Synthara Node: data cleaned'];
      } else if (event === 'error') {
        const errorMessage: string = payload.error || 'Unknown error from Synthara Node';
        updated.status = 'failed';
        updated.error = errorMessage;
        updated.logs = [...updated.logs, `Synthara Node error: ${errorMessage}`];
      }

      return updated;
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'No matching Synthara job found for this jobId' },
        {
          status: 404,
          headers: corsHeaders(),
        },
      );
    }

    const baseEvent = {
      timestamp: new Date().toISOString(),
    };

    if (event === 'job_start') {
      publishSyntharaEvent(job.appJobId, {
        ...baseEvent,
        type: 'info',
        message: 'Synthara Node: job started',
      });
    } else if (event === 'progress') {
      const data = payload.data || {};
      const progress = data.progress;
      const logs: string = data.logs ?? '';

      if (progress && typeof progress.current === 'number' && typeof progress.total === 'number') {
        const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
        publishSyntharaEvent(job.appJobId, {
          ...baseEvent,
          type: 'progress',
          step: 'Synthara Node',
          current: progress.current,
          total: progress.total,
          percentage,
          message: `Synthara Node progress (${progress.current}/${progress.total})`,
        });
      }

      if (logs) {
        publishSyntharaEvent(job.appJobId, {
          ...baseEvent,
          type: 'info',
          message: String(logs),
        });
      }
    } else if (event === 'job_complete') {
      publishSyntharaEvent(job.appJobId, {
        ...baseEvent,
        type: 'info',
        message: 'Synthara Node: extraction completed',
      });
    } else if (event === 'data_cleaned') {
      const data = payload.data || {};
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const csv = typeof data.csv === 'string' ? data.csv : '';

      let schema: Array<{ name: string; type: string }> = [];
      if (rows.length > 0) {
        const sample = rows[0] as Record<string, unknown>;
        const keys = Object.keys(sample);
        schema = keys.map((key) => {
          const value = (sample as any)[key];
          let type = 'string';
          if (typeof value === 'number') type = 'number';
          else if (typeof value === 'boolean') type = 'boolean';
          return { name: key, type };
        });
      }

      publishSyntharaEvent(job.appJobId, {
        ...baseEvent,
        type: 'complete',
        result: {
          data: rows,
          csv,
          schema,
          feedback: 'Synthara Node data cleaning complete',
        },
      });
    } else if (event === 'error') {
      const errorMessage: string = payload.error || 'Unknown error from Synthara Node';
      publishSyntharaEvent(job.appJobId, {
        ...baseEvent,
        type: 'error',
        message: errorMessage,
      });
    }

    return NextResponse.json(
      {
        success: true,
        appJobId: job.appJobId,
        status: job.status,
      },
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to process Synthara webhook payload',
      },
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}
