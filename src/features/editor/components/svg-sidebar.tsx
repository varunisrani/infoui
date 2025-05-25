"use client";

import { useState, useCallback, useEffect } from "react";
import { FileType, Upload, Trash2, PanelRight, Trash } from "lucide-react";
import { fabric } from "fabric";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { svgCanvasUtils, svgNormalizer, svgStorage, svgTester, SVG_STORAGE_KEY, StoredSVG } from "@/lib/svg-utils";
import { SvgRenderer } from "@/features/editor/components/svg-renderer";
import { Button } from "@/components/ui/button";

// Sample SVG templates
export const SVG_TEMPLATES = [
  {
    id: 'template-1',
    name: 'Arrow',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
  },
  {
    id: 'template-2',
    name: 'Circle',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`
  },
  {
    id: 'template-3',
    name: 'Heart',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`
  },
  {
    id: 'template-4',
    name: 'Star',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
  },
  {
    id: 'template-5',
    name: 'Check',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
  },
  {
    id: 'template-6',
    name: 'Testimonial',
    content: `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <!-- Cream background -->
  <rect width="1080" height="1080" fill="#FFF5DC"/>

  <!-- Top quotation mark -->
  <text x="540" y="150" font-family="Instrument Serif" font-size="180" fill="#000000" text-anchor="middle">
    "
  </text>

  <!-- Title -->
  <text x="540" y="300" font-family="Instrument Serif" font-size="130" fill="#000000" text-anchor="middle">
    Testimonial
  </text>

  <!-- Testimonial text with rounded rectangle -->
  <g transform="translate(540, 600)">
    <rect x="-350" y="-40" width="700" height="200" rx="30" fill="#FFF5DC" stroke="#000000" stroke-width="2"/>

    <text x="0" y="-10" font-family="Economica" font-size="32" fill="#000000" text-anchor="middle" line-height="1.5">
      <tspan x="0" dy="0">We couldn't be happier with the</tspan>
      <tspan x="0" dy="45">outstanding service provided by</tspan>
      <tspan x="0" dy="45">Weblake Company. Their</tspan>
      <tspan x="0" dy="45">professionalism and attention to</tspan>
      <tspan x="0" dy="45">detail surpassed our</tspan>
      <tspan x="0" dy="45">expectations..</tspan>
    </text>
  </g>

  <!-- Author name -->
  <text x="540" y="850" font-family="Instrument Serif" font-size="32" fill="#000000" text-anchor="middle">
    - Linda Brown -
  </text>

  <!-- Bottom black bar with website -->
  <rect x="210" y="950" width="660" height="50" rx="25" fill="#000000"/>
  <text x="540" y="985" font-family="Instrument Serif" font-size="24" fill="#FFFFFF" text-anchor="middle">
    a.barnescopy.site.com
  </text>

  <!-- Bottom quotation mark -->
  <text x="540" y="1025" font-family="Instrument Serif" font-size="180" fill="#000000" text-anchor="middle">
    "
  </text>
</svg>`
  },
  {
    id: 'template-7',
    name: 'Coming Soon',
    content: `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <!-- Background -->
    <rect width="1080" height="1080" fill="#ECD8B7"/>

    <!-- Text: COMING -->
    <text x="540" y="350"
          font-family="Poppins"
          font-size="130"
          fill="#000000"
          text-anchor="middle"
          font-weight="700">
        COMING
    </text>

    <!-- Text: SOON -->
    <text x="540" y="460"
          font-family="Poppins"
          font-size="120"
          fill="#000000"
          text-anchor="middle"
          font-weight="700">
        SOON
    </text>

    <!-- STAY TUNED -->
    <text x="540" y="525"
          font-family="Nunito"
          font-size="30"
          fill="#000000"
          text-anchor="middle"
          font-weight="800">
        STAY TUNED
    </text>

    <!-- Website URL -->
    <text x="540" y="850"
          font-family="Raleway"
          font-size="24"
          fill="#000000"
          text-anchor="middle"
          font-weight="400">
        www.yourwebsite.com
    </text>
</svg>`
  },
];

interface SvgSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const SvgSidebar = ({ editor, activeTool, onChangeActiveTool }: SvgSidebarProps) => {
  // State for tracking SVGs with rendering errors
  const [svgErrors, setSvgErrors] = useState<Record<string, boolean>>({});
  // Get all SVGs
  const [svgs, setSvgs] = useState<StoredSVG[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to refresh SVGs
  const refreshSvgs = useCallback(() => {
    try {
      const loadedSvgs = svgStorage.getSVGs();
      console.log(`Loaded ${loadedSvgs.length} SVGs from storage`);
      setSvgs(loadedSvgs);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading SVGs:", error);
      setIsLoading(false);
    }
  }, []);

  // Add SVG to canvas
  const addSVGToCanvas = useCallback(async (svg: StoredSVG) => {
    try {
      // Try editor prop first, then fall back to window.canvasState
      const canvas = editor?.canvas || window.canvasState?.canvas;

      if (!canvas) {
        toast.error("Canvas not initialized");
        return;
      }

      // Process the SVG content again to ensure it's properly formatted
      // This is important for AI-generated SVGs that might need additional processing
      const { processed } = svgNormalizer.fullyProcessSvg(svg.content);

      // Try to add SVG to canvas using the utility
      const result = await svgCanvasUtils.addSvgToCanvas(canvas, processed);

      if (!result) {
        console.warn('Primary SVG loading failed, trying fallback...');
        // Try fallback method
        const fallbackResult = await svgCanvasUtils.addSvgAsImageFallback(
          canvas,
          processed,
          svg.name
        );

        if (!fallbackResult) {
          throw new Error('Failed to add SVG to canvas');
        }
      }

      toast.success(`${svg.name} added to canvas`);
    } catch (error) {
      console.error('Error adding SVG to canvas:', error);
      toast.error("Failed to add SVG to canvas");
    }
  }, [editor]);

  // Add template SVG to canvas
  const addTemplateSVG = useCallback(async (template: typeof SVG_TEMPLATES[0]) => {
    try {
      // Try editor prop first, then fall back to window.canvasState
      const canvas = editor?.canvas || window.canvasState?.canvas;

      if (!canvas) {
        toast.error("Canvas not initialized");
        return;
      }

      // Process the SVG content to ensure it's properly formatted
      const { processed } = svgNormalizer.fullyProcessSvg(template.content);

      // Use our improved SVG loading method
      const result = await svgCanvasUtils.addSvgToCanvas(canvas, processed);

      if (!result) {
        console.warn('Primary SVG loading failed, trying fallback...');
        // Try fallback method
        const fallbackResult = await svgCanvasUtils.addSvgAsImageFallback(
          canvas,
          processed,
          template.name
        );

        if (!fallbackResult) {
          throw new Error('Failed to add template SVG to canvas');
        }
      }

      toast.success(`${template.name} added to canvas`);
    } catch (error) {
      console.error("Error adding template SVG to canvas:", error);
      toast.error('Failed to add template SVG to canvas');
    }
  }, [editor]);

  // Handle SVG rendering errors
  const handleSvgError = useCallback((svgId: string, error: Error) => {
    console.error(`Error rendering SVG ${svgId}:`, error);
    setSvgErrors(prev => ({
      ...prev,
      [svgId]: true
    }));
  }, []);

  // Delete SVG from storage
  const deleteSVGFromStorage = useCallback((id: string) => {
    try {
      svgStorage.deleteSVG(id);
      setSvgErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
      toast.success("SVG deleted from library");
    } catch (error) {
      console.error("Error deleting SVG:", error);
      toast.error("Failed to delete SVG");
    }
  }, []);

  // Load SVGs on mount and refresh when needed
  useEffect(() => {
    setIsLoading(true);
    refreshSvgs();

    // Setup storage event listener to refresh when SVGs change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SVG_STORAGE_KEY) {
        refreshSvgs();
      }
    };

    // Set up a custom event for communicating SVG changes across components
    const handleCustomEvent = () => {
      refreshSvgs();
    };

    // Create a more reliable detection mechanism for SVG updates
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('svg-library-updated', handleCustomEvent);
    
    // Force refresh when the sidebar becomes visible
    if (activeTool === "svg") {
      refreshSvgs();
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('svg-library-updated', handleCustomEvent);
    };
  }, [refreshSvgs, activeTool]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  // Handle SVG file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error("File size exceeds 1MB limit");
      return;
    }

    // Check file type
    if (!file.type.includes('svg')) {
      toast.error("Only SVG files are allowed");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const svgContent = e.target?.result as string;
        if (!svgContent) {
          throw new Error("Failed to read SVG file");
        }

        // Process SVG before saving
        const { processed, dataUrl } = svgNormalizer.fullyProcessSvg(svgContent);
        
        // Test if the SVG can be loaded by Fabric.js before saving
        const canLoad = await svgTester.testWithFabric(processed);
        const name = file.name.replace('.svg', '');
        
        if (!canLoad) {
          console.warn("SVG failed fabric.js loading test, applying additional processing");
          // Apply more aggressive cleaning if needed
          const fallbackSvg = svgTester.getFallbackVersion(processed);
          const { processed: finalProcessed, dataUrl: finalDataUrl } = svgNormalizer.fullyProcessSvg(fallbackSvg);
          
          // Save the fallback version
          const newSvg = svgStorage.saveSVG(finalProcessed, name, finalDataUrl);
          console.log("Saved new SVG (with fallback processing):", newSvg);
        } else {
          // Save to library with normal processing
          const newSvg = svgStorage.saveSVG(processed, name, dataUrl);
          console.log("Saved new SVG:", newSvg);
        }

        // Update SVGs list
        setSvgs(svgStorage.getSVGs());

        toast.success("SVG uploaded successfully!");
      } catch (error) {
        console.error("Error processing uploaded SVG:", error);
        toast.error("Failed to process SVG file");
      }
    };

    reader.onerror = () => {
      toast.error("Error reading file");
    };

    reader.readAsText(file);

    // Reset the input
    event.target.value = '';
  }, []);

  // Clean up URL objects when component unmounts
  useEffect(() => {
    return () => {
      // Revoke object URLs to prevent memory leaks
      svgs.forEach(svg => {
        if (svg.dataUrl && svg.dataUrl.startsWith('blob:')) {
          URL.revokeObjectURL(svg.dataUrl);
        }
      });
    };
  }, [svgs]);

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "svg" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="SVG Library" description="Add SVGs to your design" />

      {/* SVG Upload Section */}
      <div className="p-4 border-b">
        <Label htmlFor="svg-upload" className="cursor-pointer w-full">
          <div className="flex items-center justify-center w-full h-10 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            <Upload className="h-4 w-4 mr-2" />
            Upload SVG
          </div>
        </Label>
        <input
          id="svg-upload"
          type="file"
          className="hidden"
          accept=".svg,image/svg+xml"
          onChange={handleFileUpload}
        />
        <p className="text-xs text-muted-foreground text-center mt-1">
          Max 1MB · SVG files only
        </p>
      </div>

      <ScrollArea className="flex-1">
        {/* Your SVGs Section */}
        <div className="p-4 border-b">
          <h3 className="font-medium mb-4">Your SVGs</h3>

          {isLoading ? (
            <div className="flex flex-col gap-y-4 items-center justify-center py-8">
              <p className="text-muted-foreground text-sm">Loading SVGs...</p>
            </div>
          ) : svgs.length === 0 ? (
            <div className="flex flex-col gap-y-4 items-center justify-center py-8">
              <FileType className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No SVGs in your library</p>
              <p className="text-xs text-muted-foreground text-center max-w-[250px]">
                Upload SVGs or save them from the AI SVG generator
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {svgs.map((svg) => (
                <div
                  key={svg.id}
                  className="aspect-square bg-muted rounded-md flex items-center justify-center cursor-pointer group relative"
                  onClick={() => addSVGToCanvas(svg)}
                  draggable
                  onDragStart={(e) => {
                    // Clear any existing data
                    localStorage.removeItem('dragging_svg_data');
                    
                    // Create a truly unique key for this drag operation
                    const timestamp = Date.now();
                    const randomVal = Math.floor(Math.random() * 100000);
                    const dragKey = `svg-${svg.id}-${timestamp}-${randomVal}`;
                    
                    // Set the SVG ID as plain text for compatibility
                    e.dataTransfer.setData('text/plain', svg.id);
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      id: svg.id,
                      dragKey
                    }));
                    
                    // Process the SVG content to ensure it's properly formatted for drag and drop
                    const { processed } = svgNormalizer.fullyProcessSvg(svg.content);
                    
                    // Store the full SVG data for direct access with processed content
                    const svgData = {
                      id: svg.id,
                      content: processed, // Use the processed content
                      name: svg.name,
                      type: 'library-svg',
                      dragKey // Add drag key for uniqueness
                    };
                    localStorage.setItem('dragging_svg_data', JSON.stringify(svgData));
                    
                    // Set drag image if browser supports it
                    if (e.dataTransfer.setDragImage) {
                      const dragPreview = document.createElement('div');
                      dragPreview.innerHTML = processed; // Use processed SVG for preview
                      dragPreview.style.width = '100px';
                      dragPreview.style.height = '100px';
                      dragPreview.style.position = 'absolute';
                      dragPreview.style.top = '-1000px';
                      dragPreview.style.background = 'white';
                      dragPreview.style.padding = '10px';
                      dragPreview.style.borderRadius = '4px';
                      dragPreview.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                      document.body.appendChild(dragPreview);
                      
                      e.dataTransfer.setDragImage(dragPreview, 50, 50);
                      
                      // Remove the element after drag starts
                      setTimeout(() => {
                        document.body.removeChild(dragPreview);
                      }, 0);
                    }
                    
                    // Add a class to the body to indicate dragging
                    document.body.classList.add('svg-dragging');
                  }}
                  onDragEnd={() => {
                    // Clean up
                    document.body.classList.remove('svg-dragging');
                    localStorage.removeItem('dragging_svg_data');
                  }}
                >
                  <div className="relative w-full h-full flex items-center justify-center p-2">
                    <SvgRenderer
                      svgContent={svg.content}
                      width={80}
                      height={80}
                      preserveAspectRatio="xMidYMid meet"
                      className="w-full h-full"
                      onError={(error) => handleSvgError(svg.id, error)}
                      fallback={
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-md">
                          <div className="text-center p-1">
                            <span className="text-slate-500 text-xs">SVG Preview</span>
                          </div>
                        </div>
                      }
                    />

                    {/* Error indicator */}
                    {svgErrors[svg.id] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-100/80 rounded-md">
                        <div className="text-center p-1">
                          <span className="text-red-500 text-xs">Error loading SVG</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="absolute left-0 bottom-0 w-full text-[10px] truncate text-white p-1 bg-black/50 text-left">
                    {svg.name}
                  </div>

                  <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSVGFromStorage(svg.id);
                      }}
                      className="bg-white rounded-full p-1 shadow-sm hover:bg-red-50 transition-colors"
                    >
                      <Trash className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Template SVGs Section */}
        <div className="p-4">
          <h3 className="font-medium mb-4">Template SVGs</h3>

          <div className="grid grid-cols-2 gap-4">
            {SVG_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="aspect-square bg-muted rounded-md flex items-center justify-center cursor-pointer group relative"
                onClick={() => addTemplateSVG(template)}
                draggable
                onDragStart={(e) => {
                  // Clear any existing data
                  localStorage.removeItem('dragging_svg_data');
                  
                  // Create a truly unique key for this drag operation
                  const timestamp = Date.now();
                  const randomVal = Math.floor(Math.random() * 100000);
                  const dragKey = `template-${template.id}-${timestamp}-${randomVal}`;
                  
                  // Set the template ID as plain text for compatibility
                  e.dataTransfer.setData('text/plain', template.id);
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    id: template.id,
                    dragKey
                  }));
                  
                  // Process the SVG content to ensure it's properly formatted for drag and drop
                  const { processed } = svgNormalizer.fullyProcessSvg(template.content);
                  
                  // Store the full SVG data for direct access with processed content
                  const tempSvg = {
                    id: template.id,
                    content: processed, // Use the processed content
                    name: template.name,
                    type: 'template-svg',
                    createdAt: new Date().toISOString(),
                    preview: '',
                    dragKey // Add drag key for uniqueness
                  };
                  localStorage.setItem('dragging_svg_data', JSON.stringify(tempSvg));
                  
                  // Set drag image if browser supports it
                  if (e.dataTransfer.setDragImage) {
                    const dragPreview = document.createElement('div');
                    dragPreview.innerHTML = processed; // Use processed SVG for preview
                    dragPreview.style.width = '100px';
                    dragPreview.style.height = '100px';
                    dragPreview.style.position = 'absolute';
                    dragPreview.style.top = '-1000px';
                    dragPreview.style.background = 'white';
                    dragPreview.style.padding = '10px';
                    dragPreview.style.borderRadius = '4px';
                    dragPreview.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                    document.body.appendChild(dragPreview);
                    
                    e.dataTransfer.setDragImage(dragPreview, 50, 50);
                    
                    // Remove the element after drag starts
                    setTimeout(() => {
                      document.body.removeChild(dragPreview);
                    }, 0);
                  }
                  
                  // Add a class to the body to indicate dragging
                  document.body.classList.add('svg-dragging');
                }}
                onDragEnd={() => {
                  // Clean up
                  document.body.classList.remove('svg-dragging');
                  localStorage.removeItem('dragging_svg_data');
                }}
              >
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  <SvgRenderer
                    svgContent={template.content}
                    width={80}
                    height={80}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full"
                    onError={(error) => console.error(`Error rendering template ${template.id}:`, error)}
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-md">
                        <div className="text-center p-1">
                          <span className="text-slate-500 text-xs">Template Preview</span>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="absolute left-0 bottom-0 w-full text-[10px] truncate text-white p-1 bg-black/50">
                  {template.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
