/**
 * CSV Polling Service
 * 
 * Handles polling for CSV files with exponential backoff retry logic.
 * Treats 404 as "not ready yet" instead of an error.
 */

export interface PollingOptions {
    /** Timestamp when the job started (to ensure we get a NEW CSV) */
    jobStartTime: number;
    /** Maximum time to wait in milliseconds (default: 5 minutes) */
    maxWaitTime?: number;
    /** Initial polling interval in milliseconds (default: 2 seconds) */
    initialInterval?: number;
    /** Maximum polling interval in milliseconds (default: 10 seconds) */
    maxInterval?: number;
    /** Callback for progress updates */
    onProgress?: (message: string, attempt: number, maxAttempts: number) => void;
    /** Callback for errors (non-fatal, informational) */
    onError?: (error: string) => void;
}

export interface PollingResult {
    success: boolean;
    data?: any[];
    csv?: string;
    schema?: Array<{ name: string; type: string; description?: string }>;
    filename?: string;
    modifiedAt?: string;
    error?: string;
    timedOut?: boolean;
}

/**
 * Poll for the latest CSV file with exponential backoff
 */
export async function pollForLatestCsv(
    options: PollingOptions
): Promise<PollingResult> {
    const {
        jobStartTime,
        maxWaitTime = 5 * 60 * 1000, // 5 minutes default
        initialInterval = 2000, // 2 seconds
        maxInterval = 10000, // 10 seconds
        onProgress,
        onError,
    } = options;

    const startTime = Date.now();
    let currentInterval = initialInterval;
    let attempt = 0;
    const maxAttempts = Math.ceil(maxWaitTime / initialInterval);

    while (Date.now() - startTime < maxWaitTime) {
        attempt++;

        try {
            // Update progress
            if (onProgress) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const message = `Waiting for CSV file... (${elapsed}s elapsed, attempt ${attempt})`;
                onProgress(message, attempt, maxAttempts);
            }

            // Make the request
            const response = await fetch('/api/backend/latest-csv', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });

            // Handle different response statuses
            if (response.status === 202) {
                // 202 Accepted - CSV not ready yet, this is expected
                if (onProgress) {
                    onProgress(`CSV generation in progress...`, attempt, maxAttempts);
                }
                // Continue polling
            } else if (response.status === 404) {
                // 404 - No CSV exists yet, treat as "not ready"
                if (onProgress) {
                    onProgress(`Waiting for CSV file to be created...`, attempt, maxAttempts);
                }
                // Continue polling
            } else if (response.ok) {
                // 200 - Success! Parse the response
                const payload = await response.json().catch(() => null);

                if (!payload || !payload.success) {
                    // Invalid response, continue polling
                    if (onError) {
                        onError('Received invalid response from server');
                    }
                } else {
                    // Check if this CSV is newer than our job start time
                    const modifiedAt = payload.modifiedAt;
                    if (modifiedAt) {
                        const mtime = new Date(modifiedAt).getTime();
                        if (Number.isFinite(mtime) && mtime > jobStartTime) {
                            // Success! We found a new CSV
                            const rows = Array.isArray(payload.data) ? payload.data : [];
                            const csv = typeof payload.csv === 'string' ? payload.csv : '';
                            const rawSchema = Array.isArray(payload.schema) ? payload.schema : [];
                            const schema = rawSchema.map((col: any) => ({
                                name: String(col.name),
                                type: String(col.type || 'string'),
                                description: col.description ? String(col.description) : undefined,
                            }));

                            return {
                                success: true,
                                data: rows,
                                csv,
                                schema,
                                filename: payload.filename,
                                modifiedAt: payload.modifiedAt,
                            };
                        } else {
                            // CSV exists but is older than our job, keep waiting
                            if (onProgress) {
                                onProgress(`Found old CSV, waiting for new one...`, attempt, maxAttempts);
                            }
                        }
                    } else {
                        // No modification time, accept it anyway
                        const rows = Array.isArray(payload.data) ? payload.data : [];
                        const csv = typeof payload.csv === 'string' ? payload.csv : '';
                        const rawSchema = Array.isArray(payload.schema) ? payload.schema : [];
                        const schema = rawSchema.map((col: any) => ({
                            name: String(col.name),
                            type: String(col.type || 'string'),
                            description: col.description ? String(col.description) : undefined,
                        }));

                        return {
                            success: true,
                            data: rows,
                            csv,
                            schema,
                            filename: payload.filename,
                            modifiedAt: payload.modifiedAt,
                        };
                    }
                }
            } else if (response.status >= 500) {
                // Server error - this is a real error, but we'll retry
                if (onError) {
                    onError(`Server error (${response.status}), retrying...`);
                }
            }

            // Wait before next attempt with exponential backoff
            await new Promise(resolve => setTimeout(resolve, currentInterval));

            // Increase interval for next attempt (exponential backoff)
            currentInterval = Math.min(currentInterval * 1.5, maxInterval);

        } catch (error: any) {
            // Network error or other exception
            if (onError) {
                onError(`Network error: ${error.message}`);
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, currentInterval));
            currentInterval = Math.min(currentInterval * 1.5, maxInterval);
        }
    }

    // Timeout reached
    return {
        success: false,
        error: 'Timeout: CSV file was not generated within the maximum wait time (5 minutes)',
        timedOut: true,
    };
}
