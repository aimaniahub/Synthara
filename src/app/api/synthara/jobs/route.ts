import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildSyntharaJobInput } from '@/lib/synthara/job-builder';
import { attachInputToJob, createSyntharaJob } from '@/lib/synthara/job-store';

const createJobSchema = z.object({
  userQuery: z.string().min(1, 'userQuery is required'),
  numRows: z.number().int().min(1).max(300).default(100),
  maxUrls: z.number().int().min(1).max(15).default(10),
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const raw = await request.json().catch(() => ({}));
    const parsed = createJobSchema.parse(raw);

    const job = createSyntharaJob({
      userQuery: parsed.userQuery,
      numRows: parsed.numRows,
      maxUrls: parsed.maxUrls,
    });

    const input = await buildSyntharaJobInput({
      userQuery: parsed.userQuery,
      numRows: parsed.numRows,
      maxUrls: parsed.maxUrls,
    });

    input.metadata.jobId = job.appJobId;
    attachInputToJob(job.appJobId, input);

    return NextResponse.json(
      {
        success: true,
        jobId: job.appJobId,
        metadata: input.metadata,
      },
      {
        status: 201,
        headers: corsHeaders(),
      },
    );
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'Failed to create Synthara job';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 400,
        headers: corsHeaders(),
      },
    );
  }
}
