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
    <div className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {activeScreen === "main" ? (
        // Main screen
        <>
          <div className="p-6 pb-4 border-b border-slate-200/60 bg-gradient-to-r from-white via-slate-50 to-blue-50/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
            <div className="relative z-10 flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AI Creator Studio
                  </h3>
                </div>
                <p className="text-sm text-slate-600 font-medium ml-10">
                  Transform ideas into visual content with AI
                </p>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={onClose}
                className="hover:bg-slate-100 border-slate-300 hover:border-slate-400 transition-all duration-200 hover:scale-105"
              >
                <PanelRight size={16} className="text-slate-600" />
              </Button>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-auto">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* SVG Generator Card */}
              <Card className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden border-slate-200/60 shadow-lg bg-gradient-to-br from-white to-blue-50/30">
                <div 
                  className="border-b border-blue-200/40 p-6 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40 relative overflow-hidden"
                  onClick={toggleSvgGenerator}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/10 group-hover:from-blue-500/10 group-hover:to-purple-500/15 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <Sparkles size={20} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 transition-colors duration-200">AI SVG Generator</h4>
                        <p className="text-xs text-blue-600/80 font-medium">Vector Graphics Creation</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Transform text descriptions into professional vector graphics with advanced AI technology
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-r from-white to-slate-50/50">
                  <Button 
                    className="w-full font-semibold bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12" 
                    onClick={toggleSvgGenerator}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    <span>Generate SVG</span>
                  </Button>
                </div>
              </Card>
              
              {/* Website Scraper Card */}
              <Card className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden border-slate-200/60 shadow-lg bg-gradient-to-br from-white to-emerald-50/30">
                <div 
                  className="border-b border-emerald-200/40 p-6 bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/40 relative overflow-hidden"
                  onClick={toggleWebsiteScraper}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/10 group-hover:from-emerald-500/10 group-hover:to-cyan-500/15 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <Globe size={20} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-800 group-hover:text-emerald-700 transition-colors duration-200">AI Website Scraper</h4>
                        <p className="text-xs text-emerald-600/80 font-medium">Content Extraction</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Extract text content, images, and color themes from any website for your design projects
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-r from-white to-slate-50/50">
                  <Button 
                    className="w-full font-semibold bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12" 
                    onClick={toggleWebsiteScraper}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    <span>Scrape Website</span>
                  </Button>
                </div>
              </Card>
              
              {/* AI Assistant Card */}
              <Card className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden border-slate-200/60 shadow-lg bg-gradient-to-br from-white to-purple-50/30">
                <div 
                  className="border-b border-purple-200/40 p-6 bg-gradient-to-br from-purple-50/80 via-fuchsia-50/60 to-pink-50/40 relative overflow-hidden"
                  onClick={toggleAiAssistant}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/10 group-hover:from-purple-500/10 group-hover:to-pink-500/15 transition-all duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 flex items-center justify-center mr-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <MessageSquare size={20} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-800 group-hover:text-purple-700 transition-colors duration-200">AI Design Assistant</h4>
                        <p className="text-xs text-purple-600/80 font-medium">Interactive Design Chat</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Collaborate with AI to brainstorm, create, and refine your design concepts through conversation
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-r from-white to-slate-50/50">
                  <Button 
                    className="w-full font-semibold bg-gradient-to-r from-purple-500 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12" 
                    onClick={toggleAiAssistant}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span>Chat with Assistant</span>
                  </Button>
                </div>
              </Card>
            </div>
            
            {/* CTA Section */}
            <div className="mt-8 pt-6 border-t border-slate-200/60">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/60 border border-slate-200/60">
                  <p className="text-xs text-slate-600 font-medium">
                    ✨ Powered by advanced AI models for professional results
                  </p>
                </div>
                <Button
                  variant="outline" 
                  className="w-full h-12 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border-slate-300 text-slate-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={toggleSvgGenerator}
                >
                  <Sparkles size={16} className="mr-2 text-blue-500" />
                  Explore AI Creator Studio
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
