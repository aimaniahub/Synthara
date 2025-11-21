const jobClients = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

const encoder = new TextEncoder();

export function addSyntharaClient(jobId: string, controller: ReadableStreamDefaultController<Uint8Array>): string {
  const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  let set = jobClients.get(jobId);
  if (!set) {
    set = new Set();
    jobClients.set(jobId, set);
  }
  set.add(controller);
  return clientId;
}

export function removeSyntharaClient(jobId: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
  const set = jobClients.get(jobId);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) {
    jobClients.delete(jobId);
  }
}

export function publishSyntharaEvent(jobId: string, event: any): void {
  const set = jobClients.get(jobId);
  if (!set || set.size === 0) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const chunk = encoder.encode(payload);

  for (const controller of set) {
    try {
      if (controller.desiredSize !== null) {
        controller.enqueue(chunk);
      }
    } catch {
      set.delete(controller);
    }
  }

  if (set.size === 0) {
    jobClients.delete(jobId);
  }
}
