"use client";

import React from 'react';

/**
 * Root loading component for the whole application
 * Provides a smooth transition for initial page loads
 */
export default function Loading() {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-4 text-center">
            <div className="relative mb-8 h-20 w-20">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />

                {/* Inner pulsing circle */}
                <div className="absolute inset-4 animate-pulse rounded-full bg-primary/10 shadow-lg shadow-primary/20" />

                {/* Center icon or logo placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="animate-pulse text-lg font-bold tracking-tight text-foreground">
                    Synthara AI
                </h2>
                <p className="max-w-[12rem] text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                    Initializing Systems
                </p>
            </div>

            {/* Progress line at the bottom */}
            <div className="absolute bottom-0 left-0 h-1 w-full overflow-hidden bg-primary/5">
                <div className="h-full w-2/3 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>

            <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
        </div>
    );
}
