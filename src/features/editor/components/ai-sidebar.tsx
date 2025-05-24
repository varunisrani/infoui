"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PanelRight, Sparkles, Wand2, Globe, MessageSquare } from "lucide-react";
import { Editor } from "@/features/editor/types";
import { AiSvgGenerator } from "@/features/editor/components/ai-svg-generator";
import { AiWebsiteScraper } from "@/features/editor/components/ai-website-scraper";
import { AiAssistant } from "@/features/editor/components/ai-assistant";
import { Card } from "@/components/ui/card";

interface AiSidebarProps {
  editor: Editor | undefined;
  onClose: () => void;
}

export const AiSidebar = ({ editor, onClose }: AiSidebarProps) => {
  const [activeScreen, setActiveScreen] = useState<"main" | "svg-generator" | "website-scraper" | "ai-assistant">("main");

  // Toggle SVG Generator screen
  const toggleSvgGenerator = () => {
    setActiveScreen(activeScreen === "main" ? "svg-generator" : "main");
  };

  // Toggle Website Scraper screen
  const toggleWebsiteScraper = () => {
    setActiveScreen(activeScreen === "main" ? "website-scraper" : "main");
  };
  
  // Toggle AI Assistant screen
  const toggleAiAssistant = () => {
    setActiveScreen(activeScreen === "main" ? "ai-assistant" : "main");
  };

  // Listen for events to navigate between components
  useEffect(() => {
    // Listen for event to open SVG generator from Website Scraper
    const handleOpenSvgGenerator = () => {
      setActiveScreen("svg-generator");
    };
    
    window.addEventListener('open-svg-generator', handleOpenSvgGenerator);
    
    return () => {
      window.removeEventListener('open-svg-generator', handleOpenSvgGenerator);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {activeScreen === "main" ? (
        // Main screen
        <>
          <div className="p-4 pb-2 border-b bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">AI Creator</h3>
                <p className="text-sm text-muted-foreground">
                  Generate creative content with AI
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={onClose}>
                <PanelRight size={16} />
              </Button>
            </div>
          </div>

          <div className="p-5 flex-1 overflow-auto">
            <div className="space-y-5">
              {/* SVG Generator Card */}
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-slate-200 dark:border-slate-800">
                <div 
                  className="border-b p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-purple-950/40"
                  onClick={toggleSvgGenerator}
                >
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 shadow-sm">
                      <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-base">AI SVG Generator</h4>
                  </div>
                  <p className="text-sm text-muted-foreground pl-[3.25rem]">
                    Create custom vector graphics from text descriptions
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900">
                  <Button 
                    className="w-full font-medium" 
                    variant="default"
                    onClick={toggleSvgGenerator}
                  >
                    <span>Generate SVG</span>
                    <Wand2 className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
              
              {/* Website Scraper Card */}
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-slate-200 dark:border-slate-800">
                <div 
                  className="border-b p-5 bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 dark:from-green-950/50 dark:via-teal-950/30 dark:to-cyan-950/40"
                  onClick={toggleWebsiteScraper}
                >
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3 shadow-sm">
                      <Globe size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold text-base">AI Website Scraper</h4>
                  </div>
                  <p className="text-sm text-muted-foreground pl-[3.25rem]">
                    Extract text content and color themes from websites
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900">
                  <Button 
                    className="w-full font-medium" 
                    variant="default"
                    onClick={toggleWebsiteScraper}
                  >
                    <span>Scrape Website</span>
                    <Globe className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
              
              {/* AI Assistant Card */}
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-slate-200 dark:border-slate-800">
                <div 
                  className="border-b p-5 bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 dark:from-purple-950/50 dark:via-fuchsia-950/30 dark:to-pink-950/40"
                  onClick={toggleAiAssistant}
                >
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3 shadow-sm">
                      <MessageSquare size={18} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-base">AI Design Assistant</h4>
                  </div>
                  <p className="text-sm text-muted-foreground pl-[3.25rem]">
                    Chat with AI to create and edit designs
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900">
                  <Button 
                    className="w-full font-medium" 
                    variant="default"
                    onClick={toggleAiAssistant}
                  >
                    <span>Chat with Assistant</span>
                    <MessageSquare className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
              
              {/* CTA Button */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline" 
                  className="w-full bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-800 dark:hover:to-slate-700 border-slate-200 dark:border-slate-700"
                  onClick={toggleSvgGenerator}
                >
                  Explore AI Creator
                  <Sparkles size={14} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : activeScreen === "svg-generator" ? (
        // SVG Generator screen
        <AiSvgGenerator 
          editor={editor} 
          onClose={toggleSvgGenerator} 
        />
      ) : activeScreen === "ai-assistant" ? (
        // AI Assistant screen
        <AiAssistant
          editor={editor}
          onClose={toggleAiAssistant}
        />
      ) : (
        // Website Scraper screen
        <AiWebsiteScraper
          editor={editor}
          onClose={toggleWebsiteScraper}
        />
      )}
    </div>
  );
};
