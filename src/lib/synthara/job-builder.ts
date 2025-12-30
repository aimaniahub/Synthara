import { generateSearchUrls } from '@/ai/flows/generate-search-urls-flow';
import { SyntharaJobInputSource } from './job-store';

function isScrapableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '').toLowerCase();
    const path = u.pathname.toLowerCase();

    if (host.includes('google.') && path.startsWith('/search')) return false;

    const socialHosts = ['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'linkedin.com'];
    if (socialHosts.some((h) => host.endsWith(h))) return false;

    if (host.endsWith('wikipedia.org') && path === '/wiki/main_page') return false;

    return true;
  } catch {
    return false;
  }
}

async function scrapeUrlsForJob(urls: string[]): Promise<
  Array<{
    url: string;
    title: string;
    content: string;
  }>
> {
  const crawl4aiServiceUrl = process.env.CRAWL4AI_SERVICE_URL || process.env.CRAWL4AI_EXTRACT_URL || 'http://localhost:11235';

  const healthOk = await fetch(`${crawl4aiServiceUrl}/health`, {
    method: 'GET',
    signal: AbortSignal.timeout(30000),
  }).catch(() => undefined);

  if (!healthOk || !healthOk.ok) {
    throw new Error('Crawl4AI service unavailable for Synthara job input');
  }

  const results: Array<{ url: string; title: string; content: string }> = [];
  const batchSize = 5;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);

    const batchPromises = batch.map(async (url) => {
      const response = await fetch(`${crawl4aiServiceUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: [url],
          browser_config: {},
          crawler_config: {
            extract_media: false,
            extract_links: false,
            extract_images: false,
            extract_tables: true,
            extract_markdown: true,
            extract_clean_html: true,
            extract_text: true,
            wait_for: null,
            timeout: 180000,
            remove_forms: true,
            remove_scripts: true,
            remove_styles: true,
            remove_comments: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Crawl4AI error: ${response.status}`);
      }

      const json = await response.json();
      if (!json?.success || !Array.isArray(json.results) || json.results.length === 0) {
        return null;
      }

      const first = json.results[0];
      let content = '';

      if (first.markdown) {
        if (typeof first.markdown === 'string') content = first.markdown;
        else if (typeof first.markdown === 'object' && first.markdown.text) content = first.markdown.text;
      }

      if (!content && first.extracted_content) {
        if (typeof first.extracted_content === 'string') content = first.extracted_content;
        else if (typeof first.extracted_content === 'object' && first.extracted_content.text)
          content = first.extracted_content.text;
      }

      if (!content && first.cleaned_html && typeof first.cleaned_html === 'string') {
        content = first.cleaned_html;
      }

      if (!content && first.html && typeof first.html === 'string') {
        content = first.html;
      }

      return {
        url,
        title: first.title || url,
        content: content || '',
      };
    });

    const batchResults = await Promise.allSettled(batchPromises);
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }
  }

  return results;
}

export async function buildSyntharaJobInput(params: {
  userQuery: string;
  numRows: number;
  maxUrls: number;
}): Promise<SyntharaJobInputSource> {
  const searchResult = await generateSearchUrls({
    userQuery: params.userQuery,
    maxUrls: params.maxUrls,
  });

  if (!searchResult.success || !Array.isArray(searchResult.urls) || searchResult.urls.length === 0) {
    throw new Error(searchResult.error || 'No URLs found for Synthara job');
  }

  const candidateUrls = searchResult.urls.map((u) => u.url);
  const filtered = candidateUrls.filter(isScrapableUrl);

  if (!filtered.length) {
    throw new Error('No scrapable URLs available for Synthara job input');
  }

  const initialUrls = filtered.slice(0, params.maxUrls);
  const scraped = await scrapeUrlsForJob(initialUrls);

  if (!scraped.length) {
    throw new Error('Crawl4AI returned no content for Synthara job input');
  }

  const metadata = {
    userQuery: params.userQuery,
    scrapedAt: new Date().toISOString(),
    totalSources: scraped.length,
  };

  const sources = scraped.map((item, index) => ({
    id: index + 1,
    url: item.url,
    title: item.title,
    content: item.content,
  }));

  const rawInput = sources
    .map((s) => `URL: ${s.url}\nTITLE: ${s.title}\n\n${s.content}`)
    .join('\n\n---\n\n');

  return {
    metadata,
    sources,
    rawInput,
  };
}
