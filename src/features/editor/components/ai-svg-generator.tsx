"use client";

import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  X,
  AlertCircle,
  Copy,
  Save,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Maximize,
  Minimize,
  CheckCircle2,
  AlertTriangle,
  Check,
  PlusCircle,
  Loader,
  ExternalLink,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";
import { fabric } from "fabric";
import { Editor } from "@/features/editor/types";
import {
  svgStorage,
  svgNormalizer,
  svgTester,
  svgCanvasUtils,
  StoredSVG,
  SVG_STORAGE_KEY
} from "@/lib/svg-utils";
import { SvgRenderer } from "@/features/editor/components/svg-renderer";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/storage";

// Definition of SVG data structure
interface SVGData {
  svg: string;
  prompt: string;
  enhancedPrompt: string;
}

interface AiSvgGeneratorProps {
  editor: Editor | undefined;
  onClose: () => void;
}

export const AiSvgGenerator = ({ editor, onClose }: AiSvgGeneratorProps) => {
  // State management
  const [prompt, setPrompt] = useState<string>("");
  const [svgData, setSvgData] = useState<SVGData | null>(null);
  const [error, setError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAddingToCanvas, setIsAddingToCanvas] = useState<boolean>(false);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [savedToLibrary, setSavedToLibrary] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isBigPreview, setIsBigPreview] = useState<boolean>(false);
  const [svgLoadingStatus, setSvgLoadingStatus] = useState<"success" | "warning" | "error" | "loading" | null>(null);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 1080, height: 1080 });
  const [shouldFillCanvas, setShouldFillCanvas] = useState<boolean>(true);

  // Refs
  const previewRef = useRef<HTMLDivElement>(null);
  const { shouldBlock, triggerPaywall } = usePaywall();
  const router = useRouter();

  // Function to generate an SVG from a prompt
  const generateSVG = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for your SVG");
      return;
    }

    if (shouldBlock) {
      triggerPaywall();
      return;
    }

    try {
      setIsGenerating(true);
      setSvgData(null);
      setSvgLoadingStatus("loading");
      setIsSaved(false);

      const response = await fetch('https://pppp-351z.onrender.com/api/generate-svg', {
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
        throw new Error(`SVG generation failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.svg_code) {
        throw new Error("No SVG code received from the server");
      }

      // Process the SVG for validation
      const cleanedSvg = processReceivedSVG(data.svg_code);

      // Store the SVG data
      const newSvgData = {
        svg: cleanedSvg,
        prompt: prompt,
        enhancedPrompt: data.enhanced_prompt || ""
      };

      setSvgData(newSvgData);

      // Test if the SVG can be loaded with Fabric.js
      const isValidForFabric = await svgTester.testWithFabric(cleanedSvg);
      setSvgLoadingStatus(isValidForFabric ? "success" : "warning");

      toast.success("SVG successfully generated!");
    } catch (error) {
      console.error("Error generating SVG:", error);
      toast.error("Failed to generate SVG: " + (error instanceof Error ? error.message : String(error)));
      setSvgLoadingStatus("error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Process received SVG data
  const processReceivedSVG = (svgContent: string): string => {
    // Apply full SVG processing pipeline
    const { processed } = svgNormalizer.fullyProcessSvg(svgContent);
    return processed;
  };

  // Function to save SVG to library
  const saveToLibrary = async () => {
    if (!svgData) return;

    try {
      setIsSaving(true);

      // First, make sure we have a clean SVG by running it through our normalizer
      const { processed, dataUrl } = svgNormalizer.fullyProcessSvg(svgData.svg);

      // Get a name from the prompt
      const name = `AI: ${prompt.substring(0, 20)}${prompt.length > 20 ? '...' : ''}`;

      // Test if the SVG can be loaded by Fabric.js before saving
      const canLoad = await svgTester.testWithFabric(processed);
      
      if (!canLoad) {
        console.warn("SVG failed fabric.js loading test, applying additional processing");
        // Apply more aggressive cleaning if needed
        const fallbackSvg = svgTester.getFallbackVersion(processed);
        const { processed: finalProcessed, dataUrl: finalDataUrl } = svgNormalizer.fullyProcessSvg(fallbackSvg);
        
        // Save the fallback version
        svgStorage.saveSVG(finalProcessed, name, finalDataUrl);
      } else {
        // Save to storage using the centralized storage utility
        svgStorage.saveSVG(processed, name, dataUrl);
      }

      setSavedToLibrary(true);
      toast.success('SVG saved to your library!');
    } catch (error) {
      console.error('Error saving SVG to library:', error);
      toast.error('Failed to save SVG to library');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to add SVG to canvas
  const addToCanvas = async () => {
    if (!svgData) return;

    try {
      setIsAddingToCanvas(true);

      // Get canvas from editor prop or global state
      const canvas = editor?.canvas || window.canvasState?.canvas;

      if (!canvas) {
        toast.error("Canvas not initialized");
        return;
      }

      // Use our improved SVG loading utility
      const result = await svgCanvasUtils.addSvgToCanvas(canvas, svgData.svg);

      if (!result) {
        console.warn('Primary SVG loading failed, trying fallback...');
        // If primary method fails, try fallback
        const fallbackResult = await svgCanvasUtils.addSvgAsImageFallback(
          canvas,
          svgData.svg,
          `AI SVG: ${prompt.substring(0, 20)}`
        );

        if (!fallbackResult) {
          throw new Error('Failed to add SVG to canvas');
        }
      }

      toast.success('SVG added to canvas!');
      // Close the generator after adding to canvas
      onClose();
    } catch (error) {
      console.error('Error adding SVG to canvas:', error);
      toast.error('Failed to add SVG to canvas');
    } finally {
      setIsAddingToCanvas(false);
    }
  };

  // Function to copy SVG code to clipboard
  const copyToClipboard = () => {
    if (!svgData) return;

    try {
      navigator.clipboard.writeText(svgData.svg);
      toast.success("SVG code copied to clipboard");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy SVG code");
    }
  };

  // Function to retry processing the SVG
  const reprocessSVG = async () => {
    if (!svgData) return;

    try {
      setSvgLoadingStatus("loading");

      // Apply more aggressive cleaning
      const fallbackVersion = svgTester.getFallbackVersion(svgData.svg);
      const { processed: cleanedSvg } = svgNormalizer.fullyProcessSvg(fallbackVersion);

      // Test if the cleaned version works with Fabric.js
      const isValidForFabric = await svgTester.testWithFabric(cleanedSvg);

      setSvgData({
        ...svgData,
        svg: cleanedSvg
      });

      setSvgLoadingStatus(isValidForFabric ? "success" : "warning");

      toast.success("SVG reprocessed for better compatibility");
    } catch (error) {
      console.error("Error reprocessing SVG:", error);
      toast.error("Failed to reprocess SVG");
      setSvgLoadingStatus("error");
    }
  };

  // Apply custom dimensions to the SVG
  const applyCustomDimensions = () => {
    if (!svgData) return;

    try {
      // Parse the SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgData.svg, 'image/svg+xml');

      // Check for parse errors
      const parseError = svgDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error("SVG parsing error");
      }

      const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;

      // Update dimensions
      svgElement.setAttribute('width', dimensions.width.toString());
      svgElement.setAttribute('height', dimensions.height.toString());
      svgElement.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

      // Convert back to string
      const serializer = new XMLSerializer();
      const updatedSvg = serializer.serializeToString(svgElement);

      // Update state
      setSvgData({
        ...svgData,
        svg: updatedSvg
      });

      toast.success(`Dimensions updated to ${dimensions.width} × ${dimensions.height}`);
    } catch (error) {
      console.error("Error applying custom dimensions:", error);
      toast.error("Failed to update SVG dimensions");
    }
  };

  // Toggle fill canvas setting
  const toggleFillCanvas = () => {
    setShouldFillCanvas(!shouldFillCanvas);
  };
  
  // Create a new project with the SVG
  const createNewProject = async () => {
    if (!svgData) return;
    
    try {
      setIsCreatingProject(true);
      
      // Process the SVG to ensure it's properly formatted
      const { processed } = svgNormalizer.fullyProcessSvg(svgData.svg);
      
      // Create a data object with the SVG content and metadata
      const projectData = {
        svg: processed,
        prompt: svgData.prompt,
        enhancedPrompt: svgData.enhancedPrompt
      };
      
      // Create a new project with the SVG data
      const project = storage.saveProject({
        name: `AI: ${prompt.substring(0, 20)}${prompt.length > 20 ? '...' : ''}`,
        json: JSON.stringify(projectData),
        width: 1080,
        height: 1080,
      });
      
      toast.success("New project created with AI SVG!");
      
      // Close the generator
      onClose();
      
      // Navigate to the editor with the new project
      router.push(`/editor/${project.id}`);
    } catch (error) {
      console.error("Error creating new project:", error);
      toast.error("Failed to create new project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Check if an SVG with this content exists in the library
  useEffect(() => {
    if (!svgData) return;

    const existingSvgs = svgStorage.getSVGs();
    const isDuplicate = existingSvgs.some(svg => svg.content === svgData.svg);
    setIsSaved(isDuplicate);
  }, [svgData]);

  // Helper function to render SVG status badge
  const renderStatusBadge = () => {
    if (!svgLoadingStatus) return null;

    let bgColor = "";
    let textColor = "";
    let text = "";
    let icon = null;

    switch (svgLoadingStatus) {
      case "success":
        bgColor = "bg-green-100 dark:bg-green-900/30";
        textColor = "text-green-700 dark:text-green-500";
        text = "Compatible";
        icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
        break;
      case "warning":
        bgColor = "bg-amber-100 dark:bg-amber-900/30";
        textColor = "text-amber-700 dark:text-amber-500";
        text = "Limited Compatibility";
        icon = <AlertTriangle className="h-3 w-3 mr-1" />;
        break;
      case "error":
        bgColor = "bg-red-100 dark:bg-red-900/30";
        textColor = "text-red-700 dark:text-red-500";
        text = "Error";
        icon = <X className="h-3 w-3 mr-1" />;
        break;
      case "loading":
        bgColor = "bg-blue-100 dark:bg-blue-900/30";
        textColor = "text-blue-700 dark:text-blue-500";
        text = "Checking...";
        icon = <Loader className="h-3 w-3 mr-1 animate-spin" />;
        break;
    }

    return (
      <span className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${bgColor} ${textColor}`}>
        {icon}
        {text}
      </span>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="p-4 pb-2 border-b bg-white dark:bg-slate-900">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">AI SVG Generator</h3>
            <p className="text-sm text-muted-foreground">Create custom vector graphics with AI</p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <ArrowLeft size={16} />
          </Button>
        </div>
      </div>

      <div className="p-5 pt-4 overflow-auto flex-1">
        {/* Input Section */}
        <div className="mb-5">
          <div className="space-y-3 mt-2">
            <Label htmlFor="prompt" className="font-medium text-sm">Describe the SVG you want to generate</Label>
            <Textarea
              id="prompt"
              placeholder="E.g., A mountain landscape with sunset and pine trees"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none border-slate-200 focus-visible:ring-blue-500 transition-all text-base"
              disabled={isGenerating}
            />

            {showOptions && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/70 rounded-lg space-y-3 mt-3 border border-slate-200 dark:border-slate-800">
                <div className="text-sm font-medium flex items-center">
                  <span>Advanced Options</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="width" className="text-xs mb-1 block">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      value={dimensions.width}
                      onChange={(e) => setDimensions({...dimensions, width: parseInt(e.target.value) || 1080})}
                      min={100}
                      max={4000}
                      className="border-slate-200 dark:border-slate-700 h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs mb-1 block">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      value={dimensions.height}
                      onChange={(e) => setDimensions({...dimensions, height: parseInt(e.target.value) || 1080})}
                      min={100}
                      max={4000}
                      className="border-slate-200 dark:border-slate-700 h-8"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div
                    role="checkbox"
                    aria-checked={shouldFillCanvas}
                    tabIndex={0}
                    className={`h-4 w-8 rounded-full p-0.5 cursor-pointer transition-colors ${shouldFillCanvas ? 'bg-blue-500' : 'bg-gray-300'}`}
                    onClick={toggleFillCanvas}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') toggleFillCanvas();
                    }}
                  >
                    <div className={`h-3 w-3 rounded-full bg-white transform transition-transform ${shouldFillCanvas ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <Label htmlFor="fill-canvas" className="text-xs">Scale to fill canvas when added</Label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyCustomDimensions}
                  disabled={!svgData}
                  className="w-full mt-1"
                >
                  Apply Dimensions
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={generateSVG}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate SVG
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowOptions(!showOptions)}
                title={showOptions ? "Hide options" : "Show options"}
                className="border-slate-200 dark:border-slate-700"
              >
                {showOptions ? <Minimize size={16} /> : <Maximize size={16} />}
              </Button>
              
              {svgLoadingStatus !== "success" && svgData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reprocessSVG}
                  disabled={isGenerating || svgLoadingStatus === "loading"}
                  className="flex-grow border-slate-200 dark:border-slate-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Fix SVG
                </Button>
              )}
            </div>
            
            {svgData && svgData.enhancedPrompt && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center">
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    Enhanced Prompt
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {svgData.enhancedPrompt}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SVG Output Area */}
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/90 dark:to-slate-900 p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center">
              <h3 className="text-sm font-medium">Generated SVG</h3>
              {svgData && renderStatusBadge()}
            </div>
            {svgData && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsBigPreview(prev => !prev)}
                  title={isBigPreview ? "Minimize preview" : "Maximize preview"}
                >
                  {isBigPreview ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </div>

          {/* SVG Preview Area */}
          {svgData ? (
            <div className={`bg-[url('/checkered-pattern.png')] bg-[length:16px_16px] flex items-center justify-center p-4 rounded-b-lg ${isBigPreview ? 'h-[400px]' : 'h-[240px]'}`}>
              <div
                className="w-full h-full overflow-hidden flex items-center justify-center relative bg-white rounded shadow-sm border border-slate-200 dark:border-slate-700"
                dangerouslySetInnerHTML={{
                  __html: svgData.svg.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet" ')
                }}
              />
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-slate-800 h-[240px] flex items-center justify-center rounded-b-lg">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 p-6 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm">
                  <div className="relative">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                    <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Creating your masterpiece...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 py-8 text-center bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm">
                  <div className="relative">
                    <Wand2 className="h-8 w-8 text-slate-300" />
                    <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-blue-400 opacity-50" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                    Describe what you want, and AI will generate an SVG for you
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {svgData && (
              <Button
                variant="default"
                onClick={addToCanvas}
                disabled={!svgData || isGenerating || isAddingToCanvas}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
              >
                {isAddingToCanvas ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding to Canvas...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add to Canvas
                  </>
                )}
              </Button>
            )}
            
            <div className="flex flex-wrap gap-2">
              {svgData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  disabled={!svgData || isGenerating}
                  className="flex-grow border-slate-200 dark:border-slate-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SVG Code
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-3 bg-white dark:bg-slate-900">
        {svgData ? (
          <>
            <Button
              variant="outline"
              onClick={saveToLibrary}
              className="flex-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              disabled={isGenerating || isSaved}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 size={16} className="mr-2 text-green-500" />
                  Saved to Library
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save to Library
                </>
              )}
            </Button>
            
            <Button
              variant="default"
              onClick={createNewProject}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
              disabled={isGenerating || isCreatingProject}
            >
              {isCreatingProject ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ExternalLink size={16} className="mr-2" />
                  Use this SVG
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center w-full text-sm text-slate-500 dark:text-slate-400 py-2">
            {isGenerating ?
              "Generating your SVG..." :
              "Enter a prompt and generate an SVG to see options"
            }
          </div>
        )}
      </div>
    </div>
  );
};