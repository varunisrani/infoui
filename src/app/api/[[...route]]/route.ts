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
        
        // Extract text content using a simpler approach compatible with Edge runtime
        const text = extractTextFromHtml(html);
        
        // Extract colors from HTML using a simple regex approach
        const colors = extractColorsFromHtml(html);

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
    // Remove HTML tags while preserving spacing
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove style tags
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')        // Remove SVG
      .replace(/<[^>]+>/g, ' ')                                         // Replace other tags with space
      .replace(/&nbsp;/g, ' ')                                          // Replace &nbsp; with space
      .replace(/\s+/g, ' ')                                             // Replace multiple spaces with one
      .trim();
      
    // Extract meaningful sections (approximate main content)
    const mainContentPattern = /<main\b[^>]*>([\s\S]*?)<\/main>/i;
    const articlePattern = /<article\b[^>]*>([\s\S]*?)<\/article>/i;
    const bodyPattern = /<body\b[^>]*>([\s\S]*?)<\/body>/i;
    
    let mainContent = '';
    
    // Try to find main content in <main> tags
    const mainMatch = html.match(mainContentPattern);
    if (mainMatch && mainMatch[1]) {
      mainContent = mainMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // If main content not found, try <article> tags
    if (!mainContent) {
      const articleMatch = html.match(articlePattern);
      if (articleMatch && articleMatch[1]) {
        mainContent = articleMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    // Use the extracted main content if available, otherwise use the whole text
    return mainContent || text;
  } catch (error) {
    console.error("Error extracting text:", error);
    return "Failed to extract text content from the website.";
  }
}

// Helper function to extract colors from HTML
function extractColorsFromHtml(html: string): { hex: string; name?: string }[] {
  try {
    // Store colors and their frequency
    const colorFrequency: Record<string, number> = {};
    
    // Regular expressions to find color values
    const hexColorRegex = /#([0-9a-f]{3,8})\b/gi;
    const rgbColorRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi;
    const rgbaColorRegex = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/gi;
    
    // Extract hex colors
    let match;
    while ((match = hexColorRegex.exec(html)) !== null) {
      let hex = match[0].toLowerCase();
      // Standardize to 6-digit hex
      if (hex.length === 4) { // #RGB format
        hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
      }
      colorFrequency[hex] = (colorFrequency[hex] || 0) + 1;
    }
    
    // Extract RGB colors
    while ((match = rgbColorRegex.exec(html)) !== null) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toLowerCase();
      colorFrequency[hex] = (colorFrequency[hex] || 0) + 1;
    }
    
    // Extract RGBA colors (ignore alpha channel)
    while ((match = rgbaColorRegex.exec(html)) !== null) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      // Skip colors with low opacity
      const alpha = parseFloat(match[4]);
      if (alpha >= 0.5) {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toLowerCase();
        colorFrequency[hex] = (colorFrequency[hex] || 0) + 1;
      }
    }
    
    // Filter out common non-brand colors
    const commonColors = new Set(['#ffffff', '#000000', '#f0f0f0', '#f8f8f8', '#e0e0e0', '#cccccc', '#333333', '#666666', '#999999']);
    const filteredColors = Object.entries(colorFrequency)
      .filter(([color]) => !commonColors.has(color.toLowerCase()))
      .sort((a, b) => b[1] - a[1]) // Sort by frequency, most frequent first
      .slice(0, 3) // Get top 3 colors (primary, secondary, tertiary)
      .map(([hex]) => ({ hex }));
    
    // If we have fewer than 3 colors, we can allow some common colors back
    if (filteredColors.length < 3) {
      const remainingColors = Object.entries(colorFrequency)
        .filter(([color]) => !filteredColors.some(item => item.hex === color))
        .sort((a, b) => b[1] - a[1]) // Sort by frequency
        .slice(0, 3 - filteredColors.length) // Get enough to have 3 total
        .map(([hex]) => ({ hex }));
      
      filteredColors.push(...remainingColors);
    }
    
    // Add labels to the colors
    const namedColors = filteredColors.map((color, index) => {
      if (index === 0) return { ...color, name: "Primary" };
      if (index === 1) return { ...color, name: "Secondary" };
      if (index === 2) return { ...color, name: "Tertiary" };
      return color;
    });
    
    return namedColors;
  } catch (error) {
    console.error("Error extracting colors:", error);
    return [];
  }
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