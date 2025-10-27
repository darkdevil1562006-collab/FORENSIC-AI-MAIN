
"use client";

import { AppLayout } from "@/components/app-layout";
import { FaceRecognitionPage as Page } from "@/components/pages/face-recognition";
import { useState } from "react";

export default function FaceRecognition() {
    const [activePage, setActivePage] = useState("face-recognition");
    const onNavigate = (page: string) => setActivePage(page);
    return (
        <AppLayout onNavigate={onNavigate} activePage={activePage}>
            <Page />
        </AppLayout>
    );
}
