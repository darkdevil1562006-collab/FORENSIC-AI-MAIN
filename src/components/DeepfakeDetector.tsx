"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DeepfakeAnalysisResult } from '@/lib/deepfake-analysis';
import { DeepfakeAnalyzer } from '@/lib/deepfake-analysis';

interface Props {
    analysisResult: DeepfakeAnalysisResult | null;
    imageUrl?: string;
}

const analyzer = new DeepfakeAnalyzer();

export async function analyzeImage(imageElement: HTMLImageElement): Promise<DeepfakeAnalysisResult> {
    return await analyzer.analyze(imageElement);
}

function ScoreIndicator({ score, label }: { score: number; label: string }) {
    const getColorClass = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="rounded-lg border p-4 relative overflow-hidden">
            <div className={`text-sm font-medium ${getColorClass(score)}`}>{label}</div>
            <div className="mt-2">
                <Progress value={score} className="h-2" />
            </div>
            <div className="mt-1 text-xl font-bold">{score.toFixed(1)}%</div>
        </div>
    );
}

export function DeepfakeDetectionResult({ analysisResult, imageUrl }: Props) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (analysisResult) {
            setIsLoading(false);
        }
    }, [analysisResult]);

    if (!analysisResult) return null;

    const { isReal, confidence, details } = analysisResult;

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {imageUrl && (
                    <Card>
                        <CardContent className="p-4">
                            <img 
                                src={imageUrl} 
                                alt="Analyzed image" 
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </CardContent>
                    </Card>
                )}
                
                <div className="space-y-4">
                    <Alert 
                        variant={isReal ? "default" : "destructive"} 
                        className={`${isReal ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"} transition-colors duration-500`}
                    >
                        {isReal ? (
                            <Shield className="h-5 w-5 text-green-500" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                        <AlertTitle className={isReal ? "text-green-500" : "text-red-500"}>
                            {isReal ? "Verified Real Image" : "AI-Generated Image Detected"}
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                            <div className="font-semibold mb-2">
                                Overall Confidence: {confidence.toFixed(1)}%
                            </div>
                            {details.metadata.warnings.map((warning, i) => (
                                <Badge key={i} variant="outline" className="mr-2 mb-2 text-yellow-500 border-yellow-500">
                                    {warning}
                                </Badge>
                            ))}
                        </AlertDescription>
                    </Alert>

                    <div className="grid gap-4">
                        <ScoreIndicator 
                            score={details.faceAuthenticityScore} 
                            label="Face Authenticity"
                        />
                        <ScoreIndicator 
                            score={details.imageQualityScore} 
                            label="Image Quality"
                        />
                        <ScoreIndicator 
                            score={details.consistencyScore} 
                            label="Overall Consistency"
                        />
                        {typeof details.colorEffectScore !== 'undefined' && (
                            <ScoreIndicator
                                score={details.colorEffectScore}
                                label="Color Effect Strength"
                            />
                        )}
                    </div>
                </div>
            </div>

            {details.metadata.artifactsDetected.length > 0 && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Detected Artifacts</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 mt-2">
                            {details.metadata.artifactsDetected.map((artifact, i) => (
                                <li key={i}>{artifact}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}