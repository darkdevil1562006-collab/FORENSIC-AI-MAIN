"use client"

import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

export default function SuspectSelector({ onSelect }: { onSelect: (dataUrl?: string | null) => void }) {
  const [suspects, setSuspects] = React.useState<any[]>([])
  React.useEffect(() => {
    try { const raw = localStorage.getItem('suspects'); if (raw) setSuspects(JSON.parse(raw)) } catch (e) {}
  }, [])

  return (
    <div className="mb-4">
      <label className="text-sm font-medium">Load suspect media</label>
      <div className="mt-2">
        <Select onValueChange={(v) => { const s = suspects.find((x:any)=>x.id===v); onSelect(s?.faceDataUrl || s?.fingerprintDataUrl || s?.voiceDataUrl || null) }}>
          <SelectTrigger>
            <SelectValue placeholder="Choose suspect..." />
          </SelectTrigger>
          <SelectContent>
            {suspects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
