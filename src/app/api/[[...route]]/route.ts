import { Hono } from "hono";
import { handle } from "hono/vercel";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const generateImageSchema = z.object({
  prompt: z.string(),
});

const scrapeWebsiteSchema = z.object({
  url: z.string().url(),
});

const aiRoutes = new Hono()
  .post(
    "/generate-image",
    zValidator("json", generateImageSchema),
    async (c) => {
      const { prompt } = c.req.valid("json");
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-svg`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate image");
        }

        const data = await response.json();
        return c.json(data);
      } catch (error) {
        return c.json({ error: "Failed to generate image" }, 500);
      }
    }
  )
  .post(
    "/scrape-website",
    zValidator("json", scrapeWebsiteSchema),
    async (c) => {
      const { url } = c.req.valid("json");
      
      try {
        // Fetch the website content
        const response = await fetch(url, {
          headers: {
            // Set a user agent to avoid being blocked by some websites
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

        if (!response.ok) {
          return c.json({ error: `Failed to fetch website: ${response.statusText}` }, 500);
        }

        const html = await response.text();
        
        // Parse and extract text content
        const text = extractTextFromHtml(html);
        
        // Extract colors from HTML
        const colors = extractColorsFromHtml(html, url);

        return c.json({ 
          text, 
          colors 
        });
      } catch (error) {
        console.error("Error scraping website:", error);
        return c.json({ 
          error: error instanceof Error ? error.message : "Failed to scrape website" 
        }, 500);
      }
    }
  );

// Helper function to extract text content from HTML
function extractTextFromHtml(html: string): string {
  try {
    // Create a DOM parser
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Remove script, style, noscript, and other non-content elements
    const elementsToRemove = [
      'script', 'style', 'noscript', 'iframe', 'svg',
      'header', 'footer', 'nav', 'aside'
    ];
    
    elementsToRemove.forEach(tag => {
      const elements = document.querySelectorAll(tag);
      elements.forEach((el: Element) => el.parentNode?.removeChild(el));
    });

    // Extract text from main content areas
    const contentElements = document.querySelectorAll('main, article, section, .content, .main, #content, #main');
    
    let text = '';
    if (contentElements.length > 0) {
      // If we found specific content elements, use those
      contentElements.forEach((el: Element) => {
        text += el.textContent + '\n\n';
      });
    } else {
      // Otherwise fall back to body content
      text = document.body.textContent || '';
    }

    // Clean up the text
    return text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n')  // Replace multiple new lines with double new lines
      .trim();
  } catch (error) {
    console.error("Error extracting text:", error);
    return "Failed to extract text content from the website.";
  }
}

// Helper function to extract colors from HTML
function extractColorsFromHtml(html: string, url: string): { hex: string; name?: string }[] {
  try {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Initialize colors set to avoid duplicates
    const colorSet = new Set<string>();
    
    // Extract colors from CSS properties
    const elements = document.querySelectorAll('*');
    elements.forEach((el: Element) => {
      const computedStyle = dom.window.getComputedStyle(el);
      const backgroundColor = computedStyle.backgroundColor;
      const color = computedStyle.color;
      
      // Parse and add background color
      if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const hex = rgbToHex(backgroundColor);
        if (hex) colorSet.add(hex);
      }
      
      // Parse and add text color
      if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
        const hex = rgbToHex(color);
        if (hex) colorSet.add(hex);
      }
    });
    
    // Extract favicon for brand colors
    const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    let faviconUrl = favicon?.getAttribute('href') || '/favicon.ico';
    
    // Handle relative URLs
    if (faviconUrl && !faviconUrl.startsWith('http')) {
      const urlObj = new URL(url);
      faviconUrl = `${urlObj.origin}${faviconUrl.startsWith('/') ? '' : '/'}${faviconUrl}`;
      // We'd need image processing here to extract colors from favicon,
      // but for simplicity, we'll skip this part
    }
    
    // Convert Set to Array and format
    return Array.from(colorSet).map(hex => ({ hex })).slice(0, 10);
  } catch (error) {
    console.error("Error extracting colors:", error);
    return [];
  }
}

// Helper function to convert RGB(A) color to HEX
function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (!match) return null;
  
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const app = new Hono().basePath("/api");
app.route("/ai", aiRoutes);

export type AppType = typeof app;
export const runtime = "edge";

const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler; 