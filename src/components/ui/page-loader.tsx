"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface PageLoaderProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Animated loading spinner with optional message
 * Used as a full-page loader during navigation
 */
import { SyntharaLogo } from "@/components/icons/SyntharaLogo";

export function PageLoader({
    message = "Initializing Synthara",
    size = 'md',
    className
}: PageLoaderProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in duration-1000",
            className
        )}>
            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:blur-3xl transition-all animate-pulse" />
                <SyntharaLogo className="h-16 w-auto text-primary relative z-10" />
            </div>

            <div className="space-y-2 text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-primary/60 animate-pulse">
                    {message}
                </p>
                <div className="h-1 w-48 bg-muted rounded-full overflow-hidden mx-auto">
                    <div className="h-full w-1/3 bg-primary rounded-full animate-[shimmer_2s_infinite]" />
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
            `}</style>
        </div>
    );
}

export function StatsCardSkeleton() {
    return (
        <div className="modern-card p-6 animate-pulse border-none bg-muted/20">
            <div className="flex items-center justify-between mb-6">
                <div className="h-3 w-20 bg-muted rounded-full" />
                <div className="h-10 w-10 bg-muted rounded-xl" />
            </div>
            <div className="space-y-3">
                <div className="h-8 w-24 bg-muted rounded-lg" />
                <div className="h-3 w-32 bg-muted rounded-full opacity-50" />
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="modern-card border-none bg-muted/10 overflow-hidden">
            <div className="p-6 border-b border-border/10 bg-muted/20">
                <div className="flex gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-3 bg-muted rounded-full flex-1 animate-pulse" />
                    ))}
                </div>
            </div>
            <div className="space-y-0 text-center">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-6 border-b border-border/5 last:border-none">
                        <div className="flex gap-6">
                            {[1, 2, 3, 4].map((j) => (
                                <div
                                    key={j}
                                    className="h-3 bg-muted rounded-full flex-1 animate-pulse"
                                    style={{ animationDelay: `${(i * 4 + j) * 50}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3">
                    <div className="h-10 w-64 bg-muted rounded-2xl animate-pulse" />
                    <div className="h-4 w-48 bg-muted rounded-full animate-pulse opacity-60" />
                </div>
                <div className="flex gap-3">
                    <div className="h-12 w-32 bg-muted rounded-xl animate-pulse" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <StatsCardSkeleton key={i} />
                ))}
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <TableSkeleton rows={6} />
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <div className="h-48 bg-muted/20 rounded-3xl border border-border/10 animate-pulse" />
                    <div className="h-64 bg-muted/20 rounded-3xl border border-border/10 animate-pulse" />
                </div>
            </div>
        </div>
    );
}

export function GenerateSkeleton() {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="h-12 w-64 bg-muted rounded-2xl animate-pulse" />
            <div className="modern-card p-10 space-y-8 border-none bg-muted/10">
                <div className="space-y-4">
                    <div className="h-4 w-32 bg-muted rounded-full opacity-60" />
                    <div className="h-14 w-full bg-muted rounded-2xl animate-pulse" />
                </div>
                <div className="space-y-4">
                    <div className="h-4 w-24 bg-muted rounded-full opacity-60" />
                    <div className="h-32 w-full bg-muted rounded-2xl animate-pulse" />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <div className="h-14 w-full sm:w-48 bg-muted rounded-2xl animate-pulse" />
                    <div className="h-14 w-full sm:w-48 bg-muted rounded-2xl animate-pulse" />
                </div>
            </div>
        </div>
    );
}

export function AnalysisSkeleton() {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="h-10 w-64 bg-muted rounded-2xl animate-pulse" />
                <div className="h-12 w-48 bg-muted rounded-xl animate-pulse" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-[400px] modern-card border-none bg-muted/10 animate-pulse" />
                <div className="h-[400px] modern-card border-none bg-muted/10 animate-pulse" />
            </div>
            <TableSkeleton rows={8} />
        </div>
    );
}
