import { NextRequest, NextResponse } from 'next/server';
import { type SuggestChartsRequest, type SuggestChartsResponse, type ColumnInfo, type ChartSpec } from '@/types/dataviz';
import { SimpleAI } from '@/ai/simple-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for AI operations

function pickCharts(columns: ColumnInfo[], datasetName?: string): ChartSpec[] {
  const nums = columns.filter(c => c.type === 'number');
  const cats = columns.filter(c => c.type === 'string' || c.type === 'boolean');
  const dates = columns.filter(c => c.type === 'date');
  const charts: ChartSpec[] = [];

  // 1. Time Series Count (Always useful if dates exist)
  if (dates.length) {
    charts.push({
      id: 'timeline_1',
      title: `Event Frequency over ${dates[0].name}`,
      description: `Timeline of activities recorded by ${dates[0].name}`,
      type: 'line',
      xField: dates[0].name,
      yField: '__count__',
      aggregation: 'count'
    });
  }

  // 2. Numeric Trends or Categorical Distributions
  if (nums.length && cats.length) {
    charts.push({
      id: 'bar_1',
      title: `${nums[0].name} by ${cats[0].name}`,
      description: `Average ${nums[0].name} distribution across ${cats[0].name}`,
      type: 'bar',
      xField: cats[0].name,
      yField: nums[0].name,
      aggregation: 'mean'
    });
  } else if (cats.length >= 2) {
    charts.push({
      id: 'bar_count_1',
      title: `Top ${cats[0].name} Categories`,
      description: `Distribution of records across ${cats[0].name}`,
      type: 'bar',
      xField: cats[0].name,
      yField: '__count__',
      aggregation: 'count',
    });
  }

  // 3. Proportions or Relationships
  if (nums.length >= 2) {
    charts.push({
      id: 'scatter_1',
      title: `${nums[0].name} vs ${nums[1].name}`,
      description: `Correlation analysis between ${nums[0].name} and ${nums[1].name}`,
      type: 'scatter',
      xField: nums[0].name,
      yField: nums[1].name
    });
  } else if (cats.length > 0 && charts.length < 3) {
    const catIdx = cats.length > 1 ? 1 : 0;
    charts.push({
      id: 'pie_1',
      title: `Share by ${cats[catIdx].name}`,
      description: `Proportional breakdown of ${cats[catIdx].name}`,
      type: 'pie',
      xField: cats[catIdx].name,
      yField: '__count__',
      aggregation: 'count'
    });
  }

  return charts.slice(0, 3);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SuggestChartsRequest;
    if (!body || !Array.isArray(body.columns) || body.columns.length === 0) {
      return NextResponse.json({ error: 'columns required' }, { status: 400 });
    }

    // Try AI first if OpenRouter is configured
    let aiCharts: ChartSpec[] | null = null;
    let aiModel: string | null = null;
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const schemaShape = {
          charts: [
            {
              id: 'chart_1',
              title: 'Title',
              description: 'Detailed description of the chart',
              mlInsight: 'A 1-point ML-focused summary of what this chart identifies in the data (e.g., correlations, outliers, distribution skew)',
              type: 'line|bar|scatter|histogram|box|pie|radar',
              xField: 'columnX',
              yField: 'columnY',
              aggregation: 'sum|mean|count',
            }
          ]
        };

        const columnHints = body.columns
          .map(c => `- ${c.name}: ${c.type}`)
          .join('\n');

        const available = Array.isArray(body.availableTypes) && body.availableTypes.length
          ? body.availableTypes.join(', ')
          : 'line, bar, scatter, histogram, box, pie, radar';

        const sampleDataHint = body.sampleRows
          ? `Sample Data (First 5 rows):\n${JSON.stringify(body.sampleRows, null, 2)}`
          : '';

        const prompt = `You are a senior Data Science and Machine Learning assistant.
Given ONLY the dataset schema and sample rows below, propose 1-3 highly effective visualizations that provide deep ML insights even if the data is purely categorical/textual.
You may choose from: ${available}.

Rules:
- DO NOT provide any reasoning, thinking, or introduction text.
- START your response directly with the opening bracket {
- ENSURE the output is strictly valid JSON.

Chart Types and Rules:
- line: Best for time-series or trends; xField MUST be a date; yField can be number OR '__count__' (for frequency over time).
- bar: Best for comparing categories; xField must be categorical; yField number or '__count__'.
- scatter: Best for correlations between two numeric variables; xField number; yField number.
- histogram: Distribution of a single numeric variable; xField number; yField __count__.
- box: Statistical spread; xField categorical (optional); yField number.
- pie: Proportions; xField categorical; yField '__count__'.
- radar: Multivariate comparison.

ML Insight Requirement:
Provide a "mlInsight" field for EACH chart. It MUST be a concise, professional 1-point summary from an ML perspective (e.g., "Identifies high-cardinality clusters in event types" or "Highlights temporal skew in market updates").

Dataset: ${body.datasetName || 'Untitled Dataset'}
Columns:\n${columnHints}

${sampleDataHint}`;

        const model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';
        const ai = await SimpleAI.generateWithSchema<SuggestChartsResponse>({
          prompt,
          schema: schemaShape,
          model,
          maxTokens: 3000,
          temperature: 0.2,
        });

        if (ai && Array.isArray(ai.charts)) {
          aiModel = model;
          // Sanitize and coerce types
          aiCharts = ai.charts
            .filter(c => c && typeof c === 'object')
            .map((c, idx) => {
              const type = (c as any).type as ChartSpec['type'] | undefined;
              const rawAgg = (c as any).aggregation;
              const aggregation: ChartSpec['aggregation'] | undefined =
                rawAgg === 'mean' || rawAgg === 'sum' || rawAgg === 'count' ? rawAgg : undefined;

              // Allow AI to omit yField for count-based charts
              const rawX = (c as any).xField ? String((c as any).xField) : undefined;
              let rawY = (c as any).yField ? String((c as any).yField) : undefined;

              const isCountType = (type === 'bar' || type === 'histogram' || type === 'pie');
              if (!rawY && isCountType && aggregation === 'count' && rawX) {
                rawY = '__count__';
              }

              return {
                id: String(c.id || `chart_${idx + 1}`),
                title: String(c.title || `Chart ${idx + 1}`),
                description: c.description ? String(c.description) : undefined,
                mlInsight: (c as any).mlInsight ? String((c as any).mlInsight) : undefined,
                type: ['line', 'bar', 'scatter', 'histogram', 'box', 'pie', 'radar'].includes(type || '') ? type : 'bar',
                xField: rawX,
                yField: rawY,
                aggregation,
              } as ChartSpec;
            })
            .filter(c => !!c.xField && (!!c.yField || c.type === 'box')); // Box plot might only need yField
        }
      } catch (e) {
        // AI failed; will fallback below
      }
    }

    const charts = (aiCharts && aiCharts.length) ? aiCharts.slice(0, 3) : pickCharts(body.columns, body.datasetName);

    const res: SuggestChartsResponse = { charts, meta: { aiUsed: !!aiCharts, model: aiModel } };
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
