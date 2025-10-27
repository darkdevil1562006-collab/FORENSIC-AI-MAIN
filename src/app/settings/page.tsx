
"use client";

import { AppLayout } from "@/components/app-layout";
import { SettingsPage as Page } from "@/components/pages/settings";
import { useState } from "react";

export default function Settings() {
    const [activePage, setActivePage] = useState("settings");
    const onNavigate = (page: string) => setActivePage(page);
    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <Page />
        </AppLayout>
    );
}
