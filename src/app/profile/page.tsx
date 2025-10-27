
"use client";

import { AppLayout } from "@/components/app-layout";
import { ProfilePage as Page } from "@/components/pages/profile";
import { useState } from "react";

export default function Profile() {
    const [activePage, setActivePage] = useState("profile");
    const onNavigate = (page: string) => setActivePage(page);
    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <Page />
        </AppLayout>
    );
}
