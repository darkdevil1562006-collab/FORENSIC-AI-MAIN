
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ReportGeneratorPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [caseId, setCaseId] = useState("CASE-2024-00123");
    const [analystName, setAnalystName] = useState("Jane Doe");
    const [evidenceAnalysis, setEvidenceAnalysis] = useState("Fingerprint analysis revealed a partial match to a known suspect. DNA evidence from the scene is currently being processed.");
    const [suspectData, setSuspectData] = useState("Suspect: John Smith. Last known address: 123 Main St. Known associate of the victim.");
    const [aiScores, setAiScores] = useState("Fingerprint Match Confidence: 78.2%, Voice Anomaly Detection: Low, Image Tamper Score: 5.6%");
    const [summary, setSummary] = useState("");
    const { toast } = useToast();

    const handleGenerateSummary = () => {
        setIsLoading(true);
        setSummary("");
        setTimeout(() => {
            setSummary(`Based on the provided data for case ${caseId}, the evidence analysis points to a partial fingerprint match. AI confidence scores corroborate this with a 78.2% match confidence. The suspect, John Smith, is noted. The chain of custody for evidence remains intact.`);
            setIsLoading(false);
            toast({ title: "AI Summary Generated", description: "The evidence summary has been created." });
        }, 1500);
    };
    const handleGenerateReport = () => toast({ title: "Report Downloaded (Mock)", description: "In a real app, a PDF report would be generated and downloaded." });

    return (
        <>
            <div className="space-y-4 mb-8">
                <h1 className="font-headline text-3xl font-bold">Incident Report Generator</h1>
                <p className="text-muted-foreground">Generate downloadable PDF reports with evidence summaries and AI scores.</p>
            </div>
            <Card className="glass-card max-w-3xl mx-auto">
                <CardHeader><CardTitle>New Incident Report</CardTitle><CardDescription>Fill in the details below to compile the final report.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="case-id">Case ID</Label><Input id="case-id" value={caseId} onChange={(e) => setCaseId(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="analyst-name">Lead Analyst</Label><Input id="analyst-name" value={analystName} onChange={(e) => setAnalystName(e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="evidence-summary">Evidence Analysis Summary</Label><Textarea id="evidence-summary" rows={5} value={evidenceAnalysis} onChange={(e) => setEvidenceAnalysis(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="suspect-data">Suspect Data</Label><Textarea id="suspect-data" rows={3} value={suspectData} onChange={(e) => setSuspectData(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="ai-scores">AI Confidence Scores</Label><Textarea id="ai-scores" rows={3} value={aiScores} onChange={(e) => setAiScores(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="evidence-chain">Evidence Chain Tracking</Label><Textarea id="evidence-chain" rows={3} readOnly value="Item #123 uploaded by Analyst Smith at 2024-07-29T10:00:00Z. SHA256: ..." /></div>
                    <Button onClick={handleGenerateSummary} disabled={isLoading} className="w-full">{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate AI Summary</Button>
                    {summary && <div className="space-y-2"><Label htmlFor="generated-summary">Generated Summary</Label><Textarea id="generated-summary" value={summary} readOnly rows={5} className="font-code bg-muted/50" /></div>}
                </CardContent>
                <CardFooter><Button onClick={handleGenerateReport} className="w-full sm:w-auto ml-auto neon-glow-accent-button" disabled={!summary}><Download className="mr-2 h-4 w-4" />Generate & Download PDF Report</Button></CardFooter>
            </Card>
        </>
    );
}
