
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileClock, Archive, ShieldAlert, CheckCircle } from "lucide-react";

const useCountUp = (end: number, duration: number = 1500) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const range = end - start;
        let startTime: number | null = null;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const increment = Math.min(start + (range * progress) / duration, end);
            setCount(increment);
            if (progress < duration) requestAnimationFrame(animate);
            else setCount(end);
        };
        requestAnimationFrame(animate);
    }, [end, duration]);
    return Math.floor(count);
};

const StatItem = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => {
    const count = useCountUp(value);
    return (
        <div className="flex items-center gap-4 transition-transform duration-300 hover:scale-105">
            <Icon className="size-8 text-primary/80 drop-shadow-[0_0_5px_hsl(var(--primary))] shrink-0" />
            <div>
                <div className="font-headline text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent animate-pulse-slow">
                    {count}
                </div>
                <div className="text-sm text-muted-foreground">{label}</div>
            </div>
        </div>
    );
};

export function OverallCaseStatistics() {
    const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, highPriority: 0, closed: 0 });
    
    const getRandomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const generateStats = useCallback(() => {
        setStats({
            total: getRandomNumber(50, 200),
            pending: getRandomNumber(5, 40),
            active: getRandomNumber(10, 80),
            highPriority: getRandomNumber(1, 25),
            closed: getRandomNumber(5, 50),
        });
    }, []);

    useEffect(() => {
        generateStats();
        const interval = setInterval(generateStats, 10000);
        return () => clearInterval(interval);
    }, [generateStats]);

    const statItems = [
        { id: "total", label: "Total Cases", value: stats.total, icon: Briefcase },
        { id: "pending", label: "Pending", value: stats.pending, icon: FileClock },
        { id: "active", label: "Active", value: stats.active, icon: Archive },
        { id: "high", label: "High-Priority", value: stats.highPriority, icon: ShieldAlert },
        { id: "closed", label: "Closed", value: stats.closed, icon: CheckCircle },
    ];

    return (
        <Card className="glass-card col-span-1 lg:col-span-3 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader>
                <CardTitle className="font-headline text-lg text-primary">Overall Case Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-4">
                    {statItems.map(item => <StatItem key={item.id} label={item.label} value={item.value} icon={item.icon} />)}
                </div>
            </CardContent>
        </Card>
    );
}
