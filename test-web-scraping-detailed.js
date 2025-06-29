// Detailed test of web scraping functionality
console.log('Testing web scraping step by step...');

async function testWebScraping() {
  try {
    console.log('\n1. Testing API endpoint...');
    
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

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('\n2. Reading streaming response...');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let messageCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          messageCount++;
          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            console.log(`\nMessage ${messageCount}:`, {
              type: parsed.type,
              step: parsed.step,
              current: parsed.current,
              total: parsed.total,
              message: parsed.message?.substring(0, 100) + (parsed.message?.length > 100 ? '...' : ''),
              timestamp: parsed.timestamp
            });

            if (parsed.type === 'complete') {
              console.log('\n✅ COMPLETE! Result:', {
                hasGeneratedRows: !!parsed.result?.generatedRows,
                rowCount: parsed.result?.generatedRows?.length || 0,
                hasGeneratedCsv: !!parsed.result?.generatedCsv,
                csvLength: parsed.result?.generatedCsv?.length || 0,
                hasDetectedSchema: !!parsed.result?.detectedSchema,
                schemaLength: parsed.result?.detectedSchema?.length || 0,
                feedback: parsed.result?.feedback?.substring(0, 200) + '...'
              });
              return;
            }

            if (parsed.type === 'error') {
              console.log('\n❌ ERROR:', parsed.error);
              return;
            }

          } catch (parseError) {
            console.log(`Raw message ${messageCount}:`, data.substring(0, 200) + '...');
          }
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWebScraping();
