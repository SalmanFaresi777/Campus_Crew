/**
 * Web Scraper Utility
 * Extracts text content from web pages for RAG pipeline
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const fs = require('fs').promises;
const path = require('path');

/**
 * Scraper class for extracting content from web pages
 */
class WebScraper {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000;
    this.retries = options.retries || 3;
    this.delay = options.delay || 1000;
    this.userAgent = options.userAgent || 'CampusCrew-RAG-Bot/1.0';
    this.outputDir = options.outputDir || './data/scraped_content';
  }

  /**
   * Scrapes content from a single URL with retry logic
   * @param {string} url - URL to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>} Scraped content object
   */
  async scrapeUrl(url, options = {}) {
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        console.log(`🔍 Scraping ${url} (attempt ${attempt}/${this.retries})`);
        
        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        });

        const content = this.extractContent(response.data, url, options);
        
        console.log(`✅ Successfully scraped ${url} - ${content.wordCount} words`);
        return content;
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed for ${url}:`, error.message);
        
        if (attempt === this.retries) {
          throw new Error(`Failed to scrape ${url} after ${this.retries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        const waitTime = this.delay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Extracts meaningful content from HTML
   * @param {string} html - Raw HTML content
   * @param {string} url - Source URL
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted content
   */
  extractContent(html, url, options = {}) {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, footer, header, .advertisement, .sidebar, .popup').remove();
    
    // Extract metadata
    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() || 
                  'Untitled';
    
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';
    
    const keywords = $('meta[name="keywords"]').attr('content') || '';
    
    // Extract main content
    let content = '';
    
    // Try to find main content area
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '#main',
      '.post-content',
      '.entry-content'
    ];
    
    let mainContent = null;
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 100) {
        mainContent = element;
        break;
      }
    }
    
    if (mainContent) {
      content = this.extractTextFromElement(mainContent, $);
    } else {
      // Fallback: extract from body, filtering out noise
      $('body').find('*').each((_, element) => {
        const $el = $(element);
        if ($el.children().length === 0) { // Leaf nodes
          const text = $el.text().trim();
          if (text.length > 10 && !this.isNoiseText(text)) {
            content += text + ' ';
          }
        }
      });
    }
    
    // Clean up content
    content = this.cleanText(content);
    
    // Extract headings for structure
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $el = $(element);
      const level = parseInt(element.tagName.charAt(1));
      const text = $el.text().trim();
      if (text) {
        headings.push({ level, text });
      }
    });
    
    // Calculate metrics
    const wordCount = content.split(/\\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Assume 200 WPM
    
    return {
      url,
      title,
      description,
      keywords,
      content,
      headings,
      wordCount,
      readingTime,
      scrapedAt: new Date().toISOString(),
      domain: new URL(url).hostname
    };
  }

  /**
   * Extracts clean text from a Cheerio element
   * @param {Object} element - Cheerio element
   * @param {Object} $ - Cheerio instance
   * @returns {string} Extracted text
   */
  extractTextFromElement(element, $) {
    let text = '';
    
    element.contents().each((_, node) => {
      if (node.type === 'text') {
        text += $(node).text() + ' ';
      } else if (node.type === 'tag') {
        const tagName = node.tagName.toLowerCase();
        
        // Add line breaks for block elements
        if (['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          text += '\\n';
        }
        
        text += this.extractTextFromElement($(node), $);
        
        if (['p', 'div'].includes(tagName)) {
          text += '\\n';
        }
      }
    });
    
    return text;
  }

  /**
   * Cleans extracted text
   * @param {string} text - Raw text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\\s+/g, ' ') // Normalize whitespace
      .replace(/\\n\\s*\\n/g, '\\n') // Remove extra line breaks
      .replace(/[^\\w\\s\\.,!?;:'"()-]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Determines if text is likely noise/navigation
   * @param {string} text - Text to check
   * @returns {boolean} True if text is noise
   */
  isNoiseText(text) {
    const noisePatterns = [
      /^(menu|navigation|nav|sidebar|footer|header)$/i,
      /^(home|about|contact|login|register|sign up)$/i,
      /^(click here|read more|learn more)$/i,
      /^\\d+$/,
      /^[^a-zA-Z]*$/
    ];
    
    return noisePatterns.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Scrapes multiple URLs and saves to files
   * @param {Array<string>} urls - URLs to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} Results array
   */
  async scrapeUrls(urls, options = {}) {
    const results = [];
    
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    
    for (const url of urls) {
      try {
        const content = await this.scrapeUrl(url, options);
        results.push({ url, success: true, content });
        
        // Save to file if requested
        if (options.saveToFile) {
          const filename = this.generateFilename(url);
          const filepath = path.join(this.outputDir, filename);
          await fs.writeFile(filepath, JSON.stringify(content, null, 2));
          console.log(`💾 Saved content to ${filepath}`);
        }
        
        // Delay between requests to be respectful
        if (urls.indexOf(url) < urls.length - 1) {
          await this.sleep(this.delay);
        }
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${url}:`, error.message);
        results.push({ url, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Generates a safe filename from URL
   * @param {string} url - Source URL
   * @returns {string} Safe filename
   */
  generateFilename(url) {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const path = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substr(0, 14);
    return `${domain}${path}_${timestamp}.json`;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WebScraper;