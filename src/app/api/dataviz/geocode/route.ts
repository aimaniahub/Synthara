import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Simple in-memory + temp file cache to reduce Nominatim calls
const cache: Map<string, { lat: number; lon: number; name: string }> = new Map()

async function geocodeOne(q: string) {
  if (cache.has(q)) return cache.get(q)!
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': process.env.OPENROUTER_SITE_NAME || 'Synthara-Dataviz/1.0',
      'Accept-Language': 'en',
    },
  })
  if (!res.ok) return null
  const arr = (await res.json()) as Array<any>
  const hit = arr?.[0]
  if (!hit) return null
  const out = { lat: Number(hit.lat), lon: Number(hit.lon), name: hit.display_name as string }
  cache.set(q, out)
  return out
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { rows, locationField, countryField } = body as {
      rows: Array<Record<string, any>>
      locationField: string
      countryField?: string
    }
    if (!Array.isArray(rows) || !rows.length || !locationField) {
      return NextResponse.json({ error: 'rows and locationField required' }, { status: 400 })
    }

    // Build unique queries
    const qset = new Set<string>()
    for (const r of rows) {
      const loc = r?.[locationField]
      if (loc == null || loc === '') continue
      const q = countryField && r?.[countryField] ? `${loc}, ${r[countryField]}` : String(loc)
      qset.add(q)
    }

    // Limit to 100 unique locations to avoid rate limits
    const uniques = Array.from(qset).slice(0, 100)

    const points: Array<{ query: string; lat: number; lon: number; name: string }> = []
    for (const q of uniques) {
      const g = await geocodeOne(q)
      if (g) points.push({ query: q, ...g })
      await new Promise((r) => setTimeout(r, 250)) // gentle pacing
    }

    return NextResponse.json({ success: true, points })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
