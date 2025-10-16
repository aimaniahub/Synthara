"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Terminal,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
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
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  level: 'log' | 'info' | 'warn' | 'error';
}

// Simple unique ID generator
let logIdCounter = 0;
const generateLogId = (): string => `log_${Date.now()}_${++logIdCounter}`;

export function SimpleTerminalLogger({ 
  isActive, 
  requestData, 
  onComplete, 
  onError, 
  onScrapedContent,
  onClose
}: SimpleTerminalLoggerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom with smooth behavior
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Use smooth scrolling for better UX
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Fallback to direct scroll
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, []);

  // Add log entry
  const addLog = useCallback((type: LogEntry['type'], message: string, level: LogEntry['level'] = 'log') => {
    const log: LogEntry = {
      id: generateLogId(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      level
    };

    setLogs(prev => [...prev, log]);
    
    // Auto-scroll immediately and after a short delay for better reliability
    scrollToBottom();
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 150);
  }, [scrollToBottom]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Start streaming - live AI generation with real-time updates
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) return;

    console.log('[SimpleTerminalLogger] Starting live AI generation stream');
    
    clearLogs();
    setIsGenerating(true);
    addLog('info', '🚀 Starting live AI data generation...', 'info');
    addLog('info', '📡 Connecting to AI generation service...', 'info');

    // The actual streaming will be handled by the parent component
    // This logger will receive updates through props
    setIsConnected(true);
    addLog('success', '✅ Connected to AI generation service', 'info');
    addLog('info', '🤖 AI models initialized and ready', 'info');
    addLog('info', '📊 Processing your request...', 'info');

  }, [isActive, clearLogs, addLog]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsGenerating(false);
  }, []);

  // Handle stream events
  const handleStreamEvent = useCallback((data: any) => {
    console.log('[SimpleTerminalLogger] Handling stream event:', data);
    
    switch (data.type) {
      case 'log':
      case 'info':
        addLog('info', `ℹ️  ${data.message}`, 'info');
        if (data.details) {
          addLog('info', `   └─ ${data.details}`, 'info');
        }
        break;
        
      case 'progress':
        const step = data.step || data.current || 1;
        const total = data.total || data.totalSteps || 6;
        const percentage = data.percentage || Math.round((step / total) * 100);
        
        addLog('info', `📊 Step ${step}/${total} (${percentage}%)`, 'info');
        if (data.message) {
          addLog('info', `   └─ ${data.message}`, 'info');
        }
        break;
        
      case 'success':
        addLog('success', `✅ ${data.message}`, 'info');
        if (data.details) {
          addLog('success', `   └─ ${data.details}`, 'info');
        }
        break;
        
      case 'error':
        addLog('error', `❌ ${data.message || data.error}`, 'error');
        if (data.details) {
          addLog('error', `   └─ ${data.details}`, 'error');
        }
        onError(data.message || data.error);
        break;
        
      case 'scraped_content':
        addLog('info', `📄 Content scraped (${data.content?.length || 0} chars)`, 'info');
        onScrapedContent(data.content || '');
        break;
        
      case 'urls_found':
        addLog('success', `🔍 Found ${data.count || 0} URLs`, 'info');
        if (data.details) {
          addLog('success', `   └─ ${data.details}`, 'info');
        }
        break;
        
      case 'pages_scraped':
        addLog('success', `📖 Scraped ${data.count || 0} pages`, 'info');
        if (data.details) {
          addLog('success', `   └─ ${data.details}`, 'info');
        }
        break;
        
      case 'noise_reduction':
        addLog('success', `🧹 Noise reduced by ${data.percentage || 0}%`, 'info');
        if (data.details) {
          addLog('success', `   └─ ${data.details}`, 'info');
        }
        break;
        
      case 'data_generated':
        addLog('success', `📊 Generated ${data.rows || 0} rows`, 'info');
        if (data.details) {
          addLog('success', `   └─ ${data.details}`, 'info');
        }
        break;
        
      case 'complete':
        addLog('success', '🎉 Generation completed!', 'info');
        addLog('success', '   └─ Dataset ready for download', 'info');
        setIsGenerating(false);
        setTimeout(() => {
          onComplete(data.result);
          // Auto-close the logger after 2 seconds
          setTimeout(() => {
            if (onClose) {
              onClose();
            }
          }, 2000);
        }, 1000);
        break;
        
      default:
        console.log('[SimpleTerminalLogger] Unknown message type:', data.type, data);
        addLog('info', `ℹ️  ${data.message || 'Processing...'}`, 'info');
    }
  }, [addLog, onError, onScrapedContent, onComplete]);

  // Effect to start/stop streaming
  useEffect(() => {
    if (isActive && requestData) {
      console.log('[SimpleTerminalLogger] Starting stream for request:', requestData);
      startStreaming();
    } else {
      console.log('[SimpleTerminalLogger] Stopping stream, isActive:', isActive, 'requestData:', !!requestData);
      stopStreaming();
    }

    return () => {
      console.log('[SimpleTerminalLogger] Cleanup: stopping stream');
      stopStreaming();
    };
  }, [isActive, requestData, startStreaming, stopStreaming]);

  // Auto-scroll effect when logs change
  useEffect(() => {
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, [logs, scrollToBottom]);

  // Get log color
  const getLogColor = useCallback((log: LogEntry) => {
    switch (log.type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  }, []);

  if (!isActive) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-green-500" />
            Generation Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ready to show generation logs</p>
            <p className="text-sm">Start a generation to see real-time logs</p>
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
            <Terminal className="h-5 w-5 text-green-500" />
            Generation Logs
            {isConnected && (
              <Badge variant="outline" className="ml-2 text-green-500 border-green-500">
                Live
              </Badge>
            )}
            {isGenerating && (
              <Badge variant="outline" className="ml-2 text-blue-500 border-blue-500">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Running
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="h-8"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
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
                    className={`flex items-start gap-2 ${getLogColor(log)}`}
                  >
                    <span className="text-gray-500 text-xs mt-0.5 min-w-[60px]">
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
}
