'use client';

import React from 'react';
import { Database, SearchX } from 'lucide-react';

interface Props {
    title?: string;
    className?: string;
}

export function EmptyChartState({ title, className }: Props) {
    return (
        <div className={`flex flex-col items-center justify-center min-h-[300px] h-full p-8 text-center bg-muted/5 rounded-3xl border border-dashed border-border/20 animate-in fade-in zoom-in-95 duration-700 ${className || ''}`}>
            <div className="relative mb-6">
                <Database className="size-12 text-muted-foreground/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <SearchX className="size-6 text-muted-foreground/40 translate-y-1 translate-x-1" />
                </div>
            </div>

            <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">
                Data Sequence Not Found
            </h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight max-w-[200px]">
                No valid numeric or categorical intelligence found for "{title || 'this chart'}".
            </p>

            <div className="mt-8 flex gap-1 items-center opacity-30">
                <div className="size-1 rounded-full bg-primary" />
                <div className="size-1 rounded-full bg-primary/60" />
                <div className="size-1 rounded-full bg-primary/30" />
            </div>
        </div>
    );
}
