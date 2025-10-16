import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, options = {} } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    console.log(`[Crawl4AI API] Processing ${urls.length} URLs`);

    // Default options for content extraction
    const defaultOptions = {
      extract_media: false,
      extract_links: false,
      extract_images: false,
      extract_tables: true,
      extract_markdown: true,
      extract_clean_html: true,
      extract_text: true,
      wait_for: 3000,
      timeout: 30000,
      remove_forms: true,
      remove_scripts: true,
      remove_styles: true,
      remove_comments: true,
      ...options
    };

    const results = [];

    // Process each URL
    for (const url of urls) {
      try {
        console.log(`[Crawl4AI API] Scraping: ${url}`);
        
        // Simulate web scraping (replace with actual Crawl4AI service call)
        const mockContent = await simulateWebScraping(url, defaultOptions);
        
        results.push({
          url,
          title: mockContent.title,
          content: mockContent.content,
          markdown: mockContent.markdown,
          success: true,
          timestamp: new Date().toISOString()
        });

      } catch (error: any) {
        console.error(`[Crawl4AI API] Error scraping ${url}:`, error);
        results.push({
          url,
          title: '',
          content: '',
          markdown: '',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Crawl4AI API] Completed: ${successCount}/${urls.length} URLs scraped successfully`);

    return NextResponse.json({
      success: successCount > 0,
      results,
      summary: {
        total: urls.length,
        successful: successCount,
        failed: urls.length - successCount
      }
    });

  } catch (error: any) {
    console.error('[Crawl4AI API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Simulate web scraping for development/testing
async function simulateWebScraping(url: string, options: any) {
  // Add delay to simulate real scraping
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  const domain = new URL(url).hostname;
  
  // Generate mock content based on URL
  const mockContent = generateMockContent(url, domain);
  
  return {
    title: mockContent.title,
    content: mockContent.content,
    markdown: mockContent.markdown
  };
}

function generateMockContent(url: string, domain: string) {
  const contentTypes = {
    'restaurant': {
      title: 'Restaurant Reviews and Ratings',
      content: `Restaurant Name: The Golden Spoon
Location: 123 Main Street, Downtown
Rating: 4.5/5 stars
Cuisine: Italian
Price Range: $$$
Hours: Mon-Sun 11AM-10PM
Phone: (555) 123-4567

Customer Reviews:
- "Amazing pasta and great service!" - Sarah M.
- "Best Italian food in town" - John D.
- "Cozy atmosphere, perfect for dates" - Lisa K.

Menu Highlights:
- Spaghetti Carbonara - $18
- Margherita Pizza - $16
- Tiramisu - $8
- House Wine - $12/glass`,
      markdown: `# The Golden Spoon

**Location:** 123 Main Street, Downtown  
**Rating:** 4.5/5 stars  
**Cuisine:** Italian  
**Price Range:** $$$  

## Hours
Mon-Sun 11AM-10PM

## Contact
Phone: (555) 123-4567

## Customer Reviews
- "Amazing pasta and great service!" - Sarah M.
- "Best Italian food in town" - John D.
- "Cozy atmosphere, perfect for dates" - Lisa K.

## Menu Highlights
- Spaghetti Carbonara - $18
- Margherita Pizza - $16
- Tiramisu - $8
- House Wine - $12/glass`
    },
    'ev': {
      title: 'EV Charging Station Information',
      content: `EV Charging Station Network

Station Name: Downtown Charging Hub
Address: 456 Electric Avenue, City Center
Charging Types: Level 2, DC Fast Charging
Connectors: CCS, CHAdeMO, Type 2
Power Output: 50kW DC, 7.4kW AC
Availability: 24/7
Pricing: $0.25/kWh

Station Features:
- 8 charging bays
- Covered parking
- Restrooms available
- Coffee shop nearby
- WiFi access

Recent Reviews:
- "Fast charging, clean facility" - EV Driver 1
- "Convenient location downtown" - EV Driver 2
- "Good value for money" - EV Driver 3

Nearby Amenities:
- Shopping mall (0.2 miles)
- Restaurants (0.1 miles)
- Hotel (0.3 miles)`,
      markdown: `# Downtown Charging Hub

**Address:** 456 Electric Avenue, City Center  
**Charging Types:** Level 2, DC Fast Charging  
**Connectors:** CCS, CHAdeMO, Type 2  
**Power Output:** 50kW DC, 7.4kW AC  
**Availability:** 24/7  
**Pricing:** $0.25/kWh  

## Station Features
- 8 charging bays
- Covered parking
- Restrooms available
- Coffee shop nearby
- WiFi access

## Recent Reviews
- "Fast charging, clean facility" - EV Driver 1
- "Convenient location downtown" - EV Driver 2
- "Good value for money" - EV Driver 3

## Nearby Amenities
- Shopping mall (0.2 miles)
- Restaurants (0.1 miles)
- Hotel (0.3 miles)`
    },
    'default': {
      title: `Content from ${domain}`,
      content: `This is sample content scraped from ${url}.

Key Information:
- Source: ${domain}
- Scraped at: ${new Date().toISOString()}
- Content type: Web page
- Data points: Various

Sample Data:
- Item 1: Value A
- Item 2: Value B
- Item 3: Value C
- Item 4: Value D

Additional Information:
This content was generated for testing purposes. In a real implementation, this would be actual scraped content from the website.

Contact Information:
- Website: ${url}
- Domain: ${domain}
- Last updated: ${new Date().toLocaleDateString()}`,
      markdown: `# Content from ${domain}

**Source:** ${url}  
**Scraped at:** ${new Date().toISOString()}  
**Content type:** Web page  

## Sample Data
- Item 1: Value A
- Item 2: Value B
- Item 3: Value C
- Item 4: Value D

## Additional Information
This content was generated for testing purposes. In a real implementation, this would be actual scraped content from the website.

## Contact Information
- Website: ${url}
- Domain: ${domain}
- Last updated: ${new Date().toLocaleDateString()}`
    }
  };

  // Determine content type based on URL
  let contentType = 'default';
  if (url.toLowerCase().includes('restaurant') || url.toLowerCase().includes('food')) {
    contentType = 'restaurant';
  } else if (url.toLowerCase().includes('ev') || url.toLowerCase().includes('charging') || url.toLowerCase().includes('electric')) {
    contentType = 'ev';
  }

  return contentTypes[contentType as keyof typeof contentTypes] || contentTypes.default;
}
