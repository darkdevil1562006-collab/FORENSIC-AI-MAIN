// audio-utils stub: voice feature permanently removed. Keep exports to avoid build errors.
export async function extractFeaturesFromAudioBuffer(_: AudioBuffer | null): Promise<null> {
  return null
}

export function cosineSimilarity(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}
