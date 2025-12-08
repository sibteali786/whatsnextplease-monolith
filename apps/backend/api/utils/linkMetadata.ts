import axios from 'axios';
import { parse } from 'node-html-parser';
import dns from 'dns/promises';

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^localhost$/i,
];

const FETCH_TIMEOUT = 5000; // 5 seconds
const MAX_REDIRECTS = 5;

interface LinkMetadata {
  title: string | null;
  faviconUrl: string | null;
}

export class LinkMetadataService {
  /**
   * Extract URL from different formats
   */
  static extractUrls(text: string): string[] {
    const urlRegex =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
    const matches = text.match(urlRegex);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize title to prevent XSS attacks
   * - Strip HTML tags
   * - Decode HTML entities
   * - Remove null bytes and control characters
   * - Limit length
   */
  private static sanitizeTitle(title: string): string {
    if (!title) return '';

    // Strip HTML tags
    let sanitized = title.replace(/<[^>]*>/g, '');

    // Decode HTML entities (handles &lt;, &gt;, &amp;, &quot;, &#39;, etc.)
    sanitized = this.decodeHtmlEntities(sanitized);

    // Remove null bytes and control characters (except newlines and tabs)
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Replace newlines and tabs with spaces
    sanitized = sanitized.replace(/[\n\t\r]/g, ' ');

    // Collapse multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Limit length and trim
    return sanitized.substring(0, 200).trim();
  }

  /**
   * Decode HTML entities to prevent double-encoding issues
   */
  private static decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x27;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
    };

    let decoded = text;

    // Replace named entities
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }

    // Replace numeric entities (&#123; and &#xAB;)
    decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

    return decoded;
  }

  /**
   * Check if IP is private (SSRF protection)
   */
  private static async isPrivateIP(hostname: string): Promise<boolean> {
    try {
      const addresses = await dns.resolve4(hostname);
      return addresses.some(ip => PRIVATE_IP_RANGES.some(range => range.test(ip)));
    } catch {
      return true;
    }
  }
  /**
   * Fetch metadata with SSRF protection and timeout
   */
  static async fetchMetadata(url: string): Promise<LinkMetadata> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    const urlObject = new URL(url);

    // SSRF Protection: Check for private IPs
    if (await this.isPrivateIP(urlObject.hostname)) {
      throw new Error('Cannot fetch: URL resolves to a private IP address');
    }

    try {
      // fetch with timeout and redirect limit
      const response = await axios.get(url, {
        timeout: FETCH_TIMEOUT,
        maxRedirects: MAX_REDIRECTS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TaskLinkBot/1.0)',
        },
        validateStatus: (status: number) => status < 400, // Only accept 2xx and 3xx
      });

      const html = parse(response.data);

      // Extract title (mutliple fallbacks)
      let title =
        html.querySelector('title')?.text?.trim() ||
        html.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
        html.querySelector('meta[name="twitter:title"]')?.getAttribute('content')?.trim() ||
        urlObject.hostname;

      // Sanitize title: strip HTML tags, decode HTML entities, and remove potentially dangerous characters
      title = this.sanitizeTitle(title);

      // Extract favicon (multiple fallbacks)
      const favicon =
        html.querySelector('link[rel="icon"]')?.getAttribute('href') ||
        html.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
        html.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ||
        '/favicon.ico';

      // Make favicon URL absolute
      const faviconUrl = favicon.startsWith('http')
        ? favicon
        : new URL(favicon, `${urlObject.protocol}//${urlObject.hostname}`).href;

      return {
        title: title || urlObject.hostname,
        faviconUrl,
      };
    } catch (error) {
      console.warn(`Failed to fetch metadata for ${url}:`, error);
      return {
        title: urlObject.hostname,
        faviconUrl: `${urlObject.protocol}//${urlObject.hostname}/favicon.ico`,
      };
    }
  }

  /**
   * Extract URLs from HTML content (for comments)
   */
  static extractUrlsFromHtml(html: string): string[] {
    // Parse HTML and extract from text content and href attributes
    const root = parse(html);

    // Get text content URLs
    const textUrls = this.extractUrls(root.textContent || '');

    // Get URLs from link tags
    const linkUrls = root
      .querySelectorAll('a[href]')
      .map(el => el.getAttribute('href'))
      .filter((href): href is string => !!href && this.isValidUrl(href));

    return [...new Set([...textUrls, ...linkUrls])];
  }
}
