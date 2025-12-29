/**
 * Utility to run a promise with a timeout.
 * @param p The promise to run
 * @param ms Timeout in milliseconds
 * @param fallback Fallback value if timeout occurs
 */
export async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), ms);
    });

    // Prevent unhandled rejection if p fails after timeout
    p.catch(() => null);

    return Promise.race([p, timeoutPromise]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
    }) as Promise<T>;
}
