
"use client";

import { AppLayout } from "@/components/app-layout";
import { ReportGeneratorPage as Page } from "@/components/pages/report-generator";
import { useState } from "react";

export default function ReportGenerator() {
    const [activePage, setActivePage] = useState("report-generator");
    const onNavigate = (page: string) => setActivePage(page);
    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <Page />
        </AppLayout>
    );
}
