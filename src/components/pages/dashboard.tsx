
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Fingerprint, Users, ScanFace, AudioWaveform, FlaskConical, FileText } from "lucide-react";
import { FingerprintBackground } from "@/components/fingerprint-background";
import { OverallCaseStatistics } from "@/components/OverallCaseStatistics";
import Link from "next/link";

export function DashboardPage() {
    const features = [
        { title: "Fingerprint Analysis", description: "Scan & match fingerprints against database records.", href: "fingerprint-analysis", icon: <Fingerprint className="size-8 text-primary" /> },
        { title: "Suspect Management", description: "Manage suspect profiles and evidence.", href: "suspect-management", icon: <Users className="size-8 text-primary" /> },
        { title: "Face Recognition", description: "Identify suspects and detect deepfakes from images.", href: "face-recognition", icon: <ScanFace className="size-8 text-primary" /> },
    // Voice Recognition removed
        { title: "Advanced AI Tools", description: "Utilize a suite of advanced forensic AI capabilities.", href: "advanced-tools", icon: <FlaskConical className="size-8 text-primary" /> },
        { title: "Incident Reports", description: "Generate and manage case reports.", href: "report-generator", icon: <FileText className="size-8 text-primary" /> },
    ];
    return (
        <div className="relative isolate">
            <FingerprintBackground />
            <div className="space-y-8">
                <div className="flex flex-col gap-4 p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                    <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl xl:text-5xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">ForensicAI Dashboard</h1>
                    <p className="text-muted-foreground md:text-xl">Welcome to the future of forensic analysis. Select a module to begin.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <OverallCaseStatistics />
                    {features.map((feature) => (
                        <Link key={feature.href} href={feature.href} className="cursor-pointer">
                            <Card className="glass-card h-full transition-all duration-300 hover:border-primary/80 hover:shadow-lg hover:shadow-primary/10 flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-medium font-headline">{feature.title}</CardTitle>
                                    {feature.icon}
                                </CardHeader>
                                <CardContent className="flex-grow"><p className="text-sm text-muted-foreground">{feature.description}</p></CardContent>
                                <div className="flex items-center p-6 pt-0 text-sm font-medium text-primary">Open Module <ChevronRight className="ml-1 size-4" /></div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
