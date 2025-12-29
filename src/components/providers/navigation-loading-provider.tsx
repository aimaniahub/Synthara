"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface NavigationLoadingContextType {
    isLoading: boolean;
    startLoading: () => void;
    stopLoading: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType>({
    isLoading: false,
    startLoading: () => { },
    stopLoading: () => { },
});

export function useNavigationLoading() {
    return useContext(NavigationLoadingContext);
}

/**
 * Provider that shows a full-screen loading overlay immediately when navigating
 * This prevents the "frozen" feeling during Next.js compilation
 */
export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();

    const startLoading = useCallback(() => {
        setIsLoading(true);
    }, []);

    const stopLoading = useCallback(() => {
        setIsLoading(false);
    }, []);

    // Stop loading when route changes (navigation complete)
    useEffect(() => {
        setIsLoading(false);
    }, [pathname]);

    // Safety timeout - stop loading after 30 seconds max
    useEffect(() => {
        if (isLoading) {
            const timeout = setTimeout(() => {
                setIsLoading(false);
            }, 30000);
            return () => clearTimeout(timeout);
        }
    }, [isLoading]);

    return (
        <NavigationLoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
            {children}

            {/* Full-screen loading overlay */}
            {isLoading && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
                    role="status"
                    aria-label="Loading page"
                >
                    <div className="flex flex-col items-center gap-4">
                        {/* Animated spinner */}
                        <div className="relative">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            {/* Glow effect */}
                            <div className="absolute inset-0 h-12 w-12 rounded-full bg-primary/20 blur-xl animate-pulse" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground animate-pulse">
                            Loading...
                        </p>
                    </div>
                </div>
            )}
        </NavigationLoadingContext.Provider>
    );
}
