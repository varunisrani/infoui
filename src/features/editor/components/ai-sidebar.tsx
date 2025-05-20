"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRight, Sparkles, Wand2 } from "lucide-react";
import { Editor } from "@/features/editor/types";
import { AiSvgGenerator } from "@/features/editor/components/ai-svg-generator";
import { Card } from "@/components/ui/card";

interface AiSidebarProps {
  editor: Editor | undefined;
  onClose: () => void;
}

export const AiSidebar = ({ editor, onClose }: AiSidebarProps) => {
  const [activeScreen, setActiveScreen] = useState<"main" | "svg-generator">("main");

  // Toggle SVG Generator screen
  const toggleSvgGenerator = () => {
    setActiveScreen(activeScreen === "main" ? "svg-generator" : "main");
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {activeScreen === "main" ? (
        // Main screen
        <>
          <div className="p-4 pb-2 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">AI Creator</h3>
                <p className="text-sm text-muted-foreground">
                  Generate creative content with AI
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={onClose}>
                <PanelRight size={16} />
              </Button>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-auto">
            <div className="space-y-4">
              {/* SVG Generator Card */}
              <Card className="hover:shadow-md transition-all cursor-pointer overflow-hidden">
                <div 
                  className="border-b p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50"
                  onClick={toggleSvgGenerator}
                >
                  <div className="flex items-center mb-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                      <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-medium">AI SVG Generator</h4>
                  </div>
                  <p className="text-sm text-muted-foreground pl-11">
                    Create custom vector graphics from text descriptions
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900">
                  <Button 
                    className="w-full" 
                    variant="default"
                    onClick={toggleSvgGenerator}
                  >
                    Generate SVG
                    <Wand2 className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        // SVG Generator screen
        <AiSvgGenerator 
          editor={editor} 
          onClose={toggleSvgGenerator} 
        />
      )}
    </div>
  );
};
