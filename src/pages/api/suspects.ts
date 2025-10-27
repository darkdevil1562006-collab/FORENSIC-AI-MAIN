import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

type SuspectPayload = {
  id: string
  name: string
  age?: number | null
  bloodGroup?: string | null
  aliases?: string | null
  notes?: string | null
  fingerprintDataUrl?: string | null
  faceDataUrl?: string | null
  voiceDataUrl?: string | null
  faceDescriptor?: number[] | null
}

const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
const indexFile = path.join(uploadsDir, 'suspects_index.json')

function ensureDir() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
}

function dataUrlToBuffer(dataUrl: string) {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!matches) return null
  const b64 = matches[2]
  return Buffer.from(b64, 'base64')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  const body = req.body as SuspectPayload
  if (!body || !body.id) return res.status(400).json({ ok: false, error: 'Invalid payload' })
  try {
    ensureDir()
    const entry: any = { ...body, savedAt: Date.now() }
    // Save media files if present
    if (body.fingerprintDataUrl) {
      const buf = dataUrlToBuffer(body.fingerprintDataUrl)
      if (buf) {
        const fpPath = path.join(uploadsDir, `${body.id}-fingerprint.jpg`)
        fs.writeFileSync(fpPath, buf)
        entry.fingerprintPath = `/uploads/${body.id}-fingerprint.jpg`
      }
    }
    if (body.faceDataUrl) {
      const buf = dataUrlToBuffer(body.faceDataUrl)
      if (buf) {
        const p = path.join(uploadsDir, `${body.id}-face.jpg`)
        fs.writeFileSync(p, buf)
        entry.facePath = `/uploads/${body.id}-face.jpg`
      }
    }
    if (body.voiceDataUrl) {
      const buf = dataUrlToBuffer(body.voiceDataUrl)
      if (buf) {
        const p = path.join(uploadsDir, `${body.id}-voice.dat`)
        fs.writeFileSync(p, buf)
        entry.voicePath = `/uploads/${body.id}-voice.dat`
      }
    }

    // Update index
    let idx: any[] = []
    try { idx = JSON.parse(fs.readFileSync(indexFile, 'utf-8')) } catch (e) { }
    idx.unshift(entry)
    fs.writeFileSync(indexFile, JSON.stringify(idx, null, 2))

    return res.status(200).json({ ok: true, entry })
  } catch (err) {
    console.error('Failed to save suspect on server', err)
    return res.status(500).json({ ok: false, error: 'Server error' })
  }
}
