
"use client";

import { AppLayout } from "@/components/app-layout";
import { DashboardPage } from "@/components/pages/dashboard";
import { useState } from "react";

export default function Home() {
    const [activePage, setActivePage] = useState("dashboard");
    const onNavigate = (page: string) => setActivePage(page);

    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <DashboardPage />
        </AppLayout>
    );
}
