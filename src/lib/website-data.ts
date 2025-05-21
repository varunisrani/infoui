// Storage key for website scraped data
export const WEBSITE_DATA_STORAGE_KEY = 'website_data';

/**
 * Interface for storing website scraped data
 * This data is used to personalize AI SVG generation based on website content
 */
export interface WebsiteScrapedData {
  // The extracted text content from the website
  text: string;
  // The color palette extracted from the website
  colors: {
    hex: string;
    name?: string;
  }[];
  // The original URL that was scraped
  url: string;
  // When the data was scraped (timestamp)
  timestamp: number;
}

/**
 * Website data storage utility
 * Provides functions to save, retrieve, and clear website data from localStorage
 */
export const websiteDataStorage = {
  // Save website data to localStorage
  saveWebsiteData: (data: WebsiteScrapedData): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WEBSITE_DATA_STORAGE_KEY, JSON.stringify(data));
  },

  // Get website data from localStorage
  getWebsiteData: (): WebsiteScrapedData | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(WEBSITE_DATA_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Clear website data from localStorage
  clearWebsiteData: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(WEBSITE_DATA_STORAGE_KEY);
  }
};