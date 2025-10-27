
"use client";

import { AppLayout } from "@/components/app-layout";
import { SuspectManagementPage as Page } from "@/components/pages/suspect-management";
import { useState } from "react";

export default function SuspectManagement() {
    const [activePage, setActivePage] = useState("suspect-management");
    const onNavigate = (page: string) => setActivePage(page);
    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <Page />
        </AppLayout>
    );
}
