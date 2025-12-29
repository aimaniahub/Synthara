"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * NProgress-style route transition progress bar
 * Shows at the top of the page during route changes
 */
export function RouteProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevPathRef = useRef(pathname);

    const startProgress = useCallback(() => {
        setIsVisible(true);
        setProgress(0);

        // Quickly progress to 30%
        setTimeout(() => setProgress(30), 50);

        // Slowly progress towards 90%
        intervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    return prev;
                }
                return prev + Math.random() * 10;
            });
        }, 300);
    }, []);

    const completeProgress = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setProgress(100);

        // Hide after animation completes
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            setProgress(0);
        }, 300);
    }, []);

    useEffect(() => {
        // Route changed
        if (pathname !== prevPathRef.current) {
            startProgress();

            // Complete after a short delay (simulating load time)
            timeoutRef.current = setTimeout(() => {
                completeProgress();
            }, 100);

            prevPathRef.current = pathname;
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [pathname, searchParams, startProgress, completeProgress]);

    if (!isVisible && progress === 0) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none"
            aria-hidden="true"
        >
            <div
                className="h-full bg-gradient-to-r from-primary via-primary to-primary/50 transition-all duration-200 ease-out shadow-lg shadow-primary/30"
                style={{
                    width: `${progress}%`,
                    opacity: isVisible ? 1 : 0,
                }}
            />
        </div>
    );
}
