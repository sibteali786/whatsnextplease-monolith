import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { parse } from 'node-html-parser';
import dns from 'dns/promises';

// Private IPv4 ranges
const PRIVATE_IPV4_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^localhost$/i,
];

// Private IPv6 ranges
const PRIVATE_IPV6_RANGES = [
  /^::1$/i, // Loopback
  /^fe80:/i, // Link-local
  /^fc00:/i, // Unique local addresses (ULA)
  /^fd[0-9a-f]{2}:/i, // Unique local addresses (ULA) fd00::/8
  /^::ffff:127\./i, // IPv4-mapped loopback
  /^::ffff:10\./i, // IPv4-mapped private
  /^::ffff:192\.168\./i, // IPv4-mapped private
  /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./i, // IPv4-mapped private
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
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
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
   * Check if a hostname resolves to a private IP address (SSRF protection)
   *
   * This method prevents Server-Side Request Forgery (SSRF) attacks by blocking requests
   * to internal/private network resources. It checks if the hostname resolves to:
   *
   * IPv4:
   * - Localhost (127.x.x.x)
   * - Private networks (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
   * - Link-local addresses (169.254.x.x)
   *
   * IPv6:
   * - Loopback (::1)
   * - Link-local (fe80::/10)
   * - Unique local addresses (fc00::/7, fd00::/8)
   * - IPv4-mapped private addresses
   *
   * @param hostname - The hostname to check (e.g., "example.com" or "localhost")
   * @returns true if the hostname resolves to a private IP or if DNS resolution fails
   *
   * Security Note: Returns true (blocks the request) on DNS resolution failure as a
   * fail-safe mechanism. This prevents potential attacks using DNS timeouts or errors
   * to bypass security checks. Checks both IPv4 and IPv6 to prevent bypass via IPv6.
   */
  private static async isPrivateIP(hostname: string): Promise<boolean> {
    try {
      // Check both IPv4 and IPv6 addresses
      const [ipv4Addresses, ipv6Addresses] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname),
      ]);

      // Check IPv4 addresses
      if (ipv4Addresses.status === 'fulfilled') {
        const hasPrivateIPv4 = ipv4Addresses.value.some(ip =>
          PRIVATE_IPV4_RANGES.some(range => range.test(ip))
        );
        if (hasPrivateIPv4) return true;
      }

      // Check IPv6 addresses
      if (ipv6Addresses.status === 'fulfilled') {
        const hasPrivateIPv6 = ipv6Addresses.value.some(ip =>
          PRIVATE_IPV6_RANGES.some(range => range.test(ip))
        );
        if (hasPrivateIPv6) return true;
      }

      // If both resolutions failed, block as fail-safe
      if (ipv4Addresses.status === 'rejected' && ipv6Addresses.status === 'rejected') {
        return true;
      }

      // No private IPs found
      return false;
    } catch {
      // Fail-safe: Block the request if we can't resolve the hostname
      // This prevents attackers from exploiting DNS errors to bypass SSRF protection
      return true;
    }
  }
  /**
   * Fetch metadata with SSRF protection and timeout
   *
   * Security: Validates both the initial URL and all redirect destinations to prevent
   * SSRF attacks via redirect chains. Each redirect target is checked against private
   * IP ranges before following the redirect.
   */
  static async fetchMetadata(url: string): Promise<LinkMetadata> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    const urlObject = new URL(url);

    // SSRF Protection: Check initial hostname for private IPs
    if (await this.isPrivateIP(urlObject.hostname)) {
      throw new Error('Cannot fetch: URL resolves to a private IP address');
    }

    // Create axios instance with SSRF protection on redirects
    const axiosInstance = axios.create({
      timeout: FETCH_TIMEOUT,
      maxRedirects: MAX_REDIRECTS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TaskLinkBot/1.0)',
      },
      validateStatus: (status: number) => status < 400, // Only accept 2xx and 3xx
    });

    // Add interceptor to validate redirect targets before following them
    axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: { config: InternalAxiosRequestConfig; response?: AxiosResponse }) => {
        // Check if this is a redirect response (3xx status codes)
        if (
          error.response &&
          error.response.status >= 300 &&
          error.response.status < 400 &&
          error.response.headers.location
        ) {
          const redirectUrl = error.response.headers.location;

          try {
            // Parse the redirect URL (handle relative URLs)
            const redirectUrlObj = new URL(redirectUrl, `${error.config.url}`);

            // SSRF Protection: Validate redirect target
            if (await this.isPrivateIP(redirectUrlObj.hostname)) {
              throw new Error(
                `Redirect blocked: Target URL resolves to a private IP address (${redirectUrlObj.hostname})`
              );
            }
          } catch (urlError) {
            // If we can't parse the redirect URL or it's private, block it
            throw new Error(
              `Redirect validation failed: ${urlError instanceof Error ? urlError.message : 'Invalid redirect URL'}`
            );
          }
        }

        // Re-throw the error if it's not a redirect or validation passed
        return Promise.reject(error);
      }
    );

    try {
      // fetch with timeout, redirect limit, and SSRF protection on redirects
      const response = await axiosInstance.get(url);

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
