'use client';

import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

interface Props {
    insight: string;
    className?: string;
}

export function MLInsightBadge({ insight, className }: Props) {
    if (!insight) return null;

    return (
        <div className={`group relative overflow-hidden p-4 rounded-2xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 hover:border-primary/20 duration-500 ${className || ''}`}>
            {/* Decorative gradient background */}
            <div className="absolute top-0 right-0 p-8 bg-gradient-to-br from-primary/10 to-transparent rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-125 transition-transform duration-700" />

            <div className="relative flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm shadow-primary/5">
                    <BrainCircuit className="size-4" />
                </div>

                <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                            Intelligence Insight
                        </span>
                        <div className="size-1 rounded-full bg-primary/40" />
                        <Sparkles className="size-3 text-primary animate-pulse" />
                    </div>

                    <p className="text-xs text-foreground font-bold leading-relaxed tracking-tight group-hover:text-foreground/90 transition-colors">
                        {insight}
                    </p>
                </div>
            </div>
        </div>
    );
}
