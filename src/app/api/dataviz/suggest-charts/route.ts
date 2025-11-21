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
              description: 'optional',
              type: 'line|bar|scatter|map_points',
              xField: 'columnX (optional for map_points)',
              yField: 'columnY (optional for map_points)',
              aggregation: 'sum|mean|count',
              geo: {
                mode: 'name|latlon',
                locationField: 'columnWithCityOrAddress',
                countryField: 'optionalCountryField',
                latField: 'latCol',
                lonField: 'lonCol'
              }
            }
          ]
        };

        const columnHints = body.columns
          .map(c => `- ${c.name}: ${c.type}`)
          .join('\n');

        const available = Array.isArray(body.availableTypes) && body.availableTypes.length
          ? body.availableTypes.join(', ')
          : 'bar, line, scatter, map_points';

        const prompt = `You are a senior data visualization assistant.
Given ONLY the dataset schema below, propose 1-3 useful charts that the user can render with Nivo. You may choose from: ${available}.

Rules for allowed charts:
- line: xField must be a date column; yField must be number; aggregation: sum (default) or mean.
- bar: xField must be a categorical/boolean column; yField must be number; aggregation: mean (default) or sum.
- scatter: xField number; yField number; no aggregation preferred.
- map_points: Use only when dataset contains either (a) textual location fields (e.g., city/address and optional country) or (b) latitude+longitude columns. For textual locations, set geo.mode="name" with locationField and optional countryField. For lat/lon, set geo.mode="latlon" with latField and lonField.

Constraints:
- Use only columns that exist in the schema.
- Prefer simple, clear charts.
- Keep titles short and human-friendly.
- Return strictly valid JSON matching the schema below.

Dataset: ${body.datasetName || 'Untitled Dataset'}
Columns:\n${columnHints}`;

        const model = process.env.OPENROUTER_MODEL || 'tngtech/deepseek-r1t2-chimera:free';
        const ai = await SimpleAI.generateWithSchema<SuggestChartsResponse>({
          prompt,
          schema: schemaShape,
          model,
          maxTokens: 1200,
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

              // Allow AI to omit yField for count bars; we synthesize a metric name
              const rawX = (c as any).xField ? String((c as any).xField) : undefined;
              let rawY = (c as any).yField ? String((c as any).yField) : undefined;
              if (!rawY && type === 'bar' && aggregation === 'count' && rawX) {
                rawY = '__count__';
              }

              const geo: ChartSpec['geo'] | undefined = (c as any).geo
                ? {
                    mode: (c as any).geo?.mode === 'latlon' ? 'latlon' : 'name',
                    locationField: (c as any).geo?.locationField ? String((c as any).geo.locationField) : undefined,
                    countryField: (c as any).geo?.countryField ? String((c as any).geo.countryField) : undefined,
                    latField: (c as any).geo?.latField ? String((c as any).geo.latField) : undefined,
                    lonField: (c as any).geo?.lonField ? String((c as any).geo.lonField) : undefined,
                  }
                : undefined;

              return {
                id: String(c.id || `chart_${idx + 1}`),
                title: String(c.title || `Chart ${idx + 1}`),
                description: c.description ? String(c.description) : undefined,
                type: type === 'line' || type === 'bar' || type === 'scatter' || type === 'map_points' ? type : 'bar',
                xField: rawX,
                yField: rawY,
                aggregation,
                geo,
              } as ChartSpec;
            })
            .filter(c => {
              if (c.type === 'map_points') {
                const g = c.geo;
                if (!g) return false;
                if (g.mode === 'name') return !!g.locationField;
                if (g.mode === 'latlon') return !!g.latField && !!g.lonField;
                return false;
              }
              return !!c.xField && !!c.yField;
            });
        }
      } catch (e) {
        // AI failed; will fallback below
      }
    }

    let charts = (aiCharts && aiCharts.length) ? aiCharts.slice(0, 3) : pickCharts(body.columns);

    // Heuristic: if location-like fields exist and map is allowed, add a map_points chart
    const allowed = new Set((body.availableTypes && body.availableTypes.length ? body.availableTypes : ['bar','line','scatter','map_points']));
    const strings = body.columns.filter(c => c.type === 'string').map(c => c.name.toLowerCase());
    const hasLat = body.columns.some(c => c.name.toLowerCase().includes('lat'));
    const hasLon = body.columns.some(c => c.name.toLowerCase().includes('lon')) || body.columns.some(c => c.name.toLowerCase().includes('lng'));
    const findCol = (keys: string[]) => strings.find(n => keys.some(k => n.includes(k)));
    if (allowed.has('map_points')) {
      if (hasLat && hasLon) {
        const latField = (body.columns.find(c => c.name.toLowerCase().includes('lat'))?.name)!;
        const lonField = (body.columns.find(c => c.name.toLowerCase().includes('lon') || c.name.toLowerCase().includes('lng'))?.name)!;
        const mapChart: ChartSpec = { id: 'map_1', title: 'Locations', type: 'map_points', geo: { mode: 'latlon', latField, lonField } };
        charts = [mapChart, ...charts].slice(0, 3);
      } else {
        const locCol = findCol(['city','location','address','area','place','town']);
        if (locCol) {
          const countryCol = findCol(['country']);
          const locationField = body.columns.find(c => c.name.toLowerCase() === locCol)!.name;
          const countryField = countryCol ? body.columns.find(c => c.name.toLowerCase() === countryCol)!.name : undefined;
          const mapChart: ChartSpec = { id: 'map_1', title: 'Locations', type: 'map_points', geo: { mode: 'name', locationField, countryField } };
          charts = [mapChart, ...charts].slice(0, 3);
        }
      }
    }

    const res: SuggestChartsResponse = { charts, meta: { aiUsed: !!aiCharts, model: aiModel } };
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
