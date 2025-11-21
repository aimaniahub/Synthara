export type SyntharaJobStatus = 'pending' | 'processing' | 'completed' | 'cleaned' | 'failed';

export interface SyntharaJobInputSource {
  metadata: {
    userQuery: string;
    scrapedAt: string;
    totalSources: number;
    jobId?: string;
    [key: string]: any;
  };
  sources: Array<{
    id: number;
    url: string;
    title: string;
    content: string;
  }>;
  rawInput?: string;
}

export interface SyntharaJobState {
  appJobId: string;
  nodeJobId?: string;
  status: SyntharaJobStatus;
  createdAt: string;
  updatedAt: string;
  userQuery: string;
  numRows: number;
  maxUrls: number;
  input?: SyntharaJobInputSource;
  progress?: {
    current: number;
    total: number;
  };
  rows: Array<Record<string, any>>;
  csv?: string;
  logs: string[];
  error?: string;
}

const jobs = new Map<string, SyntharaJobState>();

function generateJobId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${now}-${rand}`;
}

export function createSyntharaJob(params: {
  userQuery: string;
  numRows: number;
  maxUrls: number;
  input?: SyntharaJobInputSource;
}): SyntharaJobState {
  const appJobId = generateJobId();
  const now = new Date().toISOString();

  const job: SyntharaJobState = {
    appJobId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    userQuery: params.userQuery,
    numRows: params.numRows,
    maxUrls: params.maxUrls,
    input: params.input,
    rows: [],
    logs: [],
  };

  jobs.set(appJobId, job);
  return job;
}

export function attachInputToJob(appJobId: string, input: SyntharaJobInputSource): SyntharaJobState | undefined {
  const job = jobs.get(appJobId);
  if (!job) return undefined;
  job.input = input;
  job.updatedAt = new Date().toISOString();
  jobs.set(appJobId, job);
  return job;
}

export function getSyntharaJob(appJobId: string): SyntharaJobState | undefined {
  return jobs.get(appJobId);
}

export function getLatestSyntharaJob(): SyntharaJobState | undefined {
  let latest: SyntharaJobState | undefined;
  for (const job of jobs.values()) {
    if (!latest || job.createdAt > latest.createdAt) {
      latest = job;
    }
  }
  return latest;
}

export function findJobByNodeJobId(nodeJobId: string): SyntharaJobState | undefined {
  for (const job of jobs.values()) {
    if (job.nodeJobId === nodeJobId) return job;
  }
  return undefined;
}

export function bindFirstPendingJobToNodeJob(nodeJobId: string): SyntharaJobState | undefined {
  let candidate: SyntharaJobState | undefined;
  for (const job of jobs.values()) {
    if (job.status === 'pending' && !job.nodeJobId) {
      if (!candidate || job.createdAt < candidate.createdAt) {
        candidate = job;
      }
    }
  }
  if (!candidate) return undefined;
  candidate.nodeJobId = nodeJobId;
  candidate.status = 'processing';
  candidate.updatedAt = new Date().toISOString();
  jobs.set(candidate.appJobId, candidate);
  return candidate;
}

export function updateJobByNodeJobId(
  nodeJobId: string,
  updater: (job: SyntharaJobState) => SyntharaJobState | void,
): SyntharaJobState | undefined {
  let job = findJobByNodeJobId(nodeJobId);
  if (!job) {
    job = bindFirstPendingJobToNodeJob(nodeJobId);
  }
  if (!job) return undefined;
  const result = updater(job) || job;
  result.updatedAt = new Date().toISOString();
  jobs.set(result.appJobId, result);
  return result;
}
