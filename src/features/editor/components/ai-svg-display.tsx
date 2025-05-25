import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fabric } from "fabric";
import { Project, storage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle, Save, BookmarkPlus, ExternalLink, Loader2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { svgStorage, svgNormalizer, svgCanvasUtils, svgTester, SVG_STORAGE_KEY, StoredSVG } from "@/lib/svg-utils";

interface AiSvgDisplayProps {
  editor: any;
  initialData: Project;
}

export const AiSvgDisplay = ({ 
  editor,
  initialData
}: AiSvgDisplayProps) => {
  const [svgData, setSvgData] = useState<{
    svg: string;
    prompt: string;
    enhancedPrompt: string;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const LINE_LIMIT = 12;

  const getPromptLines = (prompt: string) => {
    const lines = prompt.split('\n');
    return {
      limitedLines: lines.slice(0, LINE_LIMIT).join('\n'),
      hasMore: lines.length > LINE_LIMIT,
      totalLines: lines.length
    };
  };

  useEffect(() => {
    if (!editor || !initialData.json) return;
    
    try {
      // Try to parse the JSON to see if it contains SVG data
      const data = JSON.parse(initialData.json);
      
      if (!data || !data.svg || !data.prompt || !data.enhancedPrompt) return;
      
      // Store the SVG data
      setSvgData(data);
      
      // Check if this SVG is already saved in the library
      const svgs = svgStorage.getSVGs();
      const isSavedAlready = svgs.some(svg => svg.content.trim() === data.svg.trim());
      setIsSaved(isSavedAlready);
      
              // Ensure the SVG has proper attributes 
              let svgContent = data.svg.trim();
              
              try {
                // Apply full SVG processing pipeline to ensure all required attributes
                const { processed } = svgNormalizer.fullyProcessSvg(svgContent);
                svgContent = processed;
                
                // Update the SVG data with the fully processed version
                setSvgData(prev => prev ? { ...prev, svg: svgContent } : null);
              } catch (parseError) {
                console.warn("Error processing SVG, attempting fallback:", parseError);
                try {
                  // Parse and clean the SVG as a fallback
                  const parser = new DOMParser();
                  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                  
                  if (!svgDoc.querySelector('parsererror')) {
                    const svgElement = svgDoc.documentElement;
                    
                    // Essential attributes
                    if (!svgElement.hasAttribute('xmlns')) {
                      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    }
                    
                    if (!svgElement.hasAttribute('viewBox')) {
                      svgElement.setAttribute('viewBox', '0 0 1080 1080');
                    }
                    
                    // Ensure all path and shape elements have fill attributes if missing
                    const elements = svgElement.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon');
                    elements.forEach(el => {
                      if (!el.hasAttribute('fill') && !el.hasAttribute('style')) {
                        el.setAttribute('fill', '#000000'); // Set a default black fill
                      }
                    });
                    
                    // Convert back to string
                    const serializer = new XMLSerializer();
                    svgContent = serializer.serializeToString(svgElement);
                    
                    // Update the SVG data with the cleaned version
                    setSvgData(prev => prev ? { ...prev, svg: svgContent } : null);
                  }
                } catch (secondError) {
                  console.error("Critical error parsing SVG:", secondError);
                }
              }
        
      try {
        fabric.loadSVGFromString(svgContent, (objects, options) => {
          try {
            // Create a group containing all the objects
            if (!objects || objects.length === 0) {
              console.warn("No SVG objects found to add to canvas");
              return;
            }
            
            const svgGroup = new fabric.Group(objects);
            
            // Scale to fit inside the canvas
            const canvasWidth = editor.canvas.getWidth();
            const canvasHeight = editor.canvas.getHeight();
            
            const groupWidth = svgGroup.width || 100;
            const groupHeight = svgGroup.height || 100;
            
            const scale = Math.min(
              (canvasWidth - 100) / groupWidth,
              (canvasHeight - 100) / groupHeight
            );
            
            svgGroup.scale(scale);
            
            // Center the object
            svgGroup.set({
              left: canvasWidth / 2,
              top: canvasHeight / 2,
              originX: 'center',
              originY: 'center'
            });
            
            // Add to canvas
            editor.canvas.add(svgGroup);
            editor.canvas.renderAll();
          } catch (groupError) {
            console.error("Error creating SVG group:", groupError);
          }
        });
      } catch (svgLoadError) {
        console.error("Error loading SVG into fabric:", svgLoadError);
      }
    } catch (error) {
      console.error("Error loading SVG data:", error);
    }
  }, [editor, initialData.json]);
  
  const saveToLibrary = async () => {
    if (!svgData) return;
    
    try {
      // Use the centralized SVG normalizer to process the SVG
      const { processed, dataUrl } = svgNormalizer.fullyProcessSvg(svgData.svg);
      
      // Create a name from the prompt
      const name = `AI: ${svgData.prompt.substring(0, 20)}${svgData.prompt.length > 20 ? '...' : ''}`;
      
      // Test if the SVG can be loaded by Fabric.js before saving
      const canLoad = await svgTester.testWithFabric(processed);
      
      if (!canLoad) {
        console.warn("SVG failed fabric.js loading test, applying additional processing");
        // Apply more aggressive cleaning if needed
        const fallbackSvg = svgTester.getFallbackVersion(processed);
        const { processed: finalProcessed, dataUrl: finalDataUrl } = svgNormalizer.fullyProcessSvg(fallbackSvg);
        
        // Save the fallback version
        svgStorage.saveSVG(finalProcessed, name, finalDataUrl);
        
        // Update the SVG data with the fallback version
        setSvgData({
          ...svgData,
          svg: finalProcessed
        });
      } else {
        // Save the normally processed version
        svgStorage.saveSVG(processed, name, dataUrl);
        
        // Update the SVG data with the processed version
        setSvgData({
          ...svgData,
          svg: processed
        });
      }
      
      // Update state
      setIsSaved(true);
      
      toast.success('SVG saved to your library! Find it in the SVG sidebar.');
    } catch (error) {
      console.error("Error saving SVG to library:", error);
      toast.error('Failed to save SVG to library');
    }
  };
  
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
        name: `AI: ${svgData.prompt.substring(0, 20)}${svgData.prompt.length > 20 ? '...' : ''}`,
        json: JSON.stringify(projectData),
        width: 1080,
        height: 1080,
      });
      
      toast.success("New project created with AI SVG!");
      
      // Close the display before navigation to prevent any state issues
      setIsOpen(false);
      
      // Add a short delay before navigating to ensure the component unmounts properly
      setTimeout(() => {
        // Navigate to the editor with the new project
        router.push(`/editor/${project.id}`);
      }, 100); 
    } catch (error) {
      console.error("Error creating new project:", error);
      toast.error("Failed to create new project");
    } finally {
      setIsCreatingProject(false);
    }
  };
  
  if (!svgData) {
    return null;
  }
  
  const enhancedPromptData = getPromptLines(svgData.enhancedPrompt);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          variant="default"
          className="rounded-lg shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <BookmarkPlus className="h-4 w-4 mr-2" />
          Show AI SVG
        </Button>
      </div>
    );
  }
  
  return (
    <div className={`fixed ${isExpanded ? 'inset-4' : 'bottom-6 right-6 w-[480px]'} z-50 transition-all duration-300 ease-in-out`}>
      <Card className="bg-white dark:bg-slate-900 shadow-2xl border-2 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold">AI Generated SVG</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="icon" 
              title="Toggle Size"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline"
              size="icon" 
              title="Save to SVG Library"
              onClick={saveToLibrary}
              disabled={isSaved}
            >
              <BookmarkPlus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Prompt Display */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Original Prompt</h4>
                <p className="mt-1 text-sm font-medium">{svgData.prompt}</p>
              </div>

            </div>
          </div>

          {/* Preview Section */}
          <div className="p-4">
            <div 
              ref={previewRef}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-4 flex justify-center items-center"
              style={{ height: isExpanded ? "60vh" : "240px" }}
            >
              <div 
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                dangerouslySetInnerHTML={{ 
                  __html: svgData.svg.startsWith('<svg') ? 
                    svgData.svg.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet" ') :
                    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="100%" height="100%">
                      <text x="50%" y="50%" font-family="Arial" text-anchor="middle" fill="red">Invalid SVG</text>
                    </svg>`
                }}
              />
            </div>
          </div>

          {/* SVG Code Section */}
          <div className="px-4 pb-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">SVG Code</h4>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg max-h-40 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap break-all">
                  {svgData.svg}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="space-y-2">
            <Button 
              variant="default" 
              size="lg" 
              className="w-full"
              onClick={createNewProject}
              disabled={isCreatingProject}
            >
              {isCreatingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Use this SVG
                </>
              )}
            </Button>

            {!isSaved && (
              <Button 
                variant="outline" 
                size="lg"
                className="w-full"
                onClick={saveToLibrary}
              >
                <BookmarkPlus className="h-4 w-4 mr-2" />
                Save to SVG Library
              </Button>
            )}
          </div>

          {/* Success Message */}
          {isSaved && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center text-green-600 dark:text-green-400">
                <Save className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Saved to your SVG library</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
