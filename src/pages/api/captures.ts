import type { NextApiRequest, NextApiResponse } from 'next'

type Capture = {
  dataUrl: string
  label: string
  ts: number
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const body = req.body as Capture
    if (!body || !body.dataUrl) {
      return res.status(400).json({ ok: false, error: 'Invalid payload' })
    }
    // For now, just log and respond. In production you'd save to storage or DB.
    console.log('Received capture:', { label: body.label, ts: body.ts })
    return res.status(200).json({ ok: true })
  }
  res.setHeader('Allow', ['POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
