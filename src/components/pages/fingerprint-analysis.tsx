"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function FingerprintAnalysisPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedModel, setSelectedModel] = useState("mock");
  const [scanResult, setScanResult] = useState<{
    confidenceScore: number;
    matchExplanation: string;
    matchedId: string | null;
  } | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    "https://picsum.photos/seed/fp1/400/400"
  );
  const [selectedDbRecordId, setSelectedDbRecordId] = useState("FP-002");
  const { toast } = useToast();

  const mockDatabase = [
    {
      id: "FP-001",
      name: "John Doe",
      date: "2023-01-15",
      imageUrl: "https://picsum.photos/seed/fpdb1/200/200",
      imageHint: "fingerprint",
    },
    {
      id: "FP-002",
      name: "Jane Smith",
      date: "2023-03-22",
      imageUrl: "https://picsum.photos/seed/fpdb2/200/200",
      imageHint: "fingerprint",
    },
    {
      id: "FP-003",
      name: "Robert Johnson",
      date: "2023-05-30",
      imageUrl: "https://picsum.photos/seed/fpdb3/200/200",
      imageHint: "fingerprint",
    },
    {
      id: "FP-004",
      name: "Emily White",
      date: "2023-07-11",
      imageUrl: "https://picsum.photos/seed/fpdb4/200/200",
      imageHint: "fingerprint",
    },
  ];

  // load suspects from localStorage and expose them as DB entries
  const [suspects, setSuspects] = React.useState<any[]>([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("suspects");
      if (raw) setSuspects(JSON.parse(raw));
    } catch (e) {
      console.warn("failed to load suspects", e);
    }
  }, []);

  React.useEffect(() => {
    if (suspects.length > 0) {
      // if no uploaded image, show first suspect fingerprint
      if (!uploadedImage)
        setUploadedImage(suspects[0].fingerprintDataUrl || null);
      // if no selected record, set to first suspect id
      if (!selectedDbRecordId) setSelectedDbRecordId(suspects[0].id);
    }
  }, [suspects]);

  async function loadImageToImageData(
    src: string,
    size = 200
  ): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new window.Image() as HTMLImageElement;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not available"));
        // draw image resized to square for simple comparison
        ctx.drawImage(img, 0, 0, size, size);
        const id = ctx.getImageData(0, 0, size, size);
        resolve(id);
      };
      img.onerror = (e: any) => reject(e);
      img.src = src;
    });
  }

  function compareImageData(a: ImageData, b: ImageData): number {
    // normalized difference -> similarity percent (0..100)
    if (a.data.length !== b.data.length) return 0;
    let diff = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      // use luminance approx per pixel
      const la =
        0.2126 * a.data[i] + 0.7152 * a.data[i + 1] + 0.0722 * a.data[i + 2];
      const lb =
        0.2126 * b.data[i] + 0.7152 * b.data[i + 1] + 0.0722 * b.data[i + 2];
      diff += Math.abs(la - lb);
    }
    const max = 255 * (a.width * a.height);
    const norm = diff / max; // 0..1
    const similarity = Math.max(0, 1 - norm) * 100; // percent
    return similarity;
  }

  const handleScan = async () => {
    if (!uploadedImage || !selectedDbRecordId) {
      toast({
        title: "Selection Required",
        description:
          "Please upload a fingerprint and select a database record.",
        variant: "destructive",
      });
      return;
    }
    setIsScanning(true);
    setScanResult(null);

    try {
      // find selected record image
      const target = dbEntries.find((d) => d.id === selectedDbRecordId);
      const targetSrc = target?.imageUrl;
      if (!targetSrc) {
        throw new Error("No target image available for selected record");
      }

      if (
        selectedModel === "opencv" &&
        typeof window !== "undefined" &&
        (window as any).cv
      ) {
        // Use OpenCV.js template matching if available
        try {
          // load images into mats
          const srcCanvas = document.createElement("canvas");
          const dstCanvas = document.createElement("canvas");
          const SIZE = 300;
          srcCanvas.width = SIZE;
          srcCanvas.height = SIZE;
          dstCanvas.width = SIZE;
          dstCanvas.height = SIZE;
          const sctx = srcCanvas.getContext("2d")!;
          const dctx = dstCanvas.getContext("2d")!;
          // draw images
          const p1 = await loadImageToImageData(uploadedImage, SIZE);
          const p2 = await loadImageToImageData(targetSrc, SIZE);
          sctx.putImageData(p1, 0, 0);
          dctx.putImageData(p2, 0, 0);
          const cv = (window as any).cv;
          const matA = cv.matFromImageData(p1);
          const matB = cv.matFromImageData(p2);
          const matAgray = new cv.Mat();
          const matBgray = new cv.Mat();
          cv.cvtColor(matA, matAgray, cv.COLOR_RGBA2GRAY, 0);
          cv.cvtColor(matB, matBgray, cv.COLOR_RGBA2GRAY, 0);
          // use matchTemplate
          const result = new cv.Mat();
          const method = cv.TM_CCOEFF_NORMED;
          cv.matchTemplate(matAgray, matBgray, result, method);
          const minMax = cv.minMaxLoc(result);
          const maxVal = minMax.maxVal; // between -1 and 1
          const score = Math.max(0, Math.min(1, maxVal));
          const pct = score * 100;
          // cleanup
          matA.delete();
          matB.delete();
          matAgray.delete();
          matBgray.delete();
          result.delete();
          const isMatch = pct > 60;
          setScanResult({
            confidenceScore: pct,
            matchedId: isMatch ? selectedDbRecordId : null,
            matchExplanation: isMatch
              ? "OpenCV template match above threshold"
              : "Low template match score",
          });
        } catch (e) {
          console.error("OpenCV matching failed", e);
          toast({
            title: "OpenCV Error",
            description: "OpenCV matching failed, falling back to pixel method",
            variant: "destructive",
          });
          // fallback to pixel
          const a = await loadImageToImageData(uploadedImage, 200);
          const b = await loadImageToImageData(targetSrc, 200);
          const pct = compareImageData(a, b);
          const isMatch = pct > 75;
          setScanResult({
            confidenceScore: pct,
            matchedId: isMatch ? selectedDbRecordId : null,
            matchExplanation: isMatch
              ? "High pixel similarity"
              : "Low pixel similarity",
          });
        }
      } else if (selectedModel === "pixel") {
        const a = await loadImageToImageData(uploadedImage, 200);
        const b = await loadImageToImageData(targetSrc, 200);
        const pct = compareImageData(a, b);
        const isMatch = pct > 75;
        setScanResult({
          confidenceScore: pct,
          matchedId: isMatch ? selectedDbRecordId : null,
          matchExplanation: isMatch
            ? "High pixel similarity"
            : "Low pixel similarity",
        });
      } else {
        // mock
        const confidenceScore = Math.random() * 100;
        const isMatch = confidenceScore > 75;
        setScanResult({
          confidenceScore,
          matchedId: isMatch ? selectedDbRecordId : null,
          matchExplanation: isMatch
            ? `High similarity detected (mock).`
            : `Low similarity (mock).`,
        });
      }

      toast({ title: "Scan Complete" });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setScanResult(null);
    }
  };

  const dbEntries: Array<{
    id: string;
    name: string;
    date: string;
    imageUrl: string;
    imageHint: string;
    isSuspect?: boolean;
  }> = [
    // suspects first
    ...suspects.map((s: any) => ({
      id: s.id,
      name: s.name || "Unknown",
      date: s.createdAt || "Saved",
      imageUrl: s.fingerprintDataUrl || "",
      imageHint: "fingerprint",
      isSuspect: true,
    })),
    // then mock data
    ...mockDatabase.map((m) => ({ ...m, isSuspect: false })),
  ];

  return (
    <>
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold">
          Fingerprint Analysis System
        </h1>
        <p className="text-muted-foreground">
          Upload a fingerprint scan to compare it against the suspect database.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Database / Internal Storage */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Fingerprint Database Feed</CardTitle>
            <CardDescription>
              Select a record to compare against. Use the controls to
              save/remove local records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Button
                onClick={() => {
                  // Save currently uploaded image to localStorage as suspect
                  if (!uploadedImage) {
                    toast({
                      title: "No Upload",
                      description: "Please upload an image first",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    const raw = localStorage.getItem("suspects");
                    const arr = raw ? JSON.parse(raw) : [];
                    const id = `FP-${Date.now()}`;
                    const entry = {
                      id,
                      name: `Suspect ${id}`,
                      fingerprintDataUrl: uploadedImage,
                      createdAt: new Date().toISOString(),
                    };
                    arr.unshift(entry);
                    localStorage.setItem("suspects", JSON.stringify(arr));
                    setSuspects(arr);
                    toast({
                      title: "Saved",
                      description: "Fingerprint saved to local storage.",
                    });
                  } catch (e) {
                    console.error(e);
                    toast({
                      title: "Error",
                      description: "Failed to save locally",
                      variant: "destructive",
                    });
                  }
                }}
                size="sm"
              >
                Save Upload to Storage
              </Button>
              <Button
                onClick={() => {
                  // Remove selected if it's in suspects
                  try {
                    const raw = localStorage.getItem("suspects");
                    const arr = raw ? JSON.parse(raw) : [];
                    const keep = arr.filter(
                      (s: any) => s.id !== selectedDbRecordId
                    );
                    localStorage.setItem("suspects", JSON.stringify(keep));
                    setSuspects(keep);
                    toast({
                      title: "Removed",
                      description: `Record ${selectedDbRecordId} removed from storage.`,
                    });
                    // if removed was displayed, clear uploadedImage
                    if (
                      uploadedImage &&
                      keep.findIndex(
                        (k: any) => k.fingerprintDataUrl === uploadedImage
                      ) === -1
                    )
                      setUploadedImage(null);
                  } catch (e) {
                    console.error(e);
                    toast({
                      title: "Error",
                      description: "Failed to remove",
                      variant: "destructive",
                    });
                  }
                }}
                size="sm"
                variant="destructive"
              >
                Remove Selected
              </Button>
              <div className="ml-auto text-sm text-muted-foreground">
                Model:
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    toast({
                      title: "Model selected",
                      description: e.target.value,
                    });
                  }}
                  className="ml-2 text-sm"
                >
                  <option value="mock">Mock (fast)</option>
                  <option value="pixel">Pixel Compare</option>
                  <option value="opencv">OpenCV.js (if loaded)</option>
                </select>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card/80 backdrop-blur-sm">
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Date Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbEntries.map((record) => (
                    <TableRow
                      key={record.id}
                      className={cn(
                        "cursor-pointer",
                        selectedDbRecordId === record.id && "bg-primary/20",
                        scanResult?.matchedId === record.id &&
                          "bg-primary/40 animate-pulse"
                      )}
                      onClick={() => {
                        setSelectedDbRecordId(record.id);
                        if (record.isSuspect && record.imageUrl)
                          setUploadedImage(record.imageUrl);
                      }}
                    >
                      <TableCell>
                        {record.imageUrl ? (
                          <Image
                            src={record.imageUrl}
                            alt={record.name}
                            width={40}
                            height={40}
                            className="rounded-md"
                            data-ai-hint={record.imageHint}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-md" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{record.id}</TableCell>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>{record.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Live Scanning / Upload */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Live Scanning Interface</CardTitle>
            <CardDescription>Upload a scan to begin analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-full max-w-sm mx-auto aspect-square overflow-hidden rounded-lg border-4 border-primary/20 bg-muted/10 flex items-center justify-center">
              {uploadedImage ? (
                <Image
                  src={uploadedImage}
                  alt="Fingerprint Scan"
                  width={400}
                  height={400}
                  data-ai-hint="fingerprint scan"
                />
              ) : (
                <p className="text-muted-foreground">
                  Upload an image to see a preview
                </p>
              )}
              {isScanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="absolute top-0 h-1 w-full bg-primary shadow-[0_0_20px] shadow-primary animate-scan-line-vertical"></div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fingerprint-upload">Upload new scan</Label>
              <Input
                id="fingerprint-upload"
                type="file"
                onChange={handleFileChange}
                accept="image/*"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleScan}
                disabled={isScanning || !uploadedImage}
                className="flex-1 neon-glow-button"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Initiate Comparison"
                )}
              </Button>
              <Button
                onClick={() => {
                  setUploadedImage(null);
                  setScanResult(null);
                }}
                variant="ghost"
              >
                Clear
              </Button>
            </div>
            {scanResult &&
              (scanResult.matchedId ? (
                <Alert className="border-primary bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <AlertTitle>Match Found - Access Granted</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <div className="flex items-center gap-4 mt-2">
                      <Progress
                        value={scanResult.confidenceScore}
                        className="flex-1"
                      />
                      <span className="font-bold text-lg text-primary">
                        {scanResult.confidenceScore.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-code">
                      {scanResult.matchExplanation}
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <ShieldX className="h-4 w-4" />
                  <AlertTitle>No Match Found</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <div className="flex items-center gap-4 mt-2">
                      <Progress
                        value={scanResult.confidenceScore}
                        className="flex-1 [&>div]:bg-destructive"
                      />
                      <span className="font-bold text-lg text-destructive">
                        {scanResult.confidenceScore.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-code">
                      {scanResult.matchExplanation}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
            {/* OpenCV.js availability notice */}
            {typeof (window as any).cv === "undefined" && (
              <div className="text-xs text-muted-foreground">
                OpenCV.js not detected. For higher-quality matching, include
                OpenCV.js in the page or load via CDN.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
