
"use client";

import React, { useState, useEffect } from "react";

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
    useEffect(() => {
        const mql = window.matchMedia(`(max-width: 767px)`);
        const onChange = () => setIsMobile(window.innerWidth < 768);
        mql.addEventListener("change", onChange);
        setIsMobile(window.innerWidth < 768);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return !!isMobile;
}
