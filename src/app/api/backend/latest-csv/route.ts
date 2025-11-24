import { NextResponse } from 'next/server';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else if (ch === '"') {
      inQuotes = true;
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

export async function GET() {
  try {
    const outputDir = join(process.cwd(), 'output');
    if (!existsSync(outputDir)) {
      return NextResponse.json(
        { success: false, status: 'not_ready', error: 'Output directory not found' },
        {
          status: 202,
          headers: {
            'Retry-After': '5',
          },
        },
      );
    }

    const entries = readdirSync(outputDir).filter((name) => name.toLowerCase().endsWith('.csv'));
    if (!entries.length) {
      return NextResponse.json(
        { success: false, status: 'not_ready', error: 'No CSV files found in output directory' },
        {
          status: 202,
          headers: {
            'Retry-After': '5',
          },
        },
      );
    }

    const filesWithStats = entries.map((name) => {
      const fullPath = join(outputDir, name);
      const stats = statSync(fullPath);
      return {
        name,
        fullPath,
        mtimeMs: stats.mtimeMs,
      };
    });

    filesWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const latest = filesWithStats[0];

    const csvRaw = readFileSync(latest.fullPath, 'utf8');
    const trimmed = csvRaw.trim();
    if (!trimmed) {
      return NextResponse.json({
        success: true,
        status: 'ready',
        filename: latest.name,
        modifiedAt: new Date(latest.mtimeMs).toISOString(),
        csv: csvRaw,
        data: [],
        schema: [],
      });
    }

    const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) {
      return NextResponse.json({
        success: true,
        status: 'ready',
        filename: latest.name,
        modifiedAt: new Date(latest.mtimeMs).toISOString(),
        csv: csvRaw,
        data: [],
        schema: [],
      });
    }

    const headerCells = parseCsvLine(lines[0]).map((h) => h.trim());
    const headers = headerCells.filter((h) => h.length > 0);

    const rows = lines.slice(1).map((line) => {
      const cells = parseCsvLine(line);
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = index < cells.length ? cells[index] : '';
      });
      return row;
    });

    const schema = headers.map((name) => ({ name, type: 'string' }));

    return NextResponse.json({
      success: true,
      status: 'ready',
      filename: latest.name,
      modifiedAt: new Date(latest.mtimeMs).toISOString(),
      csv: csvRaw,
      data: rows,
      schema,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to read latest CSV from output directory' },
      { status: 500 },
    );
  }
}
