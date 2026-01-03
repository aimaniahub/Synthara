import { NextRequest, NextResponse } from 'next/server';
import { SimpleAI } from '@/ai/simple-ai';

export const runtime = 'nodejs';


type ColType = 'number' | 'string';

type SchemaCol = { name: string; type: ColType };

type ColumnPlan = {
  name: string;
  type: ColType;
  trim?: boolean;
  parseNumber?: boolean;
  fillStrategy?: 'median' | 'mean' | 'mode' | 'constant' | 'none';
  fillValue?: any;
  dropIfMissing?: boolean;
  replace?: Array<{ from: any; to: any }>;
};

type CleaningPlan = {
  target?: string;
  dropRowsWithMissingTarget?: boolean;
  columns: ColumnPlan[];
  rationale?: string;
};

function isMissing(v: any) {
  return (
    v === null ||
    v === undefined ||
    (typeof v === 'number' && Number.isNaN(v)) ||
    (typeof v === 'string' && v.trim() === '')
  );
}

function median(nums: number[]) {
  const arr = nums.slice().sort((a, b) => a - b);
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function mode(arr: any[]) {
  const freq = new Map<any, number>();
  for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
  let best: any = null;
  let bestC = -1;
  for (const [k, c] of freq.entries()) {
    if (c > bestC) {
      best = k;
      bestC = c;
    }
  }
  return best ?? '';
}

function buildDefaultPlan(schema: SchemaCol[], target?: string): CleaningPlan {
  return {
    target,
    dropRowsWithMissingTarget: true,
    columns: schema.map((c) => ({
      name: c.name,
      type: c.type,
      trim: c.type === 'string',
      parseNumber: c.type === 'string',
      fillStrategy: c.type === 'number' ? 'median' : 'mode',
      dropIfMissing: false,
    })),
  };
}

function applyPlan(rows: any[], schema: SchemaCol[], plan: CleaningPlan) {
  const colByName: Record<string, SchemaCol> = Object.fromEntries(schema.map((c) => [c.name, c]));
  const planByName: Record<string, ColumnPlan> = Object.fromEntries(
    (plan.columns || []).map((c) => [c.name, c])
  );

  const totalRows = rows.length || 1;
  const missingCounts: Record<string, number> = {};
  for (const sc of schema) {
    missingCounts[sc.name] = 0;
  }
  for (const row of rows) {
    for (const sc of schema) {
      const v = row?.[sc.name];
      if (isMissing(v)) {
        missingCounts[sc.name] = (missingCounts[sc.name] || 0) + 1;
      }
    }
  }

  const sparseCols = new Set(
    schema
      .filter((sc) => (missingCounts[sc.name] || 0) / totalRows >= 0.6)
      .map((sc) => sc.name)
  );

  const cleaned: any[] = [];
  const fillMap: Record<string, any> = {};
  for (const sc of schema) {
    if (sparseCols.has(sc.name)) {
      continue;
    }
    const pl = planByName[sc.name] || { name: sc.name, type: sc.type };
    const values = rows.map((r) => r?.[sc.name]).filter((v) => !isMissing(v));
    const parsedNums: number[] = [];
    if (pl.parseNumber) {
      for (const v of values) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isNaN(n)) parsedNums.push(n);
      }
    }
    switch (pl.fillStrategy) {
      case 'median':
        fillMap[sc.name] = median(
          values
            .map((v) => (typeof v === 'number' ? v : Number(v)))
            .filter((n) => !Number.isNaN(n))
        );
        break;
      case 'mean': {
        const nums = values
          .map((v) => (typeof v === 'number' ? v : Number(v)))
          .filter((n) => !Number.isNaN(n));
        fillMap[sc.name] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        break;
      }
      case 'mode':
        fillMap[sc.name] = mode(values.map((v) => v ?? ''));
        break;
      case 'constant':
        fillMap[sc.name] = pl.fillValue;
        break;
      default:
        break;
    }
    if (
      pl.fillStrategy === 'median' &&
      (fillMap[sc.name] === undefined ||
        fillMap[sc.name] === null ||
        Number.isNaN(fillMap[sc.name]))
    )
      fillMap[sc.name] = 0;
    if (
      pl.fillStrategy === 'mean' &&
      (fillMap[sc.name] === undefined ||
        fillMap[sc.name] === null ||
        Number.isNaN(fillMap[sc.name]))
    )
      fillMap[sc.name] = 0;
    if (pl.fillStrategy === 'mode' && (fillMap[sc.name] === undefined || fillMap[sc.name] === null))
      fillMap[sc.name] = '';
  }

  for (const row of rows) {
    const out: any = { ...row };
    for (const sc of schema) {
      const name = sc.name;
      if (sparseCols.has(name)) {
        delete out[name];
        continue;
      }
      const pl = planByName[name] || { name, type: sc.type };
      let v = out[name];
      if (pl.trim && typeof v === 'string') v = v.trim();
      if (pl.replace && pl.replace.length) {
        for (const rp of pl.replace) {
          if (v === rp.from) v = rp.to;
        }
      }
      if (pl.parseNumber && typeof v === 'string') {
        const n = Number(v);
        if (!Number.isNaN(n)) v = n;
      }
      if (isMissing(v)) {
        if (pl.dropIfMissing) {
          v = undefined;
        } else if (pl.fillStrategy && pl.fillStrategy !== 'none') {
          v = fillMap[name];
        }
      }
      out[name] = v;
    }
    cleaned.push(out);
  }

  const tgt = plan.target;
  const dropMissingTarget = plan.dropRowsWithMissingTarget !== false;
  const finalRows = cleaned.filter((r) => {
    if (!tgt) return true;
    const val = r[tgt];
    if (!dropMissingTarget) return true;
    return !isMissing(val);
  });

  // Smart Fix requirement: preserve row count when possible.
  // If rows would be dropped due to missing target, fall back to original rows.
  if (finalRows.length !== rows.length) {
    return rows;
  }

  return finalRows;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const schema: SchemaCol[] = Array.isArray(body?.schema) ? body.schema : [];
    const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
    const target: string | undefined =
      typeof body?.target === 'string' && body.target.trim() !== '' ? body.target : undefined;
    const userQuery: string | undefined =
      typeof body?.userQuery === 'string' && body.userQuery.trim() !== '' ? body.userQuery : undefined;

    if (!schema.length || !rows.length) {
      return NextResponse.json(
        { success: false, error: 'schema and rows are required' },
        { status: 400 }
      );
    }

    const limited = rows.slice(0, 150);
    const colSummary = schema.map((c) => c.name + ':' + c.type).join(', ');
    const missingSummary = Object.fromEntries(
      schema.map((c) => [c.name, limited.filter((r) => isMissing(r?.[c.name])).length])
    );

    const hasSource = schema.some((c) => c.name === 'source');

    const prompt = `You are an advanced data cleaner and enrichment agent.
You receive a dataset schema and sample rows. Your job is to design a JSON cleaning plan
that can be applied deterministically to the full dataset to fix missing / inconsistent values.

You can use your knowledge of the real world and the meaning of columns to choose good fill
strategies (e.g., for restaurant ratings, EV station details, movie metadata, financial data, etc.).

If there is a column named "source", treat it as the URL or identifier of the original web page
for that row. Use it as a strong hint about where the row came from. Assume you already know
what typical data from such sources looks like, and design a plan that will reasonably fill
missing values based on that context.

DO NOT output the cleaned rows themselves. Instead, output ONLY a compact JSON plan with
per-column rules using this exact structure:
{
  "target": "<optional target column name>",
  "dropRowsWithMissingTarget": true,
  "columns": [
    {
      "name": "column_name",
      "type": "number" | "string",
      "trim": true,
      "parseNumber": true,
      "fillStrategy": "median" | "mean" | "mode" | "constant" | "none",
      "fillValue": any,
      "dropIfMissing": false,
      "replace": [
        { "from": any, "to": any }
      ]
    }
  ],
  "rationale": "short explanation"
}

Guidelines:
- For numeric-like columns: parse numbers from strings when possible; fill missing with median or mean
  based on what makes sense for the data.
- For IDs or URLs (including "source"): do NOT drop or heavily modify them; keep them as strings.
- For categorical/text columns: trim whitespace; normalize obvious aliases; fill missing with the most
  common or a sensible default like "Unknown".
- Prefer filling over dropping rows. Only set dropRowsWithMissingTarget=true when absolutely necessary.
- Keep column names exactly as given.

User Query / Context: ${userQuery || '-'}
Schema: ${colSummary}
Target: ${target || '-'}
Has source column: ${hasSource}
Missing counts in first ${limited.length} rows: ${JSON.stringify(missingSummary)}
Sample rows (first ${limited.length}): ${JSON.stringify(limited).slice(0, 11000)}
`;

    let plan: CleaningPlan | null = null;
    try {
      const result = await SimpleAI.generate({
        prompt: prompt,
        model: process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free',
        maxTokens: 4000,
        temperature: 0.3,
      });
      const text = result.text;

      // Extract JSON from potential markdown code blocks
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      // Remove trailing commas before closing brackets/braces (common AI mistake)
      jsonText = jsonText.replace(/,(\s*[\]}])/g, '$1').trim();

      // Try to find JSON object if still not valid
      if (!jsonText.startsWith('{')) {
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) {
          jsonText = match[0];
        }
      }

      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.columns)) {
        plan = parsed as CleaningPlan;
      }
    } catch (err: any) {
      console.error('[SmartFix] AI planning failed, falling back to default plan:', err?.message || err);
    }

    if (!plan) plan = buildDefaultPlan(schema, target);

    const normalized: CleaningPlan = {
      target: target ?? plan.target,
      dropRowsWithMissingTarget: plan.dropRowsWithMissingTarget !== false,
      columns: schema.map((c) => {
        const p = (plan as CleaningPlan).columns?.find((x) => x.name === c.name) || {
          name: c.name,
          type: c.type,
        };
        const out: ColumnPlan = {
          name: c.name,
          type: c.type,
          trim: p.trim ?? (c.type === 'string'),
          parseNumber: p.parseNumber ?? (c.type === 'string'),
          fillStrategy: p.fillStrategy ?? (c.type === 'number' ? 'median' : 'mode'),
          fillValue: p.fillValue,
          dropIfMissing: p.dropIfMissing ?? false,
          replace: Array.isArray(p.replace) ? p.replace.slice(0, 20) : [],
        };
        return out;
      }),
      rationale: plan.rationale,
    };

    const cleanedRows = applyPlan(rows, schema, normalized);

    return NextResponse.json({ success: true, plan: normalized, cleanedRows });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to smart-fix dataset' },
      { status: 500 }
    );
  }
}
