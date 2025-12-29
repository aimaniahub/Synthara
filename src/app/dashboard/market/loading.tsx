import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function MarketLoading() {
    return (
        <div className="space-y-10 animate-pulse">
            {/* Header Skeleton */}
            <div className="rounded-3xl border border-border/50 bg-muted/20 p-8 md:p-12 h-[240px]">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-12 w-1/3 rounded-xl" />
                    <Skeleton className="h-20 w-1/2 rounded-xl" />
                </div>
            </div>

            {/* Toolbar Skeleton */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-2">
                <Skeleton className="h-12 w-full md:max-w-md rounded-xl" />
                <Skeleton className="h-4 w-32 rounded-lg" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="rounded-2xl border border-border/50 bg-muted/10 h-[280px]">
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between">
                                <Skeleton className="h-12 w-12 rounded-2xl" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <Skeleton className="h-8 w-3/4 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-1/2 rounded-lg" />
                                <Skeleton className="h-4 w-1/3 rounded-lg" />
                            </div>
                            <div className="pt-6 flex gap-3">
                                <Skeleton className="h-12 flex-1 rounded-xl" />
                                <Skeleton className="h-12 flex-1 rounded-xl" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
