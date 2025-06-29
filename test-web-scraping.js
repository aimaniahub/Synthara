// Simple test to check if web scraping is working
console.log('Testing web scraping configuration...');

// Check environment variables
console.log('SERPAPI_API_KEY:', process.env.SERPAPI_API_KEY ? 'SET' : 'NOT SET');
console.log('FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? 'SET' : 'NOT SET');

// Test the API endpoint
fetch('http://localhost:3001/api/generate-stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Generate sample customer data with names and emails',
    numRows: 5,
    useWebData: true
  })
})
.then(response => {
  console.log('API Response Status:', response.status);
  console.log('API Response Headers:', response.headers);
  return response.text();
})
.then(data => {
  console.log('API Response Data:', data.substring(0, 500) + '...');
})
.catch(error => {
  console.error('API Error:', error);
});
