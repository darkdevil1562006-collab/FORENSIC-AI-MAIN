
"use client";

import { AppLayout } from "@/components/app-layout";
import { FingerprintAnalysisPage as Page } from "@/components/pages/fingerprint-analysis";
import { useState } from "react";

export default function FingerprintAnalysis() {
    const [activePage, setActivePage] = useState("fingerprint-analysis");
    const onNavigate = (page: string) => setActivePage(page);
    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <Page />
        </AppLayout>
    );
}
