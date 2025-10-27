
"use client"

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { DeepfakeAnalysisResult } from "@/lib/deepfake-analysis";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DeepfakeDetectionResult } from "@/components/DeepfakeDetector";
import { LicensePlateRecognition } from "@/components/LicensePlateRecognition";

type AnalysisType =
  | 'deepfakeDetection'
  | 'imageTamperLocalization'
  | 'licensePlateRecognition';const analysisOptions: { value: AnalysisType; label: string; description: string }[] = [
    { value: 'deepfakeDetection', label: 'Deepfake Detection', description: 'Analyze media for signs of AI-generated forgery.' },
    { value: 'imageTamperLocalization', label: 'Image Tamper Localization', description: 'Generate a heatmap of potentially edited regions.' },
    { value: 'licensePlateRecognition', label: 'License Plate Recognition', description: 'Extract license plate info from an image.' },
];

export function AdvancedToolsPage() {
    const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<{
        analysisResults: string;
        confidenceScore?: number;
        imageUrl?: string;
        deepfakeResult?: DeepfakeAnalysisResult;
    } | null>(null);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        if (!analysisType || !file) return;

        setIsLoading(true);
        setResults(null);

        if (analysisType === 'deepfakeDetection') {
            try {
                const img = new Image();
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    throw new Error('Could not get canvas context');
                }

                // Create object URL for the uploaded file
                const objectUrl = URL.createObjectURL(file);
                
                // Wait for image to load
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = objectUrl;
                });

                // Set canvas size to match image
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw image to canvas
                ctx.drawImage(img, 0, 0);
                
                // Get image data for analysis
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Analyze the image
                const { analyzeImage } = await import('@/components/DeepfakeDetector');
                const result = await analyzeImage(img);
                
                setResults({
                    analysisResults: JSON.stringify(result.details, null, 2),
                    confidenceScore: result.confidence,
                    imageUrl: objectUrl,
                    deepfakeResult: result
                });

                toast({
                    title: result.isReal ? "Real Image Detected" : "AI-Generated Image Detected",
                    description: `Analysis complete with ${result.confidence.toFixed(1)}% confidence.`,
                    variant: result.isReal ? "default" : "destructive"
                });
            } catch (error) {
                console.error('Deepfake analysis error:', error);
                toast({
                    title: "Analysis Failed",
                    description: "Failed to analyze the image. Please try again.",
                    variant: "destructive"
                });
            }
        } else {
            // Mock analysis for other tools
            setTimeout(() => {
                setResults({
                    analysisResults: `Mock analysis complete for ${analysisType}. The uploaded file "${file.name}" has been processed.`,
                    confidenceScore: Math.random() * 100,
                });
                toast({
                    title: "Analysis Complete",
                    description: "The mock forensic analysis has finished.",
                });
            }, 2000);
        }
        
        setIsLoading(false);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        if (!f) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }
            setFile(null);
            return;
        }

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp', 'image/gif'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(f.type)) {
            toast({ title: 'Invalid file type', description: 'Please upload an image (png, jpg, webp, bmp, gif).', variant: 'destructive' });
            setFile(null);
            return;
        }

        if (f.size > maxSize) {
            toast({ title: 'File too large', description: 'Maximum file size is 10 MB.', variant: 'destructive' });
            setFile(null);
            return;
        }

        // revoke previous preview
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        const url = URL.createObjectURL(f);
        setPreviewUrl(url);
        setFile(f);
        // clear prior results when new file selected
        setResults(null);
    }

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
    }, [previewUrl]);

    if (analysisType === 'licensePlateRecognition') {
        return (
            <>
                <div className="space-y-4 mb-8">
                    <h1 className="font-headline text-3xl font-bold">Advanced AI Forensic Tools</h1>
                    <p className="text-muted-foreground">
                        License Plate Recognition and Vehicle Information Lookup
                    </p>
                    <Button 
                        variant="outline" 
                        onClick={() => setAnalysisType(null)}
                        className="mb-4"
                    >
                        Back to Tool Selection
                    </Button>
                </div>
                <LicensePlateRecognition />
            </>
        );
    }

    return (
        <>
            <div className="space-y-4 mb-8">
                <h1 className="font-headline text-3xl font-bold">Advanced AI Forensic Tools</h1>
                <p className="text-muted-foreground">
                    Select an analysis type, upload media, and let our advanced AI models provide a detailed report.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Analysis Configuration</CardTitle>
                        <CardDescription>Set up the parameters for your forensic analysis.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="analysis-type">1. Select Analysis Type</Label>
                            <Select onValueChange={(value) => setAnalysisType(value as AnalysisType)}>
                                <SelectTrigger id="analysis-type">
                                    <SelectValue placeholder="Choose a tool..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {analysisOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {analysisType && <p className="text-xs text-muted-foreground">{analysisOptions.find(o => o.value === analysisType)?.description}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="media-upload">2. Upload Evidence File</Label>
                            <Input id="media-upload" type="file" accept="image/*" onChange={handleFileChange} />
                            {previewUrl && (
                                <div className="mt-2">
                                    <img src={previewUrl} alt="preview" className="max-h-40 rounded-md shadow-sm" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleAnalysis} disabled={!analysisType || !file || isLoading} className="w-full neon-glow-button">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? "Analyzing..." : "Run Analysis"}
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                        <CardDescription>The AI-generated report will appear below.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[200px]">
                        {isLoading && (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        {results && (
                            <div className="space-y-4">
                                {analysisType === 'deepfakeDetection' && results.deepfakeResult ? (
                                    <DeepfakeDetectionResult 
                        analysisResult={results.deepfakeResult} 
                        imageUrl={results.imageUrl} 
                    />
                                ) : (
                                    <>
                                        {results.confidenceScore && (
                                            <div>
                                                <Label>Confidence Score</Label>
                                                <div className="text-2xl font-bold text-primary">{results.confidenceScore.toFixed(2)}%</div>
                                            </div>
                                        )}
                                        <div>
                                            <Label>Analysis Report</Label>
                                            <Textarea value={results.analysisResults} readOnly rows={8} className="font-code" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {!isLoading && !results && (
                            <div className="flex justify-center items-center h-full text-muted-foreground">
                                <p>Awaiting analysis configuration.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
