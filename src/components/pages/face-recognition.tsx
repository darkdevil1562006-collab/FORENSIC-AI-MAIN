
"use client";

import * as React from "react";
import { useState } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import dynamic from "next/dynamic";
import SuspectSelector from "@/components/SuspectSelector";

const LiveFaceRecognition = dynamic(() => import("@/components/LiveFaceRecognition"), { ssr: false })
import { useToast } from "@/hooks/use-toast";
import * as faceapi from 'face-api.js'
import loadFaceApiModels from '@/lib/faceapi-loader'

export function FaceRecognitionPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
        const [results, setResults] = useState<{ isDeepfake: boolean; confidenceScore: number; suspectName?: string; breakdown?: { ela?: number; ela95?: number; blur?: number; noise?: number; colorCov?: number; aiScore?: number } } | null>(null);
        const [elaHeatmap, setElaHeatmap] = useState<string | null>(null)
        const [detailed, setDetailed] = useState(false)
            const [sampleLabel, setSampleLabel] = useState<'real'|'ai'>('real')
            const [lastMetrics, setLastMetrics] = useState<any | null>(null)
                // deterministic rule (no slider): we decide using fixed rules below
  const { toast } = useToast();
    const [suspects, setSuspects] = useState<any[]>(() => {
        try { const raw = localStorage.getItem('suspects'); return raw ? JSON.parse(raw) : [] } catch { return [] }
    })
    const [matchInfo, setMatchInfo] = useState<{ found: boolean; name?: string; id?: string; distance?: number; similarity?: number } | null>(null)
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const imgWrapperRef = React.useRef<HTMLDivElement | null>(null)
    const [newSuspectName, setNewSuspectName] = useState('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setResults(null);
      };
      reader.readAsDataURL(file);
    }
  };

    // auto-run analysis when an image source is set
    React.useEffect(() => {
        if (imageSrc) {
            // small delay to allow image to render and models to load progressively
            const t = setTimeout(() => { handleAnalysis().catch(() => {}); }, 300);
            return () => clearTimeout(t);
        }
    }, [imageSrc]);

  const handleAnalysis = async () => {
        if (!imageSrc) return
        setIsLoading(true)
        setResults(null)
        try {
            // helper: load image element
            const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
                const i = document.createElement('img') as HTMLImageElement
                i.crossOrigin = 'anonymous'
                i.onload = () => resolve(i)
                i.onerror = reject
                i.src = src
            })

            const img = await loadImage(imageSrc)

            // Face matching (optional)
            let matchName: string | undefined
            try {
                await loadFaceApiModels('/models')
                const det = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })).withFaceLandmarks().withFaceDescriptor()
                if (det && det.descriptor) {
                    const arr = suspects || (JSON.parse(localStorage.getItem('suspects') || '[]') as any[])
                    const labeled: faceapi.LabeledFaceDescriptors[] = []
                    for (const s of arr) {
                        if (s.faceDescriptors && Array.isArray(s.faceDescriptors) && s.faceDescriptors.length) {
                            const descs = s.faceDescriptors.map((d: any) => Float32Array.from(d))
                            labeled.push(new faceapi.LabeledFaceDescriptors(s.name || s.id, descs))
                        } else if (s.faceDescriptor && Array.isArray(s.faceDescriptor)) {
                            labeled.push(new faceapi.LabeledFaceDescriptors(s.name || s.id, [Float32Array.from(s.faceDescriptor)]))
                        }
                    }
                    if (labeled.length) {
                        const matchThreshold = (() => { try { const st = JSON.parse(localStorage.getItem('fr:thresholds') || 'null'); return st?.faceMatch ?? 0.6 } catch { return 0.6 } })()
                        const matcher = new faceapi.FaceMatcher(labeled, matchThreshold)
                        const best = matcher.findBestMatch(det.descriptor)
                        const dist = (best as any).distance ?? 1
                        const label = (best as any).label ?? 'unknown'
                        const sim = Math.max(0, Math.round((1 - Math.min(dist, matchThreshold) / matchThreshold) * 100))
                                                if (label && label !== 'unknown') {
                                                        matchName = label
                                                        setMatchInfo({ found: true, name: label, distance: dist, similarity: sim })
                                                        // play beep only for high-confidence (perfect) matches
                                                        try {
                                                            if (sim >= 90) {
                                                                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
                                                                const o = audioCtx.createOscillator()
                                                                const g = audioCtx.createGain()
                                                                o.type = 'sine'
                                                                o.frequency.value = 880
                                                                g.gain.value = 0.004
                                                                o.connect(g); g.connect(audioCtx.destination)
                                                                o.start()
                                                                setTimeout(() => { o.stop(); audioCtx.close() }, 160)
                                                            }
                                                        } catch (e) {}
                                                } else {
                                                        setMatchInfo({ found: false, distance: dist, similarity: sim })
                                                }
                    } else {
                        setMatchInfo({ found: false, distance: undefined, similarity: 0 })
                    }
                }
            } catch (e) {
                console.warn('Face matching failed', e)
            }

            // Helper: get ImageData by re-encoding at specified JPEG quality
            const getImageData = async (imageEl: HTMLImageElement, quality = 0.9) => {
                const c = document.createElement('canvas')
                c.width = imageEl.naturalWidth
                c.height = imageEl.naturalHeight
                const ctx = c.getContext('2d')
                if (!ctx) return null
                ctx.drawImage(imageEl, 0, 0)
                const blob = await new Promise<Blob | null>((resolve) => c.toBlob(b => resolve(b), 'image/jpeg', quality))
                if (!blob) return null
                const img2 = await loadImage(URL.createObjectURL(blob))
                const c2 = document.createElement('canvas')
                c2.width = img2.naturalWidth
                c2.height = img2.naturalHeight
                const ctx2 = c2.getContext('2d')
                if (!ctx2) return null
                ctx2.drawImage(img2, 0, 0)
                return ctx2.getImageData(0, 0, c2.width, c2.height)
            }

                    // Compute ELA score on a downscaled copy to speed up
                    const maxDim = 512
                    const downscale = (image: HTMLImageElement) => {
                        const ratio = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight))
                        const w = Math.max(1, Math.floor(image.naturalWidth * ratio))
                        const h = Math.max(1, Math.floor(image.naturalHeight * ratio))
                        const c = document.createElement('canvas')
                        c.width = w; c.height = h
                        const ctx = c.getContext('2d')!
                        ctx.drawImage(image, 0, 0, w, h)
                        const out = new Image()
                        out.src = c.toDataURL('image/jpeg', 0.95)
                        return out
                    }

                    const smallImg = await loadImage((downscale(img)).src)
                    const origData = await getImageData(smallImg, 0.95)
                    const lowData = await getImageData(smallImg, 0.5)
                    let elaScore = 0
                    let ela95 = 0
                    if (origData && lowData) {
                        const w = origData.width, h = origData.height
                        const pixCount = w * h
                        const residuals = new Float32Array(pixCount)
                        let idx = 0
                        // compute per-pixel residual (L2 of RGB)
                        for (let i = 0, p = 0; i < origData.data.length; i += 4, p++) {
                            const dr = origData.data[i] - lowData.data[i]
                            const dg = origData.data[i+1] - lowData.data[i+1]
                            const db = origData.data[i+2] - lowData.data[i+2]
                            const val = Math.sqrt(dr*dr + dg*dg + db*db) / Math.sqrt(3)
                            residuals[p] = val
                            idx++
                        }
                        // compute mean and 95th percentile
                        let sum = 0
                        let max = 0
                        for (let i = 0; i < residuals.length; i++) { sum += residuals[i]; if (residuals[i] > max) max = residuals[i] }
                        const mean = sum / residuals.length
                        // percentile: quick select via sorting (ok for downscaled images)
                        const sorted = Float32Array.from(residuals).sort()
                        ela95 = sorted[Math.floor(sorted.length * 0.95)]
                        elaScore = mean * 255 // normalize

                        // generate heatmap (scale residuals -> 0..255) and store as data URL
                        try {
                            const cmap = document.createElement('canvas')
                            cmap.width = w; cmap.height = h
                            const cctx = cmap.getContext('2d')!
                            const im = cctx.createImageData(w, h)
                            // scale factor to enhance visibility
                            const scale = Math.min(6, 255 / Math.max(1e-6, ela95))
                            for (let p = 0; p < residuals.length; p++) {
                                const v = Math.min(255, Math.floor(residuals[p] * scale))
                                im.data[p*4 + 0] = v // red
                                im.data[p*4 + 1] = 0
                                im.data[p*4 + 2] = 255 - v
                                im.data[p*4 + 3] = 255
                            }
                            cctx.putImageData(im, 0, 0)
                            setElaHeatmap(cmap.toDataURL('image/png'))
                        } catch (e) {
                            console.warn('Failed to generate ELA heatmap', e)
                        }
                    }

            // Compute blur (variance of Laplacian) as a proxy for synthetic softness
            const computeBlurVariance = (data: ImageData | null) => {
                if (!data) return 0
                const w = data.width, h = data.height
                // convert to grayscale
                const gray = new Float32Array(w * h)
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const i = (y * w + x) * 4
                        gray[y * w + x] = 0.299 * data.data[i] + 0.587 * data.data[i+1] + 0.114 * data.data[i+2]
                    }
                }
                // simple Laplacian kernel
                const lap = new Float32Array(w * h)
                const k = [0,1,0,1,-4,1,0,1,0]
                for (let y = 1; y < h-1; y++) {
                    for (let x = 1; x < w-1; x++) {
                        let val = 0
                        let idx = 0
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                val += gray[(y+ky)*w + (x+kx)] * k[idx++]
                            }
                        }
                        lap[y*w + x] = val
                    }
                }
                // compute variance
                let mean = 0
                for (let i = 0; i < lap.length; i++) mean += lap[i]
                mean /= lap.length
                let varSum = 0
                for (let i = 0; i < lap.length; i++) varSum += (lap[i] - mean) * (lap[i] - mean)
                return varSum / lap.length
            }

            const blurVar = computeBlurVariance(origData)

            // Compute simple color noise: difference between image and a blurred version
            const computeNoise = (data: ImageData | null) => {
                if (!data) return 0
                const w = data.width, h = data.height
                // downsample to reduce cost
                let s = 0
                let count = 0
                for (let i = 0; i < data.data.length; i += 40) {
                    const r = data.data[i], g = data.data[i+1], b = data.data[i+2]
                    // local average approximation: just use neighbors within a small window
                    s += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r)
                    count++
                }
                return (s / count) / 3
            }

                    const noise = computeNoise(origData)

                    // color covariance: sample pixels to estimate channel covariance
                    const computeColorCov = (data: ImageData | null) => {
                        if (!data) return 0
                        const w = data.width, h = data.height
                        // sample every Nth pixel for speed
                        const step = detailed ? 4 : 12
                        const samples: number[][] = [[], [], []]
                        for (let i = 0; i < data.data.length; i += 4 * step) {
                            samples[0].push(data.data[i])
                            samples[1].push(data.data[i+1])
                            samples[2].push(data.data[i+2])
                        }
                        const mean = samples.map(s => s.reduce((a,b)=>a+b,0)/s.length)
                        // covariance matrix 3x3
                        const cov = Array.from({length:3}, ()=>Array(3).fill(0))
                        for (let k = 0; k < samples[0].length; k++) {
                            for (let i = 0; i < 3; i++) {
                                for (let j = 0; j < 3; j++) {
                                    cov[i][j] += (samples[i][k] - mean[i]) * (samples[j][k] - mean[j])
                                }
                            }
                        }
                        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] /= samples[0].length
                        // determinant as scalar measure (normalize)
                        const a = cov
                        const det = a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1]) - a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0]) + a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0])
                        return Math.max(0, det)
                    }

                    const colorCov = computeColorCov(origData)

            // Normalize heuristics into 0..1 scores (heuristics, may need tuning)
            const elaNorm = Math.min(1, elaScore / 25) // tuned
            const ela95Norm = Math.min(1, ela95 / 8)
            const blurNorm = Math.min(1, blurVar / 800) // tuned
            const noiseNorm = Math.min(1, noise / 30)
            const colorNorm = Math.min(1, colorCov / 5000)

            // Deterministic decision rule (thresholds can be calibrated)
            const aiScore = Math.min(1, ela95Norm * 0.6 + elaNorm * 0.15 + (1 - blurNorm) * 0.05 + noiseNorm * 0.1 + colorNorm * 0.1)
            // load thresholds from localStorage (calibrated) or use defaults
            const defaults = { ela95: 0.55, ela: 0.7, color: 0.6, aiScore: 0.6 }
            const stored = (() => { try { return JSON.parse(localStorage.getItem('fr:thresholds') || 'null') } catch { return null } })() || {}
            const thr = { ela95: stored.ela95 ?? defaults.ela95, ela: stored.ela ?? defaults.ela, color: stored.color ?? defaults.color, aiScore: stored.aiScore ?? defaults.aiScore }
            const isAI = (ela95Norm > thr.ela95) || (elaNorm > thr.ela) || (colorNorm > thr.color) || (aiScore > thr.aiScore)

            // Log metrics for debugging/tuning
            console.debug('Face analysis metrics:', { elaScore, ela95, ela95Norm, elaNorm, blurVar, blurNorm, noise, noiseNorm, colorCov, colorNorm, aiScore, matchName })

            const metrics = { ela: elaScore, ela95, ela95Norm, elaNorm, blur: blurVar, blurNorm, noise, noiseNorm, colorCov, colorNorm, aiScore }
            setLastMetrics(metrics)
            setResults({ isDeepfake: isAI, confidenceScore: Math.round(aiScore * 100), suspectName: matchName, breakdown: { ela: elaScore, ela95, blur: blurVar, noise, colorCov, aiScore } })
            toast({ title: 'Analysis Complete', description: 'Face matching and AI-detection heuristics finished.' })
        } catch (err) {
            console.error('Analysis failed', err)
            toast({ title: 'Error', description: 'Analysis failed.' })
        } finally {
            setIsLoading(false)
        }
  }

    // draw overlay (bounding box + landmarks + heatmap)
    React.useEffect(() => {
        const canvas = canvasRef.current
        const wrapper = imgWrapperRef.current
        if (!canvas || !wrapper) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const imgEl = wrapper.querySelector('img') as HTMLImageElement | null
        ctx.clearRect(0,0,canvas.width,canvas.height)
        if (!imgEl) return
        // size canvas to image displayed size
        const rect = imgEl.getBoundingClientRect()
        canvas.width = Math.max(1, Math.floor(rect.width))
        canvas.height = Math.max(1, Math.floor(rect.height))
        // draw ELA heatmap if present
        if (elaHeatmap) {
            const hImg = new Image()
            hImg.src = elaHeatmap
            hImg.onload = () => {
                try { ctx.globalAlpha = 0.45; ctx.drawImage(hImg, 0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1 } catch(e){}
            }
        }
        // draw face box/landmarks
        (async () => {
            try {
                if (!imageSrc) return
                await loadFaceApiModels('/models')
                const img = await new Promise<HTMLImageElement>((resolve, reject) => { const i = document.createElement('img'); i.crossOrigin='anonymous'; i.onload = () => resolve(i); i.onerror = reject; i.src = imageSrc })
                const det = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })).withFaceLandmarks()
                if (!det || !det.detection) return
                const box = det.detection.box
                const sx = canvas.width / img.naturalWidth
                const sy = canvas.height / img.naturalHeight
                ctx.strokeStyle = matchInfo && matchInfo.found ? 'lime' : 'orange'
                ctx.lineWidth = 3
                ctx.strokeRect(box.x * sx, box.y * sy, box.width * sx, box.height * sy)
                const lm = det.landmarks
                ctx.fillStyle = 'rgba(0,255,0,0.9)'
                for (const p of lm.positions) {
                    ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 2.5, 0, Math.PI*2); ctx.fill()
                }
            } catch (e) {
                console.warn('Overlay draw failed', e)
            }
        })()
    }, [elaHeatmap, imageSrc, matchInfo])

        const saveNewSuspect = async (name?: string) => {
            if (!imageSrc) return alert('No image')
            try {
                await loadFaceApiModels('/models')
                const i = await new Promise<HTMLImageElement>((resolve, reject) => { const ii = document.createElement('img'); ii.crossOrigin='anonymous'; ii.onload = () => resolve(ii); ii.onerror = reject; ii.src = imageSrc })
                const det = await faceapi.detectSingleFace(i, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })).withFaceLandmarks().withFaceDescriptor()
                if (!det || !det.descriptor) return alert('No face detected to save')
                const id = 'sus-' + Date.now()
                const descriptorArray = Array.from(det.descriptor as Float32Array)
                const entry = { id, name: name || (newSuspectName || `Suspect ${Date.now()}`), faceDataUrl: imageSrc, faceDescriptor: descriptorArray, savedAt: Date.now() }
                const arr = (suspects || []).slice()
                arr.unshift(entry)
                localStorage.setItem('suspects', JSON.stringify(arr))
                setSuspects(arr)
                toast({ title: 'Saved', description: `Saved ${entry.name} to local database` })
            } catch (e) {
                console.error('Save suspect failed', e); alert('Save failed')
            }
        }

  return (
    <>
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold">Face Recognition & Deepfake Detection</h1>
        <p className="text-muted-foreground">Upload an image or use a live feed to identify individuals and detect digital forgeries.</p>
      </div>
      
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Suspect selector: load from localStorage */}
                <div className="lg:col-span-3">
                    <SuspectSelector onSelect={(src: string | null | undefined) => { if (src) setImageSrc(src) }} />
                </div>
            <div className="lg:col-span-2">
            <Card className="glass-card">
                        <Tabs defaultValue="upload">
                            <CardHeader>
                                <TabsList>
                                    <TabsTrigger value="upload">Upload Image</TabsTrigger>
                                    <TabsTrigger value="live">Live Camera</TabsTrigger>
                                </TabsList>
                            </CardHeader>
                            <CardContent>
                                <TabsContent value="upload">
                                    <div className="space-y-2 mb-4">
                                        <Label htmlFor="face-upload">Upload an image file</Label>
                                        <Input id="face-upload" type="file" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                </TabsContent>
                                <TabsContent value="live">
                                    <LiveFaceRecognition onCapture={(dataUrl: string) => { setImageSrc(dataUrl); }} />
                                </TabsContent>
                            </CardContent>
                        </Tabs>
            <CardContent>
                
                <div className="aspect-video bg-muted/20 rounded-md flex items-center justify-center relative overflow-hidden border border-dashed" ref={imgWrapperRef}>
                    {imageSrc ? (
                        <NextImage src={imageSrc} alt="Uploaded face" fill style={{ objectFit: 'contain' }} />
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <Camera className="mx-auto h-12 w-12" />
                            <p>Image preview will appear here</p>
                        </div>
                    )}
                    <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full" />
                    {/* Center result banner */}
                    {matchInfo && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {matchInfo.found && (matchInfo.similarity ?? 0) >= 90 ? (
                                <div className="pointer-events-auto bg-green-500 text-white rounded-lg p-4 shadow-xl flex flex-col items-center gap-2 border-2 border-white/30">
                                    <div className="text-lg font-bold">Matched Suspect Identified</div>
                                    <div className="text-sm">{matchInfo.name}</div>
                                    <div className="text-sm">Similarity: {matchInfo.similarity ?? 0}%</div>
                                </div>
                            ) : matchInfo.found ? (
                                <div className="pointer-events-auto bg-white/90 border-2 border-green-400 text-green-900 rounded-lg p-4 shadow-lg flex flex-col items-center gap-2">
                                    <div className="font-bold">Matched Suspect</div>
                                    <div className="text-sm">{matchInfo.name}</div>
                                    <div className="text-xs">Similarity: {matchInfo.similarity ?? 0}%</div>
                                </div>
                            ) : (
                                <div className="pointer-events-auto bg-white/90 border-4 border-amber-500 text-amber-900 rounded-lg p-4 shadow-lg flex flex-col items-center gap-2">
                                    <div className="font-bold">New Suspect Detected</div>
                                    <div className="text-sm">No matching suspect in local DB</div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => saveNewSuspect(newSuspectName)} disabled={!imageSrc}>Save to DB</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                                                            <div className="flex items-center gap-4">
                                                                <label className="flex items-center gap-2"><input type="checkbox" checked={detailed} onChange={e => setDetailed(e.target.checked)} /> <span className="text-sm">Detailed analysis</span></label>
                                                                <Button onClick={handleAnalysis} disabled={!imageSrc || isLoading} className="w-full ml-auto neon-glow-button">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? "Analyzing..." : "Analyze Image"}
                      </Button>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="glass-card sticky top-20">
                <CardHeader>
                    <h2 className="text-lg font-semibold font-headline">Suspect Database</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Stored Suspects ({suspects.length})</Label>
                        <div className="grid gap-2 max-h-64 overflow-auto">
                            {suspects.length ? suspects.map(s => (
                                <div key={s.id || s.name} className="flex items-center gap-2 p-2 border rounded">
                                    <img src={s.faceDataUrl || s.facePath || '/placeholder-user.png'} className="w-12 h-12 object-cover rounded" />
                                    <div className="flex-1">
                                        <div className="font-medium">{s.name || s.id}</div>
                                        <div className="text-xs text-muted-foreground">{s.savedAt ? new Date(s.savedAt).toLocaleString() : ''}</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Button size="sm" onClick={() => { setImageSrc(s.faceDataUrl || s.facePath); setMatchInfo({ found: true, name: s.name || s.id, similarity: 100 }) }}>Load</Button>
                                    </div>
                                </div>
                            )) : <div className="text-sm text-muted-foreground">No suspects saved yet</div>}
                        </div>
                    </div>
                    <div className="pt-2">
                        <Label>Save New Suspect</Label>
                        <Input placeholder="Name or ID" value={newSuspectName} onChange={e => setNewSuspectName(e.target.value)} />
                        <div className="flex gap-2 mt-2">
                            <Button onClick={() => saveNewSuspect(newSuspectName)} disabled={!imageSrc}>Save to DB</Button>
                            <Button variant="outline" onClick={() => { localStorage.setItem('suspects', JSON.stringify([])); setSuspects([]); alert('Cleared suspects') }}>Clear DB</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
