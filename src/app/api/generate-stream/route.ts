import { NextRequest } from 'next/server';
import { generateFromWeb } from '@/ai/flows/generate-from-web-flow';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, numRows, useWebData, refinedSearchQuery } = body;

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Function to send log messages to the frontend
      const sendLog = (message: string, type: 'info' | 'success' | 'error' | 'progress' = 'info') => {
        try {
          if (controller.desiredSize !== null) {
            const data = JSON.stringify({
              message,
              type,
              timestamp: new Date().toISOString()
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          console.error('[StreamAPI] Controller error:', error);
        }
      };

      // Function to send progress updates
      const sendProgress = (step: string, current: number, total: number, details?: string) => {
        try {
          if (controller.desiredSize !== null) {
            const data = JSON.stringify({
              type: 'progress',
              step,
              current,
              total,
              percentage: Math.round((current / total) * 100),
              details,
              timestamp: new Date().toISOString()
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          console.error('[StreamAPI] Progress controller error:', error);
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

            // Call the actual web generation flow with integrated logging
            const result = await generateFromWeb({
              prompt,
              numRows: numRows || 50,
              logger,
              refinedSearchQuery: refinedSearchQuery || prompt // Use refined query if available
            });

            // Add a small delay to ensure all processing is complete
            // This prevents showing fallback data before AI processing finishes
            sendLog('🔄 Finalizing data processing...', 'info');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Validate result structure before sending
            console.log('[StreamAPI] Generation result validation:', {
              hasResult: !!result,
              hasGeneratedRows: !!result?.generatedRows,
              hasGeneratedCsv: !!result?.generatedCsv,
              hasDetectedSchema: !!result?.detectedSchema,
              rowsLength: result?.generatedRows?.length || 0,
              csvLength: result?.generatedCsv?.length || 0,
              schemaLength: result?.detectedSchema?.length || 0,
              isFallbackData: result?.feedback?.includes('fallback') || result?.feedback?.includes('pattern matching'),
            });

            // Always send the result, even if it's empty initially
            // The web scraping process might take time and return results later
            if (result && (result.generatedRows || result.generatedCsv || result.detectedSchema)) {
              // We have some data, validate completeness
              const hasRows = result.generatedRows && result.generatedRows.length > 0;
              const hasRequiredFields = result.generatedCsv && result.detectedSchema;

              if (hasRows && hasRequiredFields) {
                sendLog(`🎉 Successfully generated ${result.generatedRows.length} rows of data!`, 'success');
                sendProgress('Complete', 7, 7, `Generated ${result.generatedRows.length} rows`);
              } else if (hasRows && !hasRequiredFields) {
                sendLog(`⚠️ Data generated but missing CSV or schema. Processing...`, 'info');
                sendProgress('Processing', 7, 7, `Generated ${result.generatedRows?.length || 0} rows, finalizing...`);
              } else {
                sendLog(`ℹ️ Processing in progress, please wait...`, 'info');
                sendProgress('Processing', 6, 7, 'Finalizing data structure...');
              }

              // Always send the result, let the client decide what to do
              const finalData = JSON.stringify({
                type: hasRows && hasRequiredFields ? 'complete' : 'progress',
                result: result,
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
              const progressData = JSON.stringify({
                type: 'progress',
                message: 'Data generation in progress...',
                result: result || {},
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
          try {
            if (controller.desiredSize !== null) {
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
