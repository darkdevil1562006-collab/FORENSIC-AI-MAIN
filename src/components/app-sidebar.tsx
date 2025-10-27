
"use client";

import React from "react";
import Link from "next/link";
import { Home, User, Settings, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";


export function AppSidebar({ open, onOpenChange, isDashboard, onNavigate, activePage }: { open: boolean, onOpenChange: (open: boolean) => void, isDashboard: boolean, onNavigate: (page: string) => void, activePage: string }) {
    const { toast } = useToast();
    const handleLogout = () => toast({ title: "Logged Out (Mock)", description: "You have been logged out." });
    const menuItems = [
        { href: "/", icon: Home, label: "Dashboard" },
        { href: "/profile", icon: User, label: "Profile" },
        { href: "/settings", icon: Settings, label: "Settings" },
    ];
    const content = (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between border-b h-14 px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold cursor-pointer">
                    <Logo />
                    <span className="font-headline">ForensicAI</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className={cn("md:hidden")}>
                    <X className="h-6 w-6" />
                </Button>
            </div>
            <div className="flex-1 p-2 md:p-4 space-y-2">
                {menuItems.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer", (activePage === item.label.toLowerCase() || (item.href === '/' && activePage === 'dashboard')) && "bg-muted text-primary")}>
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                ))}
            </div>
            <div className="mt-auto p-4 border-t">
                <Button variant="secondary" className="w-full justify-start gap-3" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" /> Logout
                </Button>
            </div>
        </div>
    );
    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="left" className={cn("p-0 w-full max-w-xs", !isDashboard && "md:hidden")}>
                    {content}
                </SheetContent>
            </Sheet>
            <aside className={cn("hidden bg-background border-r h-full md:flex md:flex-col md:fixed md:inset-y-0 md:z-50 md:w-64", isDashboard && "md:hidden")}>
                {content}
            </aside>
        </>
    );
}
