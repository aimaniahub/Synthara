import { NextRequest } from 'next/server';
import { intelligentWebScraping } from '@/ai/flows/intelligent-web-scraping-flow';

// Request deduplication for stream API
const activeRequests = new Map<string, Promise<Response>>();

// Store active streams for SSE connections
const activeStreams = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  // Handle SSE connection
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const initialData = JSON.stringify({
        type: 'info',
        message: 'SSE connection established',
        timestamp: new Date().toISOString()
      });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

      // Store this controller for potential data sending
      const connectionId = Date.now().toString();
      activeStreams.set(connectionId, controller);

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          if (controller.desiredSize !== null) {
            const heartbeatData = JSON.stringify({
              type: 'info',
              message: 'Connection alive',
              timestamp: new Date().toISOString()
            });
            controller.enqueue(encoder.encode(`data: ${heartbeatData}\n\n`));
          }
        } catch (error) {
          console.error('[SSE] Heartbeat error:', error);
          clearInterval(heartbeat);
          activeStreams.delete(connectionId);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected');
        clearInterval(heartbeat);
        activeStreams.delete(connectionId);
        try {
          controller.close();
        } catch (error) {
          console.error('[SSE] Error closing controller:', error);
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, numRows, useWebData, refinedSearchQuery } = body;

  // Create a unique key for this request
  const requestKey = `${prompt}-${numRows}-${refinedSearchQuery || ''}`.toLowerCase().trim();

  // Check if there's already an active request for this exact query
  if (activeRequests.has(requestKey)) {
    console.log(`[StreamAPI] ⚠️ Duplicate request detected for: "${prompt.substring(0, 50)}..."`);
    return new Response('Request already in progress for this query', { status: 429 });
  }

  console.log(`[StreamAPI] 🚀 Starting new stream request for: "${prompt.substring(0, 50)}..."`);

  const responsePromise = createStreamResponse(body, requestKey);
  activeRequests.set(requestKey, responsePromise);

  // Clean up after request completes
  responsePromise.finally(() => {
    activeRequests.delete(requestKey);
    console.log(`[StreamAPI] ✅ Cleaned up request for: "${prompt.substring(0, 50)}..."`);
  });

  return responsePromise;
}

async function createStreamResponse(body: any, requestKey: string): Promise<Response> {
  const { prompt, numRows, useWebData, refinedSearchQuery } = body;

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Function to send log messages to all active SSE connections
      const sendLog = (message: string, type: 'info' | 'success' | 'error' | 'progress' = 'info') => {
        try {
          // Safely escape the message to prevent JSON parsing errors
          const safeMessage = typeof message === 'string'
            ? message.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/"/g, '\\"').replace(/\\/g, '\\\\')
            : String(message);

          const data = JSON.stringify({
            type: type,
            message: safeMessage,
            timestamp: new Date().toISOString()
          });

          // Broadcast to all active SSE connections
          activeStreams.forEach((streamController, connectionId) => {
            try {
              if (streamController.desiredSize !== null) {
                streamController.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } catch (error) {
              console.error(`[StreamAPI] Error sending to connection ${connectionId}:`, error);
              // Remove failed connection
              activeStreams.delete(connectionId);
            }
          });

          // Also send to the current stream if it's still active
          if (controller.desiredSize !== null) {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          console.error('[StreamAPI] Controller error:', error);
          // Send a safe error message if JSON.stringify fails
          try {
            const fallbackData = JSON.stringify({
              type: 'warning',
              message: 'Log message contained invalid characters',
              timestamp: new Date().toISOString()
            });
            
            // Broadcast fallback to all connections
            activeStreams.forEach((streamController, connectionId) => {
              try {
                if (streamController.desiredSize !== null) {
                  streamController.enqueue(encoder.encode(`data: ${fallbackData}\n\n`));
                }
              } catch (streamError) {
                activeStreams.delete(connectionId);
              }
            });
          } catch (fallbackError) {
            console.error('[StreamAPI] Fallback error:', fallbackError);
          }
        }
      };

      // Function to send progress updates to all active SSE connections
      const sendProgress = (step: string, current: number, total: number, details?: string) => {
        try {
          // Safely escape details to prevent JSON parsing errors
          const safeDetails = details
            ? details.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/"/g, '\\"')
            : undefined;

          const data = JSON.stringify({
            type: 'progress',
            step: step,
            current: current,
            total: total,
            percentage: Math.round((current / total) * 100),
            message: `${step} (${current}/${total})`,
            details: safeDetails,
            timestamp: new Date().toISOString()
          });

          // Broadcast to all active SSE connections
          activeStreams.forEach((streamController, connectionId) => {
            try {
              if (streamController.desiredSize !== null) {
                streamController.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } catch (error) {
              console.error(`[StreamAPI] Error sending progress to connection ${connectionId}:`, error);
              activeStreams.delete(connectionId);
            }
          });

          // Also send to the current stream if it's still active
          if (controller.desiredSize !== null) {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          console.error('[StreamAPI] Progress controller error:', error);
          // Send a safe fallback progress update
          try {
            const fallbackData = JSON.stringify({
              type: 'progress',
              step: 'Processing',
              current: current,
              total: total,
              percentage: Math.round((current / total) * 100),
              message: 'Processing...',
              details: 'Progress update',
              timestamp: new Date().toISOString()
            });
            
            // Broadcast fallback to all connections
            activeStreams.forEach((streamController, connectionId) => {
              try {
                if (streamController.desiredSize !== null) {
                  streamController.enqueue(encoder.encode(`data: ${fallbackData}\n\n`));
                }
              } catch (streamError) {
                activeStreams.delete(connectionId);
              }
            });
          } catch (fallbackError) {
            console.error('[StreamAPI] Progress fallback error:', fallbackError);
          }
        }
      };

      // Start the generation process
      (async () => {
        try {
          sendLog('🚀 Starting dataset generation...', 'info');
          
          if (useWebData) {
            sendLog('🌐 Web scraping mode enabled', 'info');
            sendProgress('Initializing', 1, 7, 'Setting up web scraping pipeline');
            
            // Create a custom logger that sends updates to the frontend
            const logger = {
              log: (message: string) => sendLog(`📝 ${message}`, 'info'),
              success: (message: string) => sendLog(`✅ ${message}`, 'success'),
              error: (message: string) => sendLog(`❌ ${message}`, 'error'),
              info: (message: string) => {
                // Handle special scraped content message
                if (message.startsWith('SCRAPED_CONTENT:')) {
                  const content = message.substring('SCRAPED_CONTENT:'.length);
                  // Send scraped content as a special message type
                  const scrapedContentData = JSON.stringify({
                    type: 'scraped_content',
                    content: content,
                    timestamp: new Date().toISOString()
                  });
                  controller.enqueue(encoder.encode(`data: ${scrapedContentData}\n\n`));
                } else {
                  sendLog(`ℹ️ ${message}`, 'info');
                }
              },
              progress: sendProgress
            };

            // Call the intelligent web scraping flow with integrated logging
            const result = await intelligentWebScraping({
              userQuery: prompt,
              numRows: numRows || 25,
              maxUrls: 4, // Maximum URLs to search and scrape - LIMITED TO 4
              useAI: true, // Use AI for all processing steps
            }, logger);

            // Add a small delay to ensure all processing is complete
            // This prevents showing fallback data before AI processing finishes
            sendLog('🔄 Finalizing data processing...', 'info');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Validate result structure before sending
            console.log('[StreamAPI] Generation result validation:', {
              hasResult: !!result,
              hasData: !!result?.data,
              hasCsv: !!result?.csv,
              dataLength: result?.data?.length || 0,
              csvLength: result?.csv?.length || 0,
              urlsFound: result?.urls?.length || 0,
              success: result?.success || false,
            });

            // Always send the result, even if it's empty initially
            // The web scraping process might take time and return results later
            if (result && result.success && result.data && result.data.length > 0) {
              // We have some data, validate completeness
              const hasRows = result.data && result.data.length > 0;
              const hasCsv = result.csv && result.csv.length > 0;

              if (hasRows && hasCsv) {
                sendLog(`🎉 Successfully generated ${result.data.length} rows of data from ${result.urls?.length || 0} URLs!`, 'success');
                sendProgress('Complete', 7, 7, `Generated ${result.data.length} rows`);
              } else if (hasRows && !hasCsv) {
                sendLog(`⚠️ Data generated but missing CSV. Processing...`, 'info');
                sendProgress('Processing', 7, 7, `Generated ${result.data?.length || 0} rows, finalizing...`);
              } else {
                sendLog(`ℹ️ Processing in progress, please wait...`, 'info');
                sendProgress('Processing', 6, 7, 'Finalizing data structure...');
              }

              // Always send the result, let the client decide what to do
              const safeResult = {
                success: result.success || false,
                data: Array.isArray(result.data) ? result.data : [],
                csv: typeof result.csv === 'string' ? result.csv : '',
                schema: Array.isArray(result.schema) ? result.schema : (Array.isArray(result.data) && result.data.length > 0 ? Object.keys(result.data[0]).map(key => ({ name: key, type: 'String' })) : []),
                feedback: typeof result.feedback === 'string' ? result.feedback : '',
                urls: Array.isArray(result.urls) ? result.urls : [],
                searchQueries: Array.isArray(result.searchQueries) ? result.searchQueries : [],
                metadata: typeof result.metadata === 'object' && result.metadata !== null ? result.metadata : {}
              };

              const finalData = JSON.stringify({
                type: hasRows && hasCsv ? 'complete' : 'progress',
                result: safeResult,
                timestamp: new Date().toISOString()
              });
              if (controller.desiredSize !== null) {
                controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
              }
            } else {
              // Only show "no data" error if we're sure the process is complete
              sendLog('ℹ️ Processing in progress, please wait for results...', 'info');
              sendProgress('Processing', 6, 7, 'Generating data...');

              // Send a progress update instead of an error
              const safeProgressResult = result && typeof result === 'object' ? {
                success: result.success || false,
                data: Array.isArray(result.data) ? result.data : [],
                csv: typeof result.csv === 'string' ? result.csv : '',
                schema: Array.isArray(result.schema) ? result.schema : [],
                feedback: typeof result.feedback === 'string' ? result.feedback : '',
                urls: Array.isArray(result.urls) ? result.urls : [],
                searchQueries: Array.isArray(result.searchQueries) ? result.searchQueries : [],
                metadata: typeof result.metadata === 'object' && result.metadata !== null ? result.metadata : {}
              } : {};

              const progressData = JSON.stringify({
                type: 'progress',
                message: 'Data generation in progress...',
                result: safeProgressResult,
                timestamp: new Date().toISOString()
              });
              if (controller.desiredSize !== null) {
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
              }
            }
          } else {
            sendLog('🤖 AI generation mode (no web scraping)', 'info');
            sendLog('⚠️ This mode is not implemented yet', 'error');
          }

        } catch (error: any) {
          sendLog(`💥 Error: ${error.message}`, 'error');
          try {
            if (controller.desiredSize !== null) {
              const errorData = JSON.stringify({
                type: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            }
          } catch (controllerError) {
            console.error('[StreamAPI] Error sending error message:', controllerError);
          }
        } finally {
          // Add a delay before closing to ensure all data is sent
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            if (controller.desiredSize !== null) {
              // Send a final completion message
              const completionData = JSON.stringify({
                type: 'complete',
                message: 'Stream completed',
                timestamp: new Date().toISOString()
              });
              controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
              
              // Close the controller
              controller.close();
            }
          } catch (closeError) {
            // Controller already closed, ignore
            console.log('[StreamAPI] Controller already closed, ignoring close error');
          }
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// The logging is now integrated directly into the generateFromWeb flow
