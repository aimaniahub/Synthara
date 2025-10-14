/**
 * CSV Utilities
 * Utility functions for CSV handling and downloads
 */

/**
 * Download CSV content as a file in the browser
 */
export function downloadCSV(csvContent: string, filename: string = 'data.csv'): void {
  try {
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
    
    console.log(`[CSVUtils] Downloaded CSV file: ${filename}`);
  } catch (error) {
    console.error('[CSVUtils] Download error:', error);
    throw new Error('Failed to download CSV file');
  }
}

/**
 * Generate a filename based on the current date and query
 */
export function generateCSVFilename(query: string, timestamp?: Date): string {
  const now = timestamp || new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  // Clean the query for filename
  const cleanQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 30); // Limit length
  
  return `synthara_data_${cleanQuery}_${dateStr}_${timeStr}.csv`;
}

/**
 * Validate CSV content
 */
export function validateCSV(csvContent: string): { valid: boolean; error?: string; rowCount?: number; columnCount?: number } {
  try {
    if (!csvContent || csvContent.trim().length === 0) {
      return { valid: false, error: 'CSV content is empty' };
    }

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return { valid: false, error: 'CSV must have at least a header and one data row' };
    }

    const header = lines[0];
    const columnCount = header.split(',').length;
    
    // Check if all rows have the same number of columns
    for (let i = 1; i < lines.length; i++) {
      const rowColumns = lines[i].split(',').length;
      if (rowColumns !== columnCount) {
        return { 
          valid: false, 
          error: `Row ${i + 1} has ${rowColumns} columns, expected ${columnCount}` 
        };
      }
    }

    return {
      valid: true,
      rowCount: lines.length - 1, // Exclude header
      columnCount
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `CSV validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Format CSV content for display (truncate long content)
 */
export function formatCSVForDisplay(csvContent: string, maxRows: number = 20): {
  displayContent: string;
  totalRows: number;
  isTruncated: boolean;
} {
  try {
    const lines = csvContent.trim().split('\n');
    const totalRows = lines.length - 1; // Exclude header
    const isTruncated = totalRows > maxRows;
    
    if (isTruncated) {
      const displayLines = lines.slice(0, maxRows + 1); // Include header + maxRows data rows
      return {
        displayContent: displayLines.join('\n'),
        totalRows,
        isTruncated: true
      };
    }
    
    return {
      displayContent: csvContent,
      totalRows,
      isTruncated: false
    };
  } catch (error) {
    console.error('[CSVUtils] Format display error:', error);
    return {
      displayContent: csvContent,
      totalRows: 0,
      isTruncated: false
    };
  }
}

/**
 * Convert JSON data to CSV string
 */
export function jsonToCSV(data: Array<Record<string, any>>): string {
  if (!data || data.length === 0) {
    return '';
  }

  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(','), // header row
    ...data.map(row =>
      keys.map(key => {
        let cell = row[key] === null || row[key] === undefined ? '' : String(row[key]);
        cell = cell.replace(/"/g, '""'); // escape double quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
          cell = `"${cell}"`; // quote cells with commas, quotes, or newlines
        }
        return cell;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

/**
 * Parse CSV string to JSON data
 */
export function csvToJSON(csvContent: string): Array<Record<string, any>> {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Array<Record<string, any>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  } catch (error) {
    console.error('[CSVUtils] Parse CSV error:', error);
    return [];
  }
}

/**
 * Get CSV statistics
 */
export function getCSVStats(csvContent: string): {
  rowCount: number;
  columnCount: number;
  fileSize: number;
  hasHeader: boolean;
} {
  try {
    const lines = csvContent.trim().split('\n');
    const rowCount = Math.max(0, lines.length - 1); // Exclude header
    const columnCount = lines.length > 0 ? lines[0].split(',').length : 0;
    const fileSize = new Blob([csvContent]).size;
    const hasHeader = lines.length > 0;

    return {
      rowCount,
      columnCount,
      fileSize,
      hasHeader
    };
  } catch (error) {
    console.error('[CSVUtils] Get stats error:', error);
    return {
      rowCount: 0,
      columnCount: 0,
      fileSize: 0,
      hasHeader: false
    };
  }
}
