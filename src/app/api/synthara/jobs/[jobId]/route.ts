import { NextRequest, NextResponse } from 'next/server';
import { getSyntharaJob } from '@/lib/synthara/job-store';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  } as const;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

interface RouteContext {
  params: {
    jobId: string;
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const jobId = context.params.jobId;

  const job = getSyntharaJob(jobId);
  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      {
        status: 404,
        headers: corsHeaders(),
      },
    );
  }

  const rows = job.rows || [];
  const csv = job.csv || null;

  return NextResponse.json(
    {
      success: true,
      job: {
        appJobId: job.appJobId,
        nodeJobId: job.nodeJobId ?? null,
        status: job.status,
        userQuery: job.userQuery,
        numRows: job.numRows,
        maxUrls: job.maxUrls,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        progress: job.progress ?? null,
        error: job.error ?? null,
      },
      rows,
      csv,
      metadata: job.input?.metadata ?? null,
      logs: job.logs,
    },
    {
      status: 200,
      headers: corsHeaders(),
    },
  );
}
