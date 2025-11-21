import { NextRequest, NextResponse } from 'next/server';
import { getLatestSyntharaJob } from '@/lib/synthara/job-store';

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

export async function GET(_request: NextRequest) {
  const job = getLatestSyntharaJob();

  if (!job || !job.input) {
    return NextResponse.json(
      { error: 'No prepared Synthara job available' },
      {
        status: 404,
        headers: corsHeaders(),
      },
    );
  }

  // Ensure jobId is present in metadata for easier debugging on the Node side
  const payload = {
    ...job.input,
    metadata: {
      ...job.input.metadata,
      jobId: job.appJobId,
    },
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: corsHeaders(),
  });
}
