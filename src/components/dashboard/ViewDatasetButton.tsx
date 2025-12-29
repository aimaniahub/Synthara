"use client";

import { ArrowRight } from "lucide-react";
import { NavButton } from "@/components/ui/nav-button";

interface ViewDatasetButtonProps {
    datasetId?: string;
    disabled?: boolean;
}

/**
 * View Dataset button with instant loading feedback
 */
export function ViewDatasetButton({ datasetId, disabled }: ViewDatasetButtonProps) {
    const href = datasetId ? `/dashboard/preview?datasetId=${datasetId}` : "#";

    if (disabled || !datasetId) {
        return (
            <button
                disabled
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 opacity-50 cursor-not-allowed"
            >
                View Dataset <ArrowRight className="ml-2 h-4 w-4" />
            </button>
        );
    }

    return (
        <NavButton href={href} variant="outline" className="w-full">
            View Dataset <ArrowRight className="ml-2 h-4 w-4" />
        </NavButton>
    );
}
