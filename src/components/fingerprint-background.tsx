
"use client";

import React, { useEffect } from "react";

export function FingerprintBackground() {
    useEffect(() => {
        const particlesContainer = document.querySelector<HTMLDivElement>('#particles');
        if (!particlesContainer) return;
        if (particlesContainer.childElementCount > 0) return;

        const particleCount = 50;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < particleCount; i++) {
            let particle = document.createElement('div');
            particle.style.position = 'absolute';
            const size = Math.random() * 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.borderRadius = '50%';
            particle.style.background = `hsl(var(--primary) / ${Math.random()})`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animation = `float ${Math.random() * 5 + 5}s ease-in-out infinite`;
            particle.style.animationDelay = `${Math.random() * -10}s`;
            fragment.appendChild(particle);
        }
        particlesContainer.appendChild(fragment);
    }, []);

    return (
        <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-background">
            <div id="particles" className="absolute inset-0" />
            <svg className="absolute left-1/2 top-1/2 h-auto w-full max-w-4xl -translate-x-1/2 -translate-y-1/2" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
                        <stop offset="50%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
                    </linearGradient>
                </defs>
                <path d="M 50 20 L 20 50" stroke="hsl(var(--primary) / 0.5)" strokeWidth="0.5" />
                <path d="M 350 20 L 380 50" stroke="hsl(var(--primary) / 0.5)" strokeWidth="0.5" />
                <path d="M 50 380 L 20 350" stroke="hsl(var(--primary) / 0.5)" strokeWidth="0.5" />
                <path d="M 350 380 L 380 350" stroke="hsl(var(--primary) / 0.5)" strokeWidth="0.5" />
                <circle cx="200" cy="200" r="180" fill="none" stroke="hsl(var(--primary) / 0.1)" strokeWidth="1" />
                <circle cx="200" cy="200" r="160" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="0.5" className="animate-spin-slow" />
                <circle cx="200" cy="200" r="158" fill="none" stroke="hsl(var(--accent) / 0.2)" strokeWidth="0.5" className="animate-spin-slower" />
                <g style={{ filter: 'url(#glow)' }} className="animate-pulse-slow">
                    <path fill="none" stroke="url(#green-gradient)" strokeWidth="1" strokeLinecap="round" d="M 200,200 m -140, 0 a 140,140 0 1,0 280,0 a 140,140 0 1,0 -280,0 m 10, -10 a 130,120 0 1,0 260,0 a 130,120 0 1,0 -260,0 m 10, -10 a 115,110 0 1,0 230,0 a 115,110 0 1,0 -230,0 m 10, -10 a 100,100 0 1,0 200,0 a 100,100 0 1,0 -200,0 m 10, -10 a 85,90 0 1,0 170,0 a 85,90 0 1,0 -170,0 m 10, -10 a 70,80 0 1,0 140,0 a 70,80 0 1,0 -140,0 m 10, -5 a 60,70 0 1,0 120,0 a 60,70 0 1,0 -120,0 m 10, 0 a 50,60 0 1,0 100,0 a 50,60 0 1,0 -100,0 m 10, 5 a 40,50 0 1,0 80,0 a 40,50 0 1,0 -80,0 m 10, 5 a 30,40 0 1,0 60,0 a 30,40 0 1,0 -60,0 m 10, 5 a 20,30 0 1,0 40,0 a 20,30 0 1,0 -40,0 m 10, 5 a 10,20 0 1,0 20,0 a 10,20 0 1,0 -20,0" />
                </g>
                <rect x="50" y="0" width="300" height="2" fill="url(#green-gradient)" className="animate-scan-vertical" />
            </svg>
             <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(0px) translateX(0px); }
                    50% { transform: translateY(-20px) translateX(10px); }
                    100% { transform: translateY(0px) translateX(0px); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    transform-origin: center;
                    animation: spin-slow 20s linear infinite;
                }
                @keyframes spin-slower {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                .animate-spin-slower {
                    transform-origin: center;
                    animation: spin-slower 30s linear infinite;
                }
                 @keyframes scan-vertical {
                    0% { transform: translateY(50px); opacity: 0; }
                    10% { opacity: 0.8; }
                    90% { opacity: 0.8; }
                    100% { transform: translateY(350px); opacity: 0; }
                }
                .animate-scan-vertical {
                    animation: scan-vertical 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
