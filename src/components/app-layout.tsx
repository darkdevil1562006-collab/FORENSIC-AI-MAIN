
"use client"

import React, { useState } from "react";
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { ForensicBackground } from './forensic-background';
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout({ children, onNavigate, activePage }: { children: React.ReactNode, onNavigate: (page: string) => void, activePage: string }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isMobile = useIsMobile();

    const isDashboard = activePage === 'dashboard';

    return (
        <div className="relative min-h-screen">
            <ForensicBackground />
            <AppSidebar
                open={sidebarOpen}
                onOpenChange={setSidebarOpen}
                isDashboard={isDashboard}
                onNavigate={onNavigate}
                activePage={activePage}
            />
            <div className={cn(
                "flex flex-col flex-1 transition-all duration-300 ease-in-out",
                !isDashboard && "md:pl-64"
            )}>
                <AppHeader
                    onMenuClick={() => setSidebarOpen(true)}
                    showMenuButton={!isDashboard || isMobile}
                    onNavigate={onNavigate}
                />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
