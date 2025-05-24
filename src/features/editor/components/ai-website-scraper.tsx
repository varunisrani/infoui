"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Globe, Loader2, Copy, CheckCircle2, Paintbrush, CheckCheck, Link2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Editor } from "@/features/editor/types";
import { Card } from "@/components/ui/card";

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
      
      // Dispatch a custom event with the scraped data for other components to use
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('website-scraper-data', {
          detail: {
            ...data,
            url: processedUrl
          }
        });
        window.dispatchEvent(event);
      }
      
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
      <div className="p-5 border-b bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80"
            >
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">AI Website Scraper</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-green-500 to-cyan-500 text-white rounded-full shadow-sm">
                  Premium
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Extract content and brand colors from websites with AI
              </p>
            </div>
          </div>
          <div className="hidden md:flex">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              <span>Premium Feature</span>
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-cyan-300 dark:from-green-600 dark:to-cyan-700 flex items-center justify-center mr-3 shadow-md">
                  <Globe size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Website Scraper</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Extract content and brand colors from any website
                  </p>
                </div>
              </div>
              <form onSubmit={handleScrapeWebsite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="website-url" className="text-sm font-medium">
                    Enter website URL to scrape
                  </Label>
                  <div className="relative flex space-x-2">
                    <div className="relative flex-1 group">
                      <Input 
                        id="website-url"
                        placeholder="Enter website URL (e.g., example.com)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                        className="pl-10 py-6 border-slate-200 dark:border-slate-700 shadow-sm transition-all 
                                   focus:ring-2 focus:ring-green-500/30 dark:focus:ring-green-500/40 focus:border-green-400
                                   hover:border-slate-300 dark:hover:border-slate-600 group-hover:border-slate-300
                                   dark:group-hover:border-slate-600"
                      />
                      <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    </div>
                    <Button 
                      type="submit"
                      disabled={isLoading || !url}
                      className="whitespace-nowrap py-6 px-6 text-base font-medium shadow-md bg-gradient-to-r from-green-500 to-cyan-500 
                                hover:from-green-600 hover:to-cyan-600 dark:from-green-600 dark:to-cyan-600 dark:hover:from-green-500
                                dark:hover:to-cyan-500 border-0 transition-all duration-300 hover:shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Scraping...
                        </>
                      ) : (
                        <>
                          <Globe className="mr-2 h-5 w-5" />
                          Scrape Website
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>
          
          {/* Progress indicator */}
          {isLoading && (
            <Card className="border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden animate-fade-in">
              <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-medium flex items-center mb-1">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-green-500" />
                  Scraping in Progress
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">We&apos;re extracting content and colors from your website</p>
              </div>
              
              <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium">{getStepMessage()}</span>
                    <span className="text-sm font-medium px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      {progress}%
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" 
                    style={{
                      backgroundImage: progress > 0 ? 'linear-gradient(to right, #10b981, #06b6d4)' : '',
                      backgroundSize: `${progress}% 100%`,
                      backgroundRepeat: 'no-repeat'
                    }}
                  />

                  <div className="grid grid-cols-5 gap-2 mt-5">
                    <div className={`h-2 rounded-full transition-all duration-500 ${scrapingStep !== "idle" 
                      ? "bg-gradient-to-r from-green-500 to-green-400 shadow-sm" 
                      : "bg-slate-200 dark:bg-slate-700"}`}></div>
                    <div className={`h-2 rounded-full transition-all duration-500 ${["connecting", "fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-gradient-to-r from-green-400 to-teal-400 shadow-sm" 
                      : "bg-slate-200 dark:bg-slate-700"}`}></div>
                    <div className={`h-2 rounded-full transition-all duration-500 ${["fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-gradient-to-r from-teal-400 to-cyan-500 shadow-sm" 
                      : "bg-slate-200 dark:bg-slate-700"}`}></div>
                    <div className={`h-2 rounded-full transition-all duration-500 ${["extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-gradient-to-r from-cyan-500 to-blue-400 shadow-sm" 
                      : "bg-slate-200 dark:bg-slate-700"}`}></div>
                    <div className={`h-2 rounded-full transition-all duration-500 ${["extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-gradient-to-r from-blue-400 to-indigo-500 shadow-sm" 
                      : "bg-slate-200 dark:bg-slate-700"}`}></div>
                  </div>
                </div>
                
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                  <li className={`flex items-center p-3 rounded-lg transition-all duration-300
                    ${scrapingStep !== "idle" 
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50" 
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"}`}>
                    {scrapingStep !== "idle" ? 
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center mr-3 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div> : 
                      <div className="h-7 w-7 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-slate-500">1</span>
                      </div>
                    }
                    <span className={`text-sm font-medium ${scrapingStep !== "idle" ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-400"}`}>
                      Validating URL
                    </span>
                  </li>
                  
                  <li className={`flex items-center p-3 rounded-lg transition-all duration-300
                    ${["connecting", "fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50" 
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"}`}>
                    {["connecting", "fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? 
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-500 to-teal-400 flex items-center justify-center mr-3 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div> : 
                      <div className="h-7 w-7 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-slate-500">2</span>
                      </div>
                    }
                    <span className={`text-sm font-medium ${["connecting", "fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-400"}`}>
                      Connecting to website
                    </span>
                  </li>
                  
                  <li className={`flex items-center p-3 rounded-lg transition-all duration-300
                    ${["fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50" 
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"}`}>
                    {["fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) ? 
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center mr-3 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div> : 
                      <div className="h-7 w-7 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-slate-500">3</span>
                      </div>
                    }
                    <span className={`text-sm font-medium ${["fetching", "extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-400"}`}>
                      Fetching website content
                    </span>
                  </li>
                  
                  <li className={`flex items-center p-3 rounded-lg transition-all duration-300
                    ${["extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50" 
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"}`}>
                    {["extractingText", "extractingColors", "complete"].includes(scrapingStep) ? 
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-400 flex items-center justify-center mr-3 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div> : 
                      <div className="h-7 w-7 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-slate-500">4</span>
                      </div>
                    }
                    <span className={`text-sm font-medium ${["extractingText", "extractingColors", "complete"].includes(scrapingStep) 
                      ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-400"}`}>
                      Extracting text content
                    </span>
                  </li>
                  
                  <li className={`flex items-center p-3 rounded-lg transition-all duration-300
                    ${["extractingColors", "complete"].includes(scrapingStep) 
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50" 
                      : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"}`}>
                    {["extractingColors", "complete"].includes(scrapingStep) ? 
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center mr-3 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div> : 
                      <div className="h-7 w-7 rounded-full border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-slate-500">5</span>
                      </div>
                    }
                    <span className={`text-sm font-medium ${["extractingColors", "complete"].includes(scrapingStep) 
                      ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-400"}`}>
                      Extracting color palette
                    </span>
                  </li>
                </ul>
              </div>
            </Card>
          )}

          {scrapingStep === "complete" && !isLoading && (
            <Card className="border-green-200 dark:border-green-800 shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 border-b border-green-200 dark:border-green-800">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center mr-3 shadow-sm animate-pulse">
                    <CheckCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-green-800 dark:text-green-300">Scraping Complete!</h3>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Content and colors have been extracted successfully
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card className="border-red-200 dark:border-red-800 shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/20 border-b border-red-200 dark:border-red-800">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-red-400 flex items-center justify-center mr-3 shadow-sm">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Scraping Failed</h3>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {result && (
            <div className="space-y-6 mt-6">
              <Card className="border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/10 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mr-3 shadow-sm">
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Extracted Text Content</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Main content extracted from the website
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200 hover:shadow gap-1.5"
                      onClick={handleCopyText}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="p-0">
                  <div className="max-h-96 overflow-y-auto p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.text}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        // Dispatch event to notify AI SVG generator
                        const event = new CustomEvent('website-scraper-data', {
                          detail: {
                            ...result,
                            url: url
                          }
                        });
                        window.dispatchEvent(event);
                        
                        // Close this component and redirect to SVG generator
                        onClose();
                        // Notify parent component that user wants to use this data in SVG generator
                        window.dispatchEvent(new CustomEvent('open-svg-generator'));
                        toast.success("Website data ready to use in SVG Generator!");
                      }}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-none"
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      <span>Use this website in a SVG generator</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 gap-1"
                      onClick={handleCopyText}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Copied to clipboard</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy full text</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-3 shadow-sm">
                      <Paintbrush className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Brand Color Palette</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Click on a color to apply it to selected elements
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900">
                  {result.colors.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {result.colors.map((color, index) => (
                        <div 
                          key={`${color.hex}-${index}`} 
                          className="group flex flex-col items-center cursor-pointer hover:scale-105 transition-all duration-300"
                          onClick={() => handleUseColor(color.hex)}
                        >
                          <div 
                            className="w-full aspect-square rounded-lg border shadow-sm mb-2 group-hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                            style={{ backgroundColor: color.hex }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/10">
                              <div className="bg-white dark:bg-slate-800 rounded-full p-2 shadow">
                                <Paintbrush size={16} className="text-slate-700 dark:text-slate-300" />
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="font-medium text-sm">{color.hex}</span>
                            <span className="block text-xs text-muted-foreground mt-0.5">Click to apply</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="inline-flex h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-3">
                        <svg className="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                        </svg>
                      </div>
                      <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">No colors detected</h3>
                      <p className="text-sm text-muted-foreground">We couldn&apos;t extract any distinct colors from this website.</p>
                    </div>
                  )}
                </div>
              </Card>

              <div className="py-4 px-4">
                <Button 
                  onClick={onClose} 
                  variant="outline" 
                  className="w-full text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to AI Creator
                </Button>
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