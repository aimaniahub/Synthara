export interface ScrapedSource {
  url: string;
  markdown: string;
  contentType?: string;
  timestamp: Date;
}

export interface StructuredScrapingResult {
  userQuery: string;
  sources: ScrapedSource[];
  totalSources: number;
  totalContentLength: number;
  generatedAt: Date;
}

export class FileManagerService {
  // In-memory storage for serverless environments
  private static readonly contentCache = new Map<string, string>();

  /**
   * Serverless-compatible: No file system operations
   */
  private static async ensureDirectories(): Promise<void> {
    // No-op for serverless environments
    console.log('[FileManager] Running in serverless mode - using in-memory storage');
  }

  /**
   * Create structured markdown content from scraped sources (serverless-compatible)
   */
  static async createStructuredMarkdownFile(
    userQuery: string,
    sources: ScrapedSource[]
  ): Promise<string> {
    await this.ensureDirectories();

    const timestamp = new Date();
    const contentId = `scraped-${timestamp.getTime()}`;

    // Calculate total content length
    const totalContentLength = sources.reduce((total, source) => total + source.markdown.length, 0);

    // Use all sources with full content - no size limits
    let optimizedSources = sources;
    console.log(`[FileManager] Processing full content: ${totalContentLength.toLocaleString()} characters from ${sources.length} sources`);

    // Create structured markdown content
    const markdownContent = this.generateStructuredMarkdown({
      userQuery,
      sources: optimizedSources,
      totalSources: optimizedSources.length,
      totalContentLength: optimizedSources.reduce((total, source) => total + source.markdown.length, 0),
      generatedAt: timestamp
    });

    // Store in memory cache instead of file system
    this.contentCache.set(contentId, markdownContent);

    console.log(`[FileManager] Created structured content in memory: ${contentId}`);
    console.log(`[FileManager] Content size: ${markdownContent.length} characters`);

    return contentId; // Return content ID instead of file path
  }

  /**
   * Generate structured markdown content
   */
  private static generateStructuredMarkdown(data: StructuredScrapingResult): string {
    const { userQuery, sources, totalSources, totalContentLength, generatedAt } = data;

    let markdown = `# Web Scraping Results for: "${userQuery}"\n\n`;
    markdown += `**Generated on:** ${generatedAt.toISOString()}\n`;
    markdown += `**Total Sources:** ${totalSources}\n`;
    markdown += `**Total Content Length:** ${totalContentLength.toLocaleString()} characters\n\n`;

    // Add table of contents
    markdown += `## Table of Contents\n\n`;
    sources.forEach((source, index) => {
      const domain = new URL(source.url).hostname;
      markdown += `${index + 1}. [${domain}](#source-${index + 1})\n`;
    });
    markdown += `\n---\n\n`;

    // Add each source
    sources.forEach((source, index) => {
      const domain = new URL(source.url).hostname;
      
      markdown += `## Source ${index + 1}: ${domain} {#source-${index + 1}}\n\n`;
      markdown += `**URL:** ${source.url}\n`;
      markdown += `**Content Type:** ${source.contentType || 'Mixed Content'}\n`;
      markdown += `**Content Length:** ${source.markdown.length.toLocaleString()} characters\n`;
      markdown += `**Scraped At:** ${source.timestamp.toISOString()}\n\n`;

      // Detect content type and add appropriate structure
      const contentType = this.detectContentType(source.markdown);
      markdown += `**Detected Structure:** ${contentType}\n\n`;

      // Add the actual content
      markdown += `### Content:\n\n`;
      markdown += source.markdown;
      markdown += `\n\n---\n\n`;
    });

    // Add summary section
    markdown += `## Content Analysis Summary\n\n`;
    markdown += `- **Total Sources Processed:** ${totalSources}\n`;
    markdown += `- **Average Content Length:** ${Math.round(totalContentLength / totalSources).toLocaleString()} characters\n`;
    
    const contentTypes = sources.map(s => this.detectContentType(s.markdown));
    const uniqueTypes = [...new Set(contentTypes)];
    markdown += `- **Content Types Found:** ${uniqueTypes.join(', ')}\n`;
    
    return markdown;
  }

  /**
   * Detect content type from markdown
   */
  private static detectContentType(markdown: string): string {
    const hasTable = markdown.includes('|') && markdown.includes('---');
    const hasList = /^[\s]*[-*+]\s/.test(markdown) || /^[\s]*\d+\.\s/.test(markdown);
    const hasHeaders = /^#+\s/.test(markdown);
    
    const types = [];
    if (hasTable) types.push('Tables');
    if (hasList) types.push('Lists');
    if (hasHeaders) types.push('Structured Text');
    
    return types.length > 0 ? types.join(', ') : 'Plain Text';
  }

  /**
   * Read structured content from memory cache (serverless-compatible)
   */
  static async readStructuredFile(contentId: string): Promise<string> {
    try {
      const content = this.contentCache.get(contentId);
      if (!content) {
        throw new Error(`Content not found in cache: ${contentId}`);
      }
      console.log(`[FileManager] Read content from cache: ${contentId} (${content.length} characters)`);
      return content;
    } catch (error) {
      console.error(`[FileManager] Error reading content ${contentId}:`, error);
      throw new Error(`Failed to read content: ${contentId}`);
    }
  }

  /**
   * Clean up old content from memory cache (serverless-compatible)
   */
  static async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
      let cleanedCount = 0;

      // Clean up old entries from memory cache
      for (const [contentId, content] of this.contentCache.entries()) {
        // Extract timestamp from content ID (format: scraped-{timestamp})
        const timestampMatch = contentId.match(/scraped-(\d+)/);
        if (timestampMatch) {
          const timestamp = parseInt(timestampMatch[1]);
          if (now - timestamp > maxAge) {
            this.contentCache.delete(contentId);
            cleanedCount++;
            console.log(`[FileManager] Cleaned up old content: ${contentId}`);
          }
        }
      }

      console.log(`[FileManager] Cleanup completed: removed ${cleanedCount} old entries from cache`);
    } catch (error) {
      console.error('[FileManager] Error during cleanup:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): { totalEntries: number; totalSize: number } {
    let totalSize = 0;
    for (const content of this.contentCache.values()) {
      totalSize += content.length;
    }
    return {
      totalEntries: this.contentCache.size,
      totalSize
    };
  }
}
