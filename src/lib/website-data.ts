// Storage key for website scraped data
export const WEBSITE_DATA_STORAGE_KEY = 'website_data';

// Interface for storing website scraped data
export interface WebsiteScrapedData {
  text: string;
  colors: {
    hex: string;
    name?: string;
  }[];
  url: string;
  timestamp: number;
}

// Website data storage utility
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