"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRight, Trash, Sparkles } from "lucide-react";
import { Editor } from "@/features/editor/types";
import { AiSvgGenerator } from "@/features/editor/components/ai-svg-generator";

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
                <h3 className="text-lg font-medium">AI Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Generate content with AI
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={onClose}>
                <PanelRight size={16} />
              </Button>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-auto">
            <div className="space-y-3">
              {/* SVG Generator Card */}
              <div className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer" onClick={toggleSvgGenerator}>
                <div className="flex items-center mb-2">
                  <Sparkles size={16} className="mr-2 text-blue-500" />
                  <h4 className="font-medium">AI SVG Generator</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Generate custom SVG graphics from text prompts
                </p>
              </div>
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
