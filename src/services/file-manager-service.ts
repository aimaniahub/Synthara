import fs from 'fs/promises';
import path from 'path';

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
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private static readonly SCRAPED_DATA_DIR = path.join(this.TEMP_DIR, 'scraped-data');

  /**
   * Ensure temp directories exist
   */
  private static async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
      await fs.mkdir(this.SCRAPED_DATA_DIR, { recursive: true });
    } catch (error) {
      console.error('[FileManager] Error creating directories:', error);
    }
  }

  /**
   * Create structured markdown file from scraped sources
   */
  static async createStructuredMarkdownFile(
    userQuery: string,
    sources: ScrapedSource[]
  ): Promise<string> {
    await this.ensureDirectories();

    const timestamp = new Date();
    const filename = `scraped-${timestamp.getTime()}.md`;
    const filepath = path.join(this.SCRAPED_DATA_DIR, filename);

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

    // Write to file
    await fs.writeFile(filepath, markdownContent, 'utf-8');

    console.log(`[FileManager] Created structured file: ${filepath}`);
    console.log(`[FileManager] File size: ${markdownContent.length} characters`);

    return filepath;
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
   * Read structured markdown file
   */
  static async readStructuredFile(filepath: string): Promise<string> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      console.log(`[FileManager] Read file: ${filepath} (${content.length} characters)`);
      return content;
    } catch (error) {
      console.error(`[FileManager] Error reading file ${filepath}:`, error);
      throw new Error(`Failed to read file: ${filepath}`);
    }
  }

  /**
   * Clean up old files (optional)
   */
  static async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      await this.ensureDirectories();
      const files = await fs.readdir(this.SCRAPED_DATA_DIR);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

      for (const file of files) {
        const filepath = path.join(this.SCRAPED_DATA_DIR, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filepath);
          console.log(`[FileManager] Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      console.error('[FileManager] Error during cleanup:', error);
    }
  }
}
