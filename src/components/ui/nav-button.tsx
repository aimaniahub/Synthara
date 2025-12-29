"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, ButtonProps } from '@/components/ui/button';
import { useNavigationLoading } from '@/components/providers/navigation-loading-provider';
import { cn } from '@/lib/utils';

interface NavButtonProps extends Omit<ButtonProps, 'asChild'> {
    href: string;
    children: React.ReactNode;
}

/**
 * Navigation button that shows loading overlay immediately on click
 * Use this instead of Button with asChild + Link for instant feedback
 */
export function NavButton({ href, children, className, ...props }: NavButtonProps) {
    const pathname = usePathname();
    const { startLoading } = useNavigationLoading();

    const handleClick = () => {
        // Only show loading if navigating to a different page
        if (href !== pathname) {
            startLoading();
        }
    };

    return (
        <Button className={cn(className)} {...props} asChild>
            <Link href={href} onClick={handleClick}>
                {children}
            </Link>
        </Button>
    );
}
