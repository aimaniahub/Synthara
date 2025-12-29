"use client";

import { PlusCircle, BarChart, Globe } from "lucide-react";
import { NavButton } from "@/components/ui/nav-button";

/**
 * Dashboard header action buttons with instant loading feedback
 */
export function DashboardActions() {
    return (
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <NavButton size="sm" variant="outline" href="/dashboard/generate">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Dataset
            </NavButton>
            <NavButton size="sm" variant="outline" href="/dashboard/analysis">
                <BarChart className="mr-2 h-4 w-4" /> View Analytics
            </NavButton>
            <NavButton size="sm" variant="default" href="/dashboard/market">
                <Globe className="mr-2 h-4 w-4" /> Dataset Market
            </NavButton>
        </div>
    );
}
