'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
    children: ReactNode;
    chartTitle?: string;
    onRetry?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ChartErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Chart error caught:', error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onRetry) {
            this.props.onRetry();
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 text-center bg-destructive/5 rounded-3xl border border-destructive/20 animate-in fade-in duration-500">
                    <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
                        <AlertCircle className="size-8" />
                    </div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">
                        Visualization Module Failure
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight max-w-xs mb-6">
                        An unexpected error occurred while rendering the data sequence for "{this.props.chartTitle || 'Unknown Chart'}".
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={this.handleRetry}
                        className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive/10"
                    >
                        <RefreshCcw className="size-3 mr-2" />
                        Re-sync Module
                    </Button>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 rounded-xl bg-black/5 text-left w-full overflow-auto max-h-[150px]">
                            <p className="text-[9px] font-mono text-destructive/70 whitespace-pre-wrap">
                                {this.state.error?.message}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
