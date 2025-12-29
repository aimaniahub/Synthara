import { NextRequest, NextResponse } from 'next/server';
import { type SuggestChartsRequest, type SuggestChartsResponse, type ColumnInfo, type ChartSpec } from '@/types/dataviz';
import { SimpleAI } from '@/ai/simple-ai';

export const runtime = 'nodejs';

function pickCharts(columns: ColumnInfo[]): ChartSpec[] {
  const nums = columns.filter(c => c.type === 'number');
  const cats = columns.filter(c => c.type === 'string' || c.type === 'boolean');
  const dates = columns.filter(c => c.type === 'date');
  const charts: ChartSpec[] = [];

  if (dates.length && nums.length) {
    charts.push({
      id: 'line_1',
      title: `${nums[0].name} over ${dates[0].name}`,
      description: `Trend of ${nums[0].name} by ${dates[0].name}`,
      type: 'line',
      xField: dates[0].name,
      yField: nums[0].name,
      aggregation: 'sum'
    });
  }

  if (cats.length && nums.length) {
    charts.push({
      id: 'bar_1',
      title: `${nums[0].name} by ${cats[0].name}`,
      description: `Average ${nums[0].name} per ${cats[0].name}`,
      type: 'bar',
      xField: cats[0].name,
      yField: nums[0].name,
      aggregation: 'mean'
    });
  }

  if (nums.length >= 2) {
    charts.push({
      id: 'scatter_1',
      title: `${nums[0].name} vs ${nums[1].name}`,
      description: `Relationship between ${nums[0].name} and ${nums[1].name}`,
      type: 'scatter',
      xField: nums[0].name,
      yField: nums[1].name
    });
  }

  // Fallback: if we still have capacity and at least one categorical column,
  // add a simple row-count bar chart that works even without numeric fields.
  if (cats.length && charts.length < 3) {
    charts.push({
      id: 'bar_count_1',
      title: `Records per ${cats[0].name}`,
      description: `Number of records for each ${cats[0].name}`,
      type: 'bar',
      xField: cats[0].name,
      yField: '__count__',
      aggregation: 'count',
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

        const prompt = `You are a senior Data Science and Machine Learning assistant.
Given ONLY the dataset schema below, propose 1-3 highly effective visualizations that provide deep ML insights. 
You may choose from: ${available}.

Rules for allowed charts:
- line: Best for time-series or trends; xField must be a date; yField must be number.
- bar: Best for comparing categories; xField must be categorical; yField must be number or count.
- scatter: Best for identifying correlations between two numeric variables; xField number; yField number.
- histogram: Best for identifying data distribution and skewness of a single numeric variable; xField number; yField __count__; aggregation count.
- box: Best for identifying outliers and statistical spread; xField categorical (optional); yField number.
- pie: Best for showing proportions; xField categorical; yField count.
- radar: Best for multivariate feature comparison.

ML Insight Requirement:
For EACH chart, provide a "mlInsight" field. This MUST be a concise, professional 1-point summary from an ML perspective (e.g., "Identifies potential linear correlation between X and Y", "Shows heavy right-skewed distribution suggesting data normalization might be needed", "Visualizes significant outliers in feature Z").

Constraints:
- Use only columns that exist in the schema.
- Return strictly valid JSON matching the schema below.
- Prioritize charts that reveal data quality, correlations, or distribution patterns.

Dataset: ${body.datasetName || 'Untitled Dataset'}
Columns:\n${columnHints}`;

        const model = process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free';
        const ai = await SimpleAI.generateWithSchema<SuggestChartsResponse>({
          prompt,
          schema: schemaShape,
          model,
          maxTokens: 1500,
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

    const charts = (aiCharts && aiCharts.length) ? aiCharts.slice(0, 3) : pickCharts(body.columns);

    const res: SuggestChartsResponse = { charts, meta: { aiUsed: !!aiCharts, model: aiModel } };
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
