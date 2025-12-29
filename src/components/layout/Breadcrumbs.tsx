"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

export function Breadcrumbs() {
    const pathname = usePathname();
    const paths = pathname.split("/").filter(Boolean);

    if (paths.length === 0) return null;

    return (
        <nav className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground/60" aria-label="Breadcrumb">
            <Link
                href="/dashboard"
                className="flex items-center hover:text-foreground transition-colors"
            >
                <Home className="size-3.5" />
            </Link>

            {paths.map((path, index) => {
                const href = `/${paths.slice(0, index + 1).join("/")}`;
                const isLast = index === paths.length - 1;
                const title = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");

                if (path === "dashboard" && index === 0) return null;

                return (
                    <React.Fragment key={path}>
                        <ChevronRight className="size-3.5 text-muted-foreground/30" />
                        {isLast ? (
                            <span className="text-foreground tracking-tight font-black">{title}</span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-foreground transition-colors tracking-tight"
                            >
                                {title}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
