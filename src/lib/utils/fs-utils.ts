import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, mkdirSync } from 'fs';

/**
 * Returns a writable temporary directory path.
 * In production (Vercel/Render serverless/functions), this is /tmp.
 * In development, this is process.cwd()/temp.
 */
export function getWritableTempDir(subDir?: string): string {
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

    // In serverless environments like Vercel, ONLY /tmp is writable
    const baseDir = isProd ? '/tmp' : join(process.cwd(), 'temp');

    const finalDir = subDir ? join(baseDir, subDir) : baseDir;

    // Ensure the directory exists
    try {
        if (!existsSync(finalDir)) {
            mkdirSync(finalDir, { recursive: true });
        }
    } catch (err) {
        console.error(`[FS-UTILS] Failed to create directory ${finalDir}:`, err);
    }

    return finalDir;
}

/**
 * Resolves a path within the writable temp directory.
 */
export function resolveTempPath(filename: string, subDir?: string): string {
    return join(getWritableTempDir(subDir), filename);
}
