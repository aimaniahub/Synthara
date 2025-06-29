// Test the fixed web scraping functionality
console.log('Testing FIXED web scraping...');

async function testFixedWebScraping() {
  try {
    console.log('\n🧪 Testing web scraping with fixes...');
    
    const response = await fetch('http://localhost:3001/api/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Generate customer data with names and emails',
        numRows: 5,
        useWebData: true
      })
    });

    console.log('✅ Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('\n📡 Reading streaming response...');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let messageCount = 0;
    let hasQueryRefinement = false;
    let hasLinkFiltering = false;
    let hasWebScraping = false;
    let hasAIProcessing = false;
    let hasFinalResult = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          messageCount++;
          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            
            // Check for key workflow steps
            if (parsed.message && parsed.message.includes('Refining search query')) {
              hasQueryRefinement = true;
              console.log('✅ Query refinement working');
            }
            
            if (parsed.message && parsed.message.includes('AI is filtering')) {
              hasLinkFiltering = true;
              console.log('✅ AI link filtering working');
            }
            
            if (parsed.message && parsed.message.includes('Successfully scraped')) {
              hasWebScraping = true;
              console.log('✅ Web scraping working');
            }
            
            if (parsed.message && parsed.message.includes('AI is analyzing')) {
              hasAIProcessing = true;
              console.log('✅ AI processing working');
            }

            if (parsed.type === 'complete') {
              hasFinalResult = true;
              console.log('\n🎉 COMPLETE! Final result:', {
                hasGeneratedRows: !!parsed.result?.generatedRows,
                rowCount: parsed.result?.generatedRows?.length || 0,
                hasGeneratedCsv: !!parsed.result?.generatedCsv,
                csvLength: parsed.result?.generatedCsv?.length || 0,
                hasDetectedSchema: !!parsed.result?.detectedSchema,
                schemaLength: parsed.result?.detectedSchema?.length || 0,
                isFallbackData: parsed.result?.isFallbackData || false
              });
              break;
            }

            if (parsed.type === 'error') {
              console.log('\n❌ ERROR:', parsed.error);
              break;
            }

          } catch (parseError) {
            // Skip non-JSON messages
          }
        }
      }
    }

    console.log('\n📊 WORKFLOW VERIFICATION:');
    console.log('✅ Query Refinement:', hasQueryRefinement ? 'WORKING' : '❌ MISSING');
    console.log('✅ Link Filtering:', hasLinkFiltering ? 'WORKING' : '❌ MISSING');
    console.log('✅ Web Scraping:', hasWebScraping ? 'WORKING' : '❌ MISSING');
    console.log('✅ AI Processing:', hasAIProcessing ? 'WORKING' : '❌ MISSING');
    console.log('✅ Final Result:', hasFinalResult ? 'WORKING' : '❌ MISSING');
    
    const allWorking = hasQueryRefinement && hasLinkFiltering && hasWebScraping && hasAIProcessing && hasFinalResult;
    console.log('\n🎯 OVERALL STATUS:', allWorking ? '✅ ALL SYSTEMS WORKING!' : '❌ SOME ISSUES DETECTED');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedWebScraping();
