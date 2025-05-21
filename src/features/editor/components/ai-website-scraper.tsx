"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Globe, Loader2, Copy, CheckCircle2, Paintbrush, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Editor } from "@/features/editor/types";

interface AiWebsiteScraperProps {
  editor: Editor | undefined;
  onClose: () => void;
}

interface WebsiteScraperResult {
  text: string;
  colors: {
    hex: string;
    name?: string;
  }[];
}

type ScrapingStep = 
  | "idle"
  | "validating"
  | "connecting"
  | "fetching"
  | "extractingText"
  | "extractingColors"
  | "complete";

export const AiWebsiteScraper = ({ editor, onClose }: AiWebsiteScraperProps) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WebsiteScraperResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [scrapingStep, setScrapingStep] = useState<ScrapingStep>("idle");
  const [progress, setProgress] = useState(0);

  // Update progress based on current step
  useEffect(() => {
    switch (scrapingStep) {
      case "idle":
        setProgress(0);
        break;
      case "validating":
        setProgress(10);
        break;
      case "connecting":
        setProgress(20);
        break;
      case "fetching":
        setProgress(40);
        break;
      case "extractingText":
        setProgress(60);
        break;
      case "extractingColors":
        setProgress(80);
        break;
      case "complete":
        setProgress(100);
        break;
    }
  }, [scrapingStep]);

  const handleScrapeWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast.error("Please enter a website URL");
      return;
    }

    setScrapingStep("validating");
    
    // Basic URL validation
    let processedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      processedUrl = `https://${url}`;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);
      
      // Update steps as we progress through the scraping process
      setScrapingStep("connecting");
      
      setTimeout(() => setScrapingStep("fetching"), 500);
      
      const response = await fetch('/api/ai/scrape-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: processedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape website");
      }

      setScrapingStep("extractingText");
      
      setTimeout(() => setScrapingStep("extractingColors"), 300);
      
      const data = await response.json();
      setResult(data);
      
      setScrapingStep("complete");
      toast.success("Website scraped successfully!");
    } catch (err) {
      console.error("Error scraping website:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      toast.error(err instanceof Error ? err.message : "Failed to scrape website");
      setScrapingStep("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = useCallback(() => {
    if (!result?.text) return;
    
    navigator.clipboard.writeText(result.text)
      .then(() => {
        setIsCopied(true);
        toast.success("Text copied to clipboard!");
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        toast.error("Failed to copy text to clipboard");
      });
  }, [result]);

  const handleUseColor = useCallback((hex: string) => {
    if (!editor) return;
    
    try {
      editor.changeFillColor(hex);
      toast.success(`Color ${hex} applied to selected element`);
    } catch (err) {
      toast.error("Please select an element first");
    }
  }, [editor]);

  // Get step message based on current scraping step
  const getStepMessage = () => {
    switch (scrapingStep) {
      case "validating":
        return "Validating URL...";
      case "connecting":
        return "Connecting to website...";  
      case "fetching":
        return "Fetching website content...";
      case "extractingText":
        return "Extracting text content...";
      case "extractingColors":
        return "Extracting color palette...";
      case "complete":
        return "Scraping complete!";
      default:
        return "";
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="p-4 pb-2 border-b bg-white dark:bg-slate-900">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="mr-1"
            >
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">AI Website Scraper</h3>
              <p className="text-sm text-muted-foreground">
                Extract content and colors from websites
              </p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <form onSubmit={handleScrapeWebsite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="website-url">Website URL</Label>
              <div className="flex space-x-2">
                <Input 
                  id="website-url"
                  placeholder="Enter website URL (e.g., example.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="submit"
                  disabled={isLoading || !url}
                  className="whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Scrape
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
          
          {/* Progress indicator */}
          {isLoading && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{getStepMessage()}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="grid grid-cols-5 gap-1 mt-3">
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${scrapingStep !== "idle" ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}></div>
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${["connecting", "fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}></div>
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${["fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}></div>
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${["extractingText", "extractingColors", "complete"].includes(scrapingStep) ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}></div>
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${["extractingColors", "complete"].includes(scrapingStep) ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}></div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li className="flex items-center">
                  {scrapingStep !== "idle" ? <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> : <div className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  <span className={scrapingStep !== "idle" ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}>Validating URL</span>
                </li>
                <li className="flex items-center">
                  {["connecting", "fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> : <div className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  <span className={["connecting", "fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}>Connecting to website</span>
                </li>
                <li className="flex items-center">
                  {["fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> : <div className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  <span className={["fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}>Fetching website content</span>
                </li>
                <li className="flex items-center">
                  {["extractingText", "extractingColors", "complete"].includes(scrapingStep) ? <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> : <div className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  <span className={["extractingText", "extractingColors", "complete"].includes(scrapingStep) ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}>Extracting text content</span>
                </li>
                <li className="flex items-center">
                  {["extractingColors", "complete"].includes(scrapingStep) ? <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" /> : <div className="h-3.5 w-3.5 mr-2 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  <span className={["extractingColors", "complete"].includes(scrapingStep) ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}>Extracting color palette</span>
                </li>
              </ul>
            </div>
          )}

          {scrapingStep === "complete" && !isLoading && (
            <div className="py-2 px-4 bg-green-50 border border-green-200 rounded-md text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 flex items-center justify-center">
              <CheckCheck className="h-4 w-4 mr-2" />
              <span>Website scraped successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Extracted Text</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={handleCopyText}
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900 dark:border-slate-800 max-h-96 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm">{result.text}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color Palette</Label>
                {result.colors.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {result.colors.map((color, index) => (
                      <div 
                        key={`${color.hex}-${index}`} 
                        className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleUseColor(color.hex)}
                      >
                        <div 
                          className="w-full h-12 rounded-md border shadow-sm mb-1 flex items-center justify-center"
                          style={{ backgroundColor: color.hex, color: getContrastColor(color.hex) }}
                        >
                          <Paintbrush size={14} className="opacity-70 hover:opacity-100" />
                        </div>
                        <span className="text-xs text-center truncate w-full">{color.hex}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No colors detected</p>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate contrast (using YIQ formula)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return black or white based on contrast
  return yiq >= 128 ? '#000000' : '#ffffff';
}