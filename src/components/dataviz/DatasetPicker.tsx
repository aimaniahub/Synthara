'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Database, Upload, X } from 'lucide-react'

export type DatasetMeta = { id?: string; name: string; source: 'saved' | 'uploaded' }

type SavedDataset = {
  id: string
  dataset_name: string
  num_rows: number
}

type Props = {
  onChange: (rows: Record<string, any>[], meta: DatasetMeta) => void
  hidePreview?: boolean
}

async function parseCSV(csvText: string): Promise<Record<string, any>[]> {
  const Papa = (await import('papaparse')).default
  const result = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: 'greedy' })
  const rows = (Array.isArray(result.data) ? (result.data as Record<string, any>[]) : []).map(r => {
    const o: Record<string, any> = {}
    for (const k of Object.keys(r)) o[k] = r[k] === '' ? null : r[k]
    return o
  })
  return rows
}

export default function DatasetPicker({ onChange, hidePreview }: Props) {
  const [saved, setSaved] = useState<SavedDataset[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [selectedId, setSelectedId] = useState<string>('')
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [meta, setMeta] = useState<DatasetMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoadingSaved(true)
      setError(null)
      try {
        const res = await fetch('/api/datasets?limit=50')
        const payload = await res.json().catch(() => null)
        if (active) setSaved(payload?.datasets || [])
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load datasets')
      } finally {
        if (active) setLoadingSaved(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const preview = useMemo(() => rows.slice(0, 5), [rows])

  async function handleSaved(id: string) {
    if (!id) return
    setSelectedId(id)
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/datasets/${id}`)
      if (!res.ok) throw new Error('Failed to fetch dataset')
      const ds = await res.json()
      const parsed = await parseCSV(ds.data_csv)
      setRows(parsed)
      const nextMeta: DatasetMeta = { id, name: ds.dataset_name, source: 'saved' }
      setMeta(nextMeta)
      onChange(parsed, nextMeta)
    } catch (e: any) {
      setError(e?.message || 'Failed to load dataset')
      setRows([])
      setMeta(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setIsLoading(true)
    setError(null)
    try {
      const text = await f.text()
      const parsed = await parseCSV(text)
      setRows(parsed)
      const nextMeta: DatasetMeta = { name: f.name, source: 'uploaded' }
      setMeta(nextMeta)
      onChange(parsed, nextMeta)
      setSelectedId('')
    } catch (err: any) {
      setError(err?.message || 'Failed to parse CSV')
      setRows([])
      setMeta(null)
    } finally {
      setIsLoading(false)
    }
  }

  function clearAll() {
    setSelectedId('')
    setRows([])
    setMeta(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5" />
        <span className="font-medium">Select Dataset</span>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={clearAll}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Saved</Label>
          {loadingSaved ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={selectedId} onValueChange={handleSaved}>
              <SelectTrigger>
                <SelectValue placeholder="Choose saved dataset" />
              </SelectTrigger>
              <SelectContent>
                {saved.length === 0 ? (
                  <SelectItem value="__no_saved__" disabled>No saved datasets</SelectItem>
                ) : (
                  saved.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.dataset_name} · {s.num_rows} rows</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Upload CSV</Label>
          <div className="flex items-center gap-2">
            <Input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      {!hidePreview && !!preview.length && (
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground mb-2">
            {meta?.source === 'saved' ? 'Saved Dataset' : 'Uploaded File'} · {rows.length} rows · {Object.keys(preview[0] || {}).length} columns
          </div>
          <div className="overflow-auto max-h-40">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {Object.keys(preview[0] || {}).map(k => (
                    <th key={k} className="px-2 py-1 text-left font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t">
                    {Object.keys(preview[0] || {}).map(k => (
                      <td key={k} className="px-2 py-1 truncate max-w-32">{r[k] === null || r[k] === undefined ? <span className="text-muted-foreground italic">null</span> : String(r[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
