/**
 * Generates a CSV string from an array of records and a schema.
 */
export function generateCSV(
    rows: Array<Record<string, any>>,
    schema: Array<{ name: string; type: string }>
): string {
    if (!rows.length || !schema.length) return '';

    const headers = schema.map(col => col.name);
    const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');

    const dataRows = rows.map(row => {
        return headers.map(header => {
            let val = row[header];
            if (val === undefined || val === null) val = '';

            const strVal = String(val);
            // Escape quotes and wrap in quotes
            return `"${strVal.replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
}
