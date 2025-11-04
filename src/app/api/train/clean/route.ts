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
  replace?: Array<{ from: any; to: any }>; // e.g., {from: '', to: 'Unknown'}
};

type CleaningPlan = {
  target?: string;
  dropRowsWithMissingTarget?: boolean;
  columns: ColumnPlan[];
  rationale?: string;
};

function isMissing(v: any) {
  return v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) || (typeof v === 'string' && v.trim() === '');
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
    if (c > bestC) { best = k; bestC = c; }
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
  const planByName: Record<string, ColumnPlan> = Object.fromEntries((plan.columns || []).map((c) => [c.name, c]));

  // Pre-compute fill values if strategy requires data stats
  const fillMap: Record<string, any> = {};
  for (const sc of schema) {
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
        fillMap[sc.name] = median(values.map((v) => (typeof v === 'number' ? v : Number(v))).filter((n) => !Number.isNaN(n)));
        break;
      case 'mean': {
        const nums = values.map((v) => (typeof v === 'number' ? v : Number(v))).filter((n) => !Number.isNaN(n));
        fillMap[sc.name] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        break;
      }
      case 'mode':
        fillMap[sc.name] = mode(values.map((v) => (v ?? '')));
        break;
      case 'constant':
        fillMap[sc.name] = pl.fillValue;
        break;
      default:
        break;
    }
    // If parseNumber requested and stats missing, fallback
    if (pl.fillStrategy === 'median' && (fillMap[sc.name] === undefined || fillMap[sc.name] === null || Number.isNaN(fillMap[sc.name]))) fillMap[sc.name] = 0;
    if (pl.fillStrategy === 'mean' && (fillMap[sc.name] === undefined || fillMap[sc.name] === null || Number.isNaN(fillMap[sc.name]))) fillMap[sc.name] = 0;
    if (pl.fillStrategy === 'mode' && (fillMap[sc.name] === undefined || fillMap[sc.name] === null)) fillMap[sc.name] = '';
  }

  const cleaned: any[] = [];
  for (const row of rows) {
    const out: any = { ...row };
    for (const sc of schema) {
      const name = sc.name;
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
          v = undefined; // mark; will decide row drop below
        } else if (pl.fillStrategy && pl.fillStrategy !== 'none') {
          v = fillMap[name];
        }
      }
      out[name] = v;
    }
    cleaned.push(out);
  }

  const tgt = plan.target;
  const dropMissingTarget = plan.dropRowsWithMissingTarget !== false; // default true
  const finalRows = cleaned.filter((r) => {
    if (!tgt) return true;
    const val = r[tgt];
    if (!dropMissingTarget) return true;
    return !isMissing(val);
  });

  return finalRows;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const schema: SchemaCol[] = Array.isArray(body?.schema) ? body.schema : [];
    const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
    const target: string | undefined = typeof body?.target === 'string' ? body.target : undefined;

    if (!schema.length || !rows.length) {
      return NextResponse.json({ success: false, error: 'schema and rows are required' }, { status: 400 });
    }

    // Summarize columns for prompt
    const limited = rows.slice(0, 150);
    const colSummary = schema.map((c) => c.name + ':' + c.type).join(', ');
    const missingSummary = Object.fromEntries(schema.map((c) => [c.name, limited.filter((r) => isMissing(r?.[c.name])).length]));

    const responseSchema = {
      type: 'object',
      properties: {
        target: { type: 'string' },
        dropRowsWithMissingTarget: { type: 'boolean' },
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { enum: ['number', 'string'] },
              trim: { type: 'boolean' },
              parseNumber: { type: 'boolean' },
              fillStrategy: { enum: ['median', 'mean', 'mode', 'constant', 'none'] },
              fillValue: {},
              dropIfMissing: { type: 'boolean' },
              replace: { type: 'array', items: { type: 'object', properties: { from: {}, to: {} }, required: ['from', 'to'] } },
            },
            required: ['name', 'type']
          },
        },
        rationale: { type: 'string' },
      },
      required: ['columns']
    };

    const prompt = `You are a data cleaner.
Given a dataset schema and small sample rows, propose a concise JSON cleaning plan with per-column rules.
Do NOT output code, only a JSON plan matching the given schema.

Guidelines:
- For numeric columns: parse numbers from strings when possible; fill missing with median by default.
- For string columns: trim whitespace; fill missing with mode or "Unknown"; optional value replacements to normalize (e.g., 'N/A'->'').
- Only drop rows if the target is missing after filling, not for features (prefer fill over drop).
- Keep column names as-is.

Schema: ${colSummary}
Target: ${target || '-'}
Missing counts in first ${limited.length} rows: ${JSON.stringify(missingSummary)}
Sample rows (first ${limited.length}): ${JSON.stringify(limited).slice(0, 11000)}
`;

    let plan: CleaningPlan | null = null;
    try {
      const ai = await SimpleAI.generateWithSchema<CleaningPlan>({
        prompt,
        schema: responseSchema,
        temperature: 0.2,
        maxTokens: 3000,
      });
      plan = ai;
    } catch {}

    if (!plan) plan = buildDefaultPlan(schema, target);

    // Normalize plan content
    const normalized: CleaningPlan = {
      target: target ?? plan.target,
      dropRowsWithMissingTarget: plan.dropRowsWithMissingTarget !== false,
      columns: schema.map((c) => {
        const p = (plan as CleaningPlan).columns?.find((x) => x.name === c.name) || { name: c.name, type: c.type };
        return {
          name: c.name,
          type: c.type,
          trim: p.trim ?? (c.type === 'string'),
          parseNumber: p.parseNumber ?? (c.type === 'string'),
          fillStrategy: p.fillStrategy ?? (c.type === 'number' ? 'median' : 'mode'),
          fillValue: p.fillValue,
          dropIfMissing: p.dropIfMissing ?? false,
          replace: Array.isArray(p.replace) ? p.replace.slice(0, 20) : [],
        } as ColumnPlan;
      }),
      rationale: plan.rationale,
    };

    const cleanedRows = applyPlan(rows, schema, normalized);

    return NextResponse.json({ success: true, plan: normalized, cleanedRows });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to clean dataset' }, { status: 500 });
  }
}
