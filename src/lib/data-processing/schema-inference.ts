/**
 * Infers SQL-like types for a set of data values.
 */
export function inferType(values: any[]): string {
    const nonNull = values.filter((v: any) => v !== null && v !== undefined && v !== '');
    if (nonNull.length === 0) return 'string';

    const boolCount = nonNull.filter(
        (v: any) => typeof v === 'boolean' || v === 'true' || v === 'false'
    ).length;
    if (boolCount === nonNull.length) return 'boolean';

    const numCount = nonNull.filter(
        (v: any) =>
            typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))
    ).length;
    if (numCount === nonNull.length) return 'number';

    const dateCount = nonNull.filter((v: any) => {
        const d = new Date(v as any);
        return !isNaN(d.getTime()) && v.toString().length > 5; // Basic heuristic to avoid small numbers being treated as dates
    }).length;
    if (dateCount === nonNull.length) return 'date';

    return 'string';
}

/**
 * Automatically infers a schema from an array of records.
 */
export function inferSchema(rows: Array<Record<string, any>>): Array<{ name: string; type: string }> {
    const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row || {}))));

    // Sort keys to ensure 'source' or similar metadata columns are at the end if desired
    const sortedKeys = [...keys].sort((a, b) => {
        if (a === 'source' || a === 'url') return 1;
        if (b === 'source' || b === 'url') return -1;
        return 0;
    });

    return sortedKeys.map(k => ({
        name: k,
        type: inferType(rows.map(r => (r ? r[k] : undefined)))
    }));
}
