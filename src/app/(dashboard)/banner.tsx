"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Wand2, Eye, Save } from "lucide-react"; // Added Save icon
import { useState } from "react";
import { storage } from "@/lib/storage";
import { svgStorage, svgNormalizer } from "@/lib/svg-utils"; // Added svg-utils imports
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Banner = () => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [quickSaveLoading, setQuickSaveLoading] = useState(false); // Added quickSaveLoading state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [generatedSVG, setGeneratedSVG] = useState<{
    svg: string;
    prompt: string;
    enhancedPrompt: string;
  } | null>(null);
  const router = useRouter();

  const onClick = () => {
    setLoading(true);
    try {
      const project = storage.saveProject({
        name: "Untitled project",
        json: "",
        width: 1080,  // Changed from default
        height: 1080, // Changed from default
      });
      
      toast.success("Project created!");
      router.push(`/editor/${project.id}`);
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const generateSVG = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setAiLoading(true);
    setGeneratedSVG(null);
    setPreviewMode(false);
    
    try {
      // Use local server when running locally
      const apiUrl = location.hostname === 'localhost' 
        ? "http://localhost:5001/api/generate-svg" 
        : "/api/generate-svg";
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          skip_enhancement: false 
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Store the generated SVG data
      setGeneratedSVG({
        svg: data.svg_code,
        prompt: prompt,
        enhancedPrompt: data.enhanced_prompt
      });
      
      // Show preview mode
      setPreviewMode(true);
      
      toast.success("AI SVG generated! Check the preview.");
    } catch (error) {
      console.error("Error generating SVG:", error);
      toast.error("Failed to generate SVG: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setAiLoading(false);
    }
  };

  const createProject = () => {
    if (!generatedSVG) return;

    if (!generatedSVG.svg) {
      toast.error("No SVG content found to save.");
      return;
    }
    
    try {
      // Store the generated SVG string in localStorage
      localStorage.setItem("newlyGeneratedSvg", generatedSVG.svg);
      
      toast.success("SVG ready to be used!");
      setAiDialogOpen(false);
      router.push("/editor/new-from-ai");
    } catch (error) {
      console.error("Error processing AI SVG:", error);
      toast.error("Failed to process AI SVG: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleQuickSaveToLibrary = async () => {
    if (!generatedSVG || !generatedSVG.svg) {
      toast.error("No SVG content available to save.");
      return;
    }
    // Check both current prompt and prompt stored in generatedSVG
    if (!prompt && !generatedSVG.prompt) { 
      toast.error("Cannot determine a name for the SVG as the prompt is empty.");
      return;
    }

    setQuickSaveLoading(true);
    try {
      const svgContent = generatedSVG.svg;
      // Use the prompt from the generatedSVG object if available, otherwise use the current prompt state
      const nameSource = generatedSVG.prompt || prompt;
      const svgName = nameSource.trim() ? `AI: ${nameSource.substring(0, 25)}${nameSource.length > 25 ? '...' : ''}` : "AI Generated SVG";
      
      const dataUrl = svgNormalizer.createDataUrl(svgContent);
      
      const savedSVG = svgStorage.saveSVG(svgContent, svgName, dataUrl);

      if (savedSVG) {
        toast.success(`SVG "${savedSVG.name}" saved to library!`);
      } else {
        toast.error("Failed to save SVG to library.");
      }
    } catch (error) {
      console.error("Error quick saving SVG to library:", error);
      toast.error(`Failed to save SVG: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setQuickSaveLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <Button onClick={onClick} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Start creating
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
      
      <Button 
        onClick={() => setAiDialogOpen(true)} 
        variant="outline"
        disabled={loading || aiLoading}
      >
        {aiLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            AI Generate
            <Wand2 className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-5xl flex flex-col md:flex-row md:gap-4">
          <div className="flex-1 space-y-4 py-2">
            <DialogHeader>
              <DialogTitle>Generate SVG with AI</DialogTitle>
              <DialogDescription>
                Enter a prompt and our AI will generate an SVG image for you.
              </DialogDescription>
            </DialogHeader>
            
            <Input
              placeholder="E.g., A mountain landscape with sunset"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={aiLoading}
            />
            
            <Button 
              onClick={generateSVG} 
              disabled={aiLoading || !prompt.trim()} 
              className="w-full"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  Generate SVG
                  <Wand2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            
            {previewMode && generatedSVG && (
              <div className="mt-4 space-y-2">
                <Button 
                  onClick={createProject} 
                  className="w-full"
                  variant="default"
                  disabled={aiLoading || quickSaveLoading} // Disable if any AI operation is ongoing
                >
                  Use This SVG in Editor
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  onClick={handleQuickSaveToLibrary}
                  className="w-full"
                  variant="outline"
                  disabled={aiLoading || quickSaveLoading}
                >
                  {quickSaveLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Quick Save to Library
                </Button>
              </div>
            )}
          </div>
          
          {/* Preview Sidebar */}
          {previewMode && generatedSVG && (
            <div className="flex-1 border rounded-md p-4 mt-4 md:mt-0 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">SVG Preview</h3>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Eye className="h-3 w-3 mr-1" />
                  <span>Preview</span>
                </div>
              </div>
              
              <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-md p-2 overflow-hidden flex items-center justify-center">
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    aspectRatio: "1/1", 
                    maxWidth: "100%", 
                    maxHeight: "400px",
                    position: "relative"
                  }}
                >
                  <div 
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "absolute",
                      top: 0,
                      left: 0
                    }}
                    dangerouslySetInnerHTML={{ __html: generatedSVG.svg }}
                  />
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  SVG generated from: <span className="font-medium">{generatedSVG.prompt}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
