"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Terminal,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Activity
} from 'lucide-react';

interface SimpleTerminalLoggerProps {
  isActive: boolean;
  requestData: any;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
  onScrapedContent: (content: string) => void;
  onClose?: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'progress';
  message: string;
}

// Simple unique ID generator
let logIdCounter = 0;
const generateLogId = (): string => `log_${Date.now()}_${++logIdCounter}`;

export const SimpleTerminalLogger = forwardRef<any, SimpleTerminalLoggerProps>(({
  isActive,
  requestData,
  onComplete,
  onError,
  onScrapedContent,
  onClose
}, ref) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll into view when activated
  const scrollIntoView = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Auto-scroll to bottom of logs
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  // Add log entry with animation delay
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const log: LogEntry = {
      id: generateLogId(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };

    setLogs(prev => [...prev, log]);
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Handle stream events
  const handleStreamEvent = useCallback((data: any) => {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'log':
      case 'info':
        addLog('info', data.message || 'Processing...');
        break;

      case 'progress':
        const percentage = data.percentage || 0;
        const message = data.message || 'Processing...';
        addLog('progress', `[${percentage}%] ${message}`);
        break;

      case 'success':
        addLog('success', data.message || 'Success!');
        break;

      case 'error':
        const errorMessage = data.message || data.error || 'Error occurred';
        addLog('error', errorMessage);

        if (!errorMessage.includes('Failed to scrape') && !errorMessage.includes('HTTP 500') && !errorMessage.includes('HTTP 403') && !errorMessage.includes('HTTP 404')) {
          onError(errorMessage);
        }
        break;

      case 'scraped_content':
        const contentLength = data.content?.length || 0;
        addLog('info', `📄 Scraped content: ${contentLength.toLocaleString()} characters`);
        onScrapedContent(data.content || '');
        break;

      case 'complete':
        addLog('success', '🎉 Generation completed successfully!');
        setIsGenerating(false);
        setTimeout(() => {
          onComplete(data.result);
        }, 1000);
        break;

      default:
        addLog('info', data.message || 'Processing...');
    }
  }, [addLog, onError, onScrapedContent, onComplete]);

  // Effect to handle active state
  useEffect(() => {
    if (isActive && requestData) {
      setIsGenerating(true);
      scrollIntoView();
    } else {
      setIsGenerating(false);
    }
  }, [isActive, requestData, scrollIntoView]);

  // Auto-scroll when logs change
  useEffect(() => {
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, [logs, scrollToBottom]);

  // Expose functions to parent
  useImperativeHandle(ref, () => ({
    handleStreamEvent,
    scrollIntoView
  }), [handleStreamEvent, scrollIntoView]);

  // Get icon for log type
  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-3.5 w-3.5 text-amber-400" />;
      case 'progress':
        return <Zap className="h-3.5 w-3.5 text-blue-400" />;
      default:
        return <Info className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  // Get color classes for log type
  const getLogClasses = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-emerald-300 bg-emerald-500/5 border-l-2 border-emerald-500/50';
      case 'error':
        return 'text-red-300 bg-red-500/5 border-l-2 border-red-500/50';
      case 'warning':
        return 'text-amber-300 bg-amber-500/5 border-l-2 border-amber-500/50';
      case 'progress':
        return 'text-blue-300 bg-blue-500/5 border-l-2 border-blue-500/50';
      default:
        return 'text-slate-300 bg-slate-500/5 border-l-2 border-slate-500/30';
    }
  };

  // Inactive state
  if (!isActive) {
    return (
      <div ref={containerRef}>
        <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800/50 overflow-hidden">
          <CardHeader className="border-b border-slate-800/50 bg-slate-900/50">
            <CardTitle className="flex items-center gap-2 text-slate-300">
              <Terminal className="h-5 w-5" />
              <span>Live Terminal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-center py-16 text-slate-500 bg-gradient-to-b from-slate-900/50 to-slate-950">
              <div className="relative inline-block">
                <Terminal className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
              </div>
              <p className="text-sm font-medium">Ready to stream generation progress</p>
              <p className="text-xs mt-1 opacity-60">Click Generate to start the live feed</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active state with logs
  return (
    <div ref={containerRef}>
      <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800/50 overflow-hidden shadow-2xl shadow-slate-900/50">
        <CardHeader className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-slate-200">
              <div className="relative">
                <Terminal className="h-5 w-5" />
                {isGenerating && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </div>
              <span>Live Terminal</span>
              {isGenerating && (
                <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isGenerating && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
                className="h-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950">
            <ScrollArea ref={scrollRef} className="h-80">
              <div className="p-4 space-y-1.5 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="relative">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                    </div>
                    <p className="mt-4 text-xs">Initializing stream...</p>
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 px-3 py-2 rounded-md transition-all duration-300 ${getLogClasses(log.type)}`}
                      style={{
                        animation: 'fadeSlideIn 0.3s ease-out forwards',
                        animationDelay: `${Math.min(index * 0.02, 0.5)}s`,
                        opacity: 0
                      }}
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {getLogIcon(log.type)}
                      </span>
                      <span className="text-slate-500 text-xs mt-0.5 min-w-[55px] flex-shrink-0 font-normal">
                        {log.timestamp}
                      </span>
                      <span className="flex-1 break-words leading-relaxed">
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Bottom status bar */}
          <div className="border-t border-slate-800/50 bg-slate-900/80 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
            <span>{logs.length} events logged</span>
            {isGenerating && (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Connected
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Keyframes for animation */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

SimpleTerminalLogger.displayName = 'SimpleTerminalLogger';
