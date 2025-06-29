'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'progress';
  timestamp: string;
  step?: string;
  current?: number;
  total?: number;
  percentage?: number;
  details?: string;
}

interface LiveLoggerProps {
  isActive: boolean;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  requestData?: {
    prompt: string;
    numRows: number;
    useWebData: boolean;
  };
}

export function LiveLogger({ isActive, onComplete, onError, requestData }: LiveLoggerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentProgress, setCurrentProgress] = useState<LogEntry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Memoize requestData to prevent unnecessary re-renders
  const memoizedRequestData = useMemo(() => requestData, [
    requestData?.prompt,
    requestData?.numRows,
    requestData?.useWebData
  ]);

  useEffect(() => {
    console.log('[LiveLogger] useEffect triggered:', {
      isActive,
      hasRequestData: !!memoizedRequestData,
      isRequestInProgress,
      requestDataPrompt: memoizedRequestData?.prompt?.substring(0, 50)
    });

    if (isActive && memoizedRequestData && !isRequestInProgress) {
      console.log('[LiveLogger] Starting logging from useEffect');
      startLogging();
    } else if (!isActive) {
      console.log('[LiveLogger] Stopping logging from useEffect');
      stopLogging();
    } else {
      console.log('[LiveLogger] Skipping action:', { isActive, hasRequestData: !!memoizedRequestData, isRequestInProgress });
    }

    return () => {
      console.log('[LiveLogger] useEffect cleanup');
      stopLogging();
    };
  }, [isActive, memoizedRequestData]);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  const startLogging = async () => {
    if (!memoizedRequestData || isRequestInProgress) {
      console.log('[LiveLogger] Skipping request - no data or request already in progress', {
        hasData: !!memoizedRequestData,
        isRequestInProgress,
        prompt: memoizedRequestData?.prompt?.substring(0, 30)
      });
      return;
    }

    console.log('[LiveLogger] Starting new request', {
      prompt: memoizedRequestData.prompt.substring(0, 30),
      numRows: memoizedRequestData.numRows,
      timestamp: new Date().toISOString()
    });
    setIsRequestInProgress(true);

    try {
      setLogs([]);
      setCurrentProgress(null);
      setIsConnected(true);

      // Start the streaming request
      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memoizedRequestData),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleLogMessage(data);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Streaming error:', error);
      addLog(`Connection error: ${error.message}`, 'error');
      onError?.(error.message);
    } finally {
      setIsConnected(false);
      setIsRequestInProgress(false);
      console.log('[LiveLogger] Request completed, clearing guard');
    }
  };

  const stopLogging = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsRequestInProgress(false);
    console.log('[LiveLogger] Stopped logging, clearing guard');
  };

  const handleLogMessage = (data: any) => {
    if (data.type === 'progress') {
      setCurrentProgress(data);
      // If it's a progress message with result data, don't treat it as completion yet
      if (data.result && data.result.generatedRows && data.result.generatedRows.length > 0) {
        addLog(`📊 Partial results: ${data.result.generatedRows.length} rows generated`, 'info');
      }
    } else if (data.type === 'complete') {
      // Log detailed completion information
      const result = data.result;
      addLog('🎉 Dataset generation completed successfully!', 'success');

      if (result) {
        addLog(`📊 Generated ${result.generatedRows?.length || 0} rows of data`, 'info');
        addLog(`📋 Schema contains ${result.detectedSchema?.length || 0} columns`, 'info');
        addLog(`📄 CSV size: ${result.generatedCsv?.length || 0} characters`, 'info');

        // Validate completeness
        const hasAllFields = result.generatedRows && result.generatedCsv && result.detectedSchema;
        if (hasAllFields) {
          addLog('✅ All required data fields are present and ready for saving', 'success');
        } else {
          const missing = [];
          if (!result.generatedRows) missing.push('rows');
          if (!result.generatedCsv) missing.push('CSV');
          if (!result.detectedSchema) missing.push('schema');
          addLog(`⚠️ Warning: Missing data fields: ${missing.join(', ')}`, 'error');
        }
      }

      onComplete?.(data.result);
      setIsConnected(false);
    } else if (data.type === 'error') {
      // Only show critical errors that stop the process
      // Don't show timeout/rate limit errors if process is still running
      const isCriticalError = data.error && (
        data.error.includes('API key') ||
        data.error.includes('authentication') ||
        data.error.includes('Failed during web search') ||
        data.error.includes('No relevant search results found')
      );

      // Check if it's a "No data generated" error but process might still be running
      const isNoDataError = data.error && data.error.includes('No data generated');

      if (isCriticalError && !isNoDataError) {
        addLog(`❌ Error: ${data.error}`, 'error');
        onError?.(data.error);
        setIsConnected(false);
      } else {
        // Log non-critical errors as warnings or info
        if (isNoDataError) {
          addLog(`ℹ️ Initial processing: ${data.error} (process may still be running...)`, 'info');
        } else {
          addLog(`⚠️ Warning: ${data.error}`, 'warning');
        }
        // Don't call onError or disconnect for non-critical errors
      }
    } else {
      addLog(data.message, data.type);
    }
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error') => {
    const newLog: LogEntry = {
      message,
      type,
      timestamp: new Date().toISOString(),
    };
    setLogs(prev => [...prev, newLog]);
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'info':
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            🔄 Live Generation Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <Badge variant="secondary">Processing</Badge>
              </>
            )}
            {!isConnected && logs.length > 0 && (
              <Badge variant="outline">Complete</Badge>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        {currentProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{currentProgress.step}</span>
              <span className="text-muted-foreground">
                {currentProgress.current}/{currentProgress.total}
              </span>
            </div>
            <Progress value={currentProgress.percentage || 0} className="h-2" />
            {currentProgress.details && (
              <p className="text-sm text-muted-foreground">{currentProgress.details}</p>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64 w-full rounded border" ref={scrollAreaRef}>
          <div className="p-4 space-y-2">
            {logs.length === 0 && isConnected && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing...</span>
              </div>
            )}
            
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {getLogIcon(log.type)}
                <div className="flex-1">
                  <span className={getLogTextColor(log.type)}>
                    {log.message}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isConnected && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
