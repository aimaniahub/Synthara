"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Terminal,
  RotateCcw,
  Loader2
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

  // Auto-scroll to bottom
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

  // Add log entry - simplified
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

  // Handle stream events - simplified
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
        
        // Only call onError for critical errors, not for individual URL failures
        if (!errorMessage.includes('Failed to scrape') && !errorMessage.includes('HTTP 500') && !errorMessage.includes('HTTP 403') && !errorMessage.includes('HTTP 404')) {
          onError(errorMessage);
        }
        break;
        
      case 'scraped_content':
        const contentLength = data.content?.length || 0;
        addLog('info', `Scraped content: ${contentLength} characters`);
        onScrapedContent(data.content || '');
        break;
        
      case 'complete':
        addLog('success', 'Generation completed successfully!');
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
      // Don't add automatic log - let backend stream events handle all logging
    } else {
      setIsGenerating(false);
    }
  }, [isActive, requestData]);

  // Auto-scroll when logs change
  useEffect(() => {
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, [logs, scrollToBottom]);

  // Expose handleStreamEvent function to parent
  useImperativeHandle(ref, () => ({
    handleStreamEvent
  }), [handleStreamEvent]);

  // Get log color - simplified
  const getLogColor = (log: LogEntry) => {
    switch (log.type) {
      case 'success':
      case 'error':
      case 'warning':
        return 'text-foreground';
      case 'progress':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  if (!isActive) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-foreground" />
            Terminal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ready to show generation progress</p>
            <p className="text-sm">Start generation to see what's happening</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-foreground" />
            Terminal
            {isGenerating && (
              <Badge variant="outline" className="ml-2">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Running
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
            className="h-8"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-black rounded-lg p-4 font-mono text-sm">
          <ScrollArea ref={scrollRef} className="h-64">
            <div className="space-y-1">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Waiting for logs...</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 ${getLogColor(log)}`}
                  >
                    <span className="text-gray-500 text-xs mt-0.5 min-w-[50px]">
                      {log.timestamp}
                    </span>
                    <span className="flex-1 break-words">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
});
