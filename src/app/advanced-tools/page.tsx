
"use client";

import { AppLayout } from "@/components/app-layout";
import { AdvancedToolsPage as Page } from "@/components/pages/advanced-tools";
import { useState } from "react";

export default function AdvancedTools() {
    const [activePage, setActivePage] = useState("advanced-tools");
    const onNavigate = (page: string) => setActivePage(page);
    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <Page />
        </AppLayout>
    );
}
