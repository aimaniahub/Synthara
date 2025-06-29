/**
 * Dynamic Content Service
 * Provides context-aware, intelligent content generation for UI elements
 */

export interface ContentContext {
  userPrompt?: string;
  domain?: string;
  dataType?: string;
  previousGenerations?: string[];
  userPreferences?: Record<string, any>;
}

export interface DynamicPlaceholder {
  text: string;
  examples?: string[];
  suggestions?: string[];
}

export interface DynamicExample {
  title: string;
  description: string;
  prompt: string;
  expectedColumns?: string[];
}

export class DynamicContentService {
  private static instance: DynamicContentService;
  
  public static getInstance(): DynamicContentService {
    if (!DynamicContentService.instance) {
      DynamicContentService.instance = new DynamicContentService();
    }
    return DynamicContentService.instance;
  }

  /**
   * Generate dynamic placeholder text based on context
   */
  generatePlaceholder(context: ContentContext): DynamicPlaceholder {
    const domain = this.detectDomain(context.userPrompt || '');
    
    switch (domain) {
      case 'medical':
        return {
          text: "e.g., Generate medical data for patient analysis with vital signs, lab results, and diagnostic information...",
          examples: [
            "Create a dataset of patient vital signs including heart rate, blood pressure, temperature, and oxygen saturation",
            "Generate medical lab results with blood count, glucose levels, and biomarkers for disease prediction",
            "Create patient demographic data with age, gender, medical history, and treatment outcomes"
          ]
        };
      
      case 'financial':
        return {
          text: "e.g., Generate financial data for market analysis with stock prices, trading volumes, and economic indicators...",
          examples: [
            "Create stock market data with prices, volumes, and technical indicators for algorithmic trading",
            "Generate customer transaction data with amounts, categories, and fraud detection features",
            "Create financial portfolio data with asset allocations, returns, and risk metrics"
          ]
        };
      
      case 'ecommerce':
        return {
          text: "e.g., Generate e-commerce data with customer profiles, product catalogs, and sales transactions...",
          examples: [
            "Create customer purchase history with products, quantities, prices, and seasonal patterns",
            "Generate product catalog data with descriptions, categories, ratings, and inventory levels",
            "Create user behavior data with page views, clicks, cart additions, and conversion metrics"
          ]
        };
      
      case 'iot':
        return {
          text: "e.g., Generate IoT sensor data with timestamps, device readings, and environmental measurements...",
          examples: [
            "Create sensor data for smart home devices with temperature, humidity, and energy consumption",
            "Generate industrial IoT data with machine performance, maintenance schedules, and fault detection",
            "Create environmental monitoring data with air quality, noise levels, and weather conditions"
          ]
        };
      
      case 'social':
        return {
          text: "e.g., Generate social media data with user interactions, content engagement, and network analysis...",
          examples: [
            "Create social media posts with engagement metrics, sentiment scores, and viral potential",
            "Generate user interaction data with likes, shares, comments, and network connections",
            "Create content performance data with reach, impressions, and audience demographics"
          ]
        };
      
      default:
        return {
          text: "Describe the type of data you want to generate. Be specific about columns, data types, and relationships...",
          examples: [
            "Create a customer database with names, emails, purchase history, and demographic information",
            "Generate time-series data for forecasting with dates, values, and seasonal patterns",
            "Create survey response data with questions, answers, and participant demographics"
          ]
        };
    }
  }

  /**
   * Generate dynamic examples based on user's current input
   */
  generateExamples(context: ContentContext): DynamicExample[] {
    const domain = this.detectDomain(context.userPrompt || '');
    const baseExamples = this.getBaseExamples(domain);
    
    // If user has started typing, generate more specific examples
    if (context.userPrompt && context.userPrompt.length > 20) {
      return this.generateContextualExamples(context.userPrompt, domain);
    }
    
    return baseExamples;
  }

  /**
   * Generate smart form defaults based on context
   */
  generateSmartDefaults(context: ContentContext): Record<string, any> {
    const domain = this.detectDomain(context.userPrompt || '');
    
    const defaults: Record<string, any> = {
      numRows: 10,
      useWebData: false,
      datasetName: ''
    };

    // Adjust defaults based on domain
    switch (domain) {
      case 'medical':
        defaults.numRows = 50; // Medical data often needs more samples
        defaults.useWebData = true; // Medical data benefits from real research
        break;
      case 'financial':
        defaults.numRows = 100; // Financial analysis needs larger datasets
        defaults.useWebData = true; // Real market data is valuable
        break;
      case 'iot':
        defaults.numRows = 200; // IoT generates lots of data points
        defaults.useWebData = false; // IoT data is often synthetic
        break;
      default:
        defaults.numRows = 25; // Reasonable default for general use
        defaults.useWebData = false;
    }

    // Generate smart dataset name
    if (context.userPrompt) {
      defaults.datasetName = this.generateDatasetName(context.userPrompt);
    }

    return defaults;
  }

  /**
   * Generate context-aware UI messages
   */
  generateUIMessage(messageType: string, context: ContentContext): string {
    const domain = this.detectDomain(context.userPrompt || '');
    
    switch (messageType) {
      case 'generating':
        return domain === 'medical' 
          ? 'Analyzing medical research and generating clinical data...'
          : domain === 'financial'
          ? 'Processing market data and generating financial metrics...'
          : 'Analyzing content and generating your custom dataset...';
      
      case 'webScraping':
        return domain === 'medical'
          ? 'Searching medical databases and research papers...'
          : domain === 'financial'
          ? 'Gathering financial data from market sources...'
          : 'Collecting relevant data from web sources...';
      
      case 'aiProcessing':
        return domain === 'medical'
          ? 'Applying medical knowledge to extract clinical insights...'
          : domain === 'financial'
          ? 'Analyzing financial patterns and market trends...'
          : 'Processing content with AI to extract meaningful data...';
      
      default:
        return 'Processing your request...';
    }
  }

  /**
   * Detect domain from user prompt
   */
  private detectDomain(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (this.containsKeywords(lowerPrompt, ['medical', 'patient', 'clinical', 'health', 'diagnosis', 'treatment', 'hospital', 'doctor', 'afi', 'fetal', 'blood', 'heart rate'])) {
      return 'medical';
    }
    if (this.containsKeywords(lowerPrompt, ['financial', 'stock', 'market', 'trading', 'investment', 'portfolio', 'price', 'revenue', 'profit', 'banking'])) {
      return 'financial';
    }
    if (this.containsKeywords(lowerPrompt, ['ecommerce', 'customer', 'purchase', 'product', 'sales', 'order', 'shopping', 'retail', 'cart'])) {
      return 'ecommerce';
    }
    if (this.containsKeywords(lowerPrompt, ['sensor', 'iot', 'device', 'temperature', 'humidity', 'monitoring', 'smart', 'automation'])) {
      return 'iot';
    }
    if (this.containsKeywords(lowerPrompt, ['social', 'media', 'post', 'like', 'share', 'comment', 'user', 'engagement', 'network'])) {
      return 'social';
    }
    
    return 'general';
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private getBaseExamples(domain: string): DynamicExample[] {
    switch (domain) {
      case 'medical':
        return [
          {
            title: "Patient Vital Signs",
            description: "Generate comprehensive patient monitoring data",
            prompt: "Create patient vital signs data with heart rate, blood pressure, temperature, oxygen saturation, and respiratory rate for ICU monitoring",
            expectedColumns: ["patient_id", "heart_rate_bpm", "systolic_bp", "diastolic_bp", "temperature_c", "oxygen_saturation", "respiratory_rate"]
          },
          {
            title: "Clinical Lab Results",
            description: "Generate laboratory test results for medical analysis",
            prompt: "Generate clinical lab results including complete blood count, glucose levels, cholesterol, and liver function tests",
            expectedColumns: ["patient_id", "hemoglobin", "white_blood_cells", "glucose_mg_dl", "cholesterol_total", "alt_levels"]
          }
        ];
      
      case 'financial':
        return [
          {
            title: "Stock Market Data",
            description: "Generate stock trading and market analysis data",
            prompt: "Create stock market data with daily prices, trading volumes, technical indicators, and market sentiment",
            expectedColumns: ["symbol", "date", "open_price", "close_price", "volume", "rsi", "moving_average", "sentiment_score"]
          },
          {
            title: "Customer Transactions",
            description: "Generate banking and transaction data",
            prompt: "Generate customer transaction data with amounts, categories, merchant information, and fraud indicators",
            expectedColumns: ["transaction_id", "customer_id", "amount", "category", "merchant", "is_fraud", "timestamp"]
          }
        ];
      
      default:
        return [
          {
            title: "Customer Database",
            description: "Generate comprehensive customer information",
            prompt: "Create customer data with demographics, contact information, purchase history, and preferences",
            expectedColumns: ["customer_id", "name", "email", "age", "location", "total_purchases", "preferred_category"]
          },
          {
            title: "Time Series Data",
            description: "Generate temporal data for forecasting",
            prompt: "Create time series data with timestamps, values, seasonal patterns, and trend indicators",
            expectedColumns: ["timestamp", "value", "trend", "seasonal_component", "anomaly_score"]
          }
        ];
    }
  }

  private generateContextualExamples(prompt: string, domain: string): DynamicExample[] {
    // This would ideally use AI to generate contextual examples
    // For now, return domain-specific examples
    return this.getBaseExamples(domain);
  }

  private generateDatasetName(prompt: string): string {
    const words = prompt.toLowerCase().split(' ').filter(word => 
      word.length > 3 && 
      !['data', 'dataset', 'generate', 'create', 'with', 'for', 'the', 'and', 'that', 'this'].includes(word)
    );
    
    const relevantWords = words.slice(0, 3);
    const name = relevantWords.join('_');
    const timestamp = new Date().toISOString().slice(0, 10);
    
    return `${name}_${timestamp}`.replace(/[^a-zA-Z0-9_]/g, '');
  }
}

// Export singleton instance
export const dynamicContent = DynamicContentService.getInstance();
