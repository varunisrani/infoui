"use client";

import { fabric } from "fabric";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useUpdateProject } from "@/features/projects/api/use-projects";
import { Project, storage } from "@/lib/storage";
import { svgCanvasUtils, svgNormalizer } from "@/lib/svg-utils";
import { AlignmentGuidelines } from "@/lib/alignment-guidelines";

import { 
  ActiveTool, 
  selectionDependentTools
} from "@/features/editor/types";
import { SVG_TEMPLATES } from "@/features/editor/components/svg-sidebar";
import { Navbar } from "@/features/editor/components/navbar";
import { Footer } from "@/features/editor/components/footer";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { Sidebar } from "@/features/editor/components/sidebar";
import { Toolbar } from "@/features/editor/components/toolbar";
import { ShapeSidebar } from "@/features/editor/components/shape-sidebar";
import { FillColorSidebar } from "@/features/editor/components/fill-color-sidebar";
import { StrokeColorSidebar } from "@/features/editor/components/stroke-color-sidebar";
import { StrokeWidthSidebar } from "@/features/editor/components/stroke-width-sidebar";
import { OpacitySidebar } from "@/features/editor/components/opacity-sidebar";
import { TextSidebar } from "@/features/editor/components/text-sidebar";
import { FontSidebar } from "@/features/editor/components/font-sidebar";
import { ImageSidebar } from "@/features/editor/components/image-sidebar";
import { SvgSidebar } from "@/features/editor/components/svg-sidebar";
import { FilterSidebar } from "@/features/editor/components/filter-sidebar";
import { DrawSidebar } from "@/features/editor/components/draw-sidebar";
import { AiSidebar } from "@/features/editor/components/ai-sidebar";
import { TemplateSidebar } from "@/features/editor/components/template-sidebar";
import { RemoveBgSidebar } from "@/features/editor/components/remove-bg-sidebar";
import { SettingsSidebar } from "@/features/editor/components/settings-sidebar";
import { AiSvgDisplay } from "@/features/editor/components/ai-svg-display";

// Extend Window interface to include canvasState
declare global {
  interface Window {
    canvasState?: {
      canvas: fabric.Canvas;
    };
  }
}

interface EditorProps {
  initialData: Project;
};

export const Editor = ({ initialData }: EditorProps) => {
  const { mutate } = useUpdateProject(initialData.id);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(
      (values: { 
        json: string,
        height: number,
        width: number,
      }) => {
        mutate(values);
    },
    500
  ), [mutate]);

  const [activeTool, setActiveTool] = useState<ActiveTool>("select");

  const onClearSelection = useCallback(() => {
    if (selectionDependentTools.includes(activeTool)) {
      setActiveTool("select");
    }
  }, [activeTool]);

  const { init, editor } = useEditor({
    defaultState: initialData.json,
    defaultWidth: initialData.width || 1080,
    defaultHeight: initialData.height || 1080,
    clearSelectionCallback: onClearSelection,
    saveCallback: debouncedSave,
  });

  const onChangeActiveTool = useCallback((tool: ActiveTool) => {
    if (tool === "draw") {
      editor?.enableDrawingMode();
    }

    if (activeTool === "draw") {
      editor?.disableDrawingMode();
    }

    if (tool === activeTool) {
      return setActiveTool("select");
    }
    
    setActiveTool(tool);
  }, [activeTool, editor]);

  const canvasRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const alignmentGuidelinesRef = useRef<AlignmentGuidelines | null>(null);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      controlsAboveOverlay: true,
      preserveObjectStacking: true,
      backgroundColor: 'white', // Set background color explicitly
    });

    // Initialize alignment guidelines
    alignmentGuidelinesRef.current = new AlignmentGuidelines(canvas, {
      snapToCenter: true,
      snapToEdges: true,
      threshold: 5,
      lineColor: 'rgba(255, 0, 128, 0.75)',
      lineWidth: 1
    });

    // Store canvas in window for easy access by components
    if (typeof window !== 'undefined') {
      window.canvasState = { canvas };
    }

    init({
      initialCanvas: canvas,
      initialContainer: containerRef.current!,
    });

    return () => {
      // Clean up alignment guidelines
      alignmentGuidelinesRef.current?.destroy();
      
      // Clean up global state reference
      if (typeof window !== 'undefined') {
        window.canvasState = undefined;
      }
      canvas.dispose();
    };
  }, [init]);

  // Setup drag and drop handlers for SVGs
  useEffect(() => {
    if (!containerRef.current || !editor) return;
    
    const container = containerRef.current;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
      
      // Check if we're dragging an SVG
      const isDraggingSvg = document.body.classList.contains('svg-dragging');
      
      // Add visual indicator for drop target
      container.classList.add('canvas-drop-target');
      
      // Add a more prominent visual indicator for drop target when dragging SVG
      if (isDraggingSvg) {
        container.classList.add('svg-dragging-over');
      } else {
        container.classList.add('bg-blue-100');
      }
    };
    
    const handleDragLeave = () => {
      // Remove all visual indicators
      container.classList.remove('bg-blue-100');
      container.classList.remove('svg-dragging-over');
      container.classList.remove('canvas-drop-target');
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      
      // Remove all visual indicators
      container.classList.remove('bg-blue-100');
      container.classList.remove('svg-dragging-over');
      container.classList.remove('canvas-drop-target');
      
      // First check if we have direct SVG data from dragging
      const draggingSvgData = localStorage.getItem('dragging_svg_data');
      let svg = null;
      
      if (draggingSvgData) {
        try {
          // Use the direct SVG data that was stored during drag start
          svg = JSON.parse(draggingSvgData);
          
          // Verify the dragKey exists
          if (!svg.dragKey) {
            console.warn("Missing dragKey in SVG data, continuing with available data");
          }
          
          console.log(`Using direct SVG data from drag operation: ${svg.name} (dragKey: ${svg.dragKey})`);
        } catch (error) {
          console.error("Error parsing dragging SVG data:", error);
        }
      }
      
      // If we don't have direct data, try the traditional approach
      if (!svg) {
        // Get the SVG ID from the drag data
        const svgId = e.dataTransfer!.getData('text/plain');
        
        if (!svgId) return;
        
        // Get the stored SVGs from localStorage
        const STORAGE_KEY = 'canvas_svgs';
        const svgsJson = localStorage.getItem(STORAGE_KEY);
        
        if (!svgsJson) return;
        
        try {
          const svgs = JSON.parse(svgsJson);
          svg = svgs.find((s: any) => s.id === svgId);
          
          // Also check template SVGs if not found in library
          if (!svg) {
            // Check if it's a template SVG
            const isTemplateId = SVG_TEMPLATES.some(t => t.id === svgId);
            if (isTemplateId) {
              const template = SVG_TEMPLATES.find(t => t.id === svgId);
              if (template) {
                svg = {
                  id: template.id,
                  content: template.content,
                  name: template.name
                };
              }
            }
          }
        } catch (error) {
          console.error("Error finding SVG in storage:", error);
        }
      }
      
      if (!svg) {
        console.error("Could not find SVG data for drop operation");
        return;
      }
      
      try {
        // Ensure we have valid content property
        if (!svg.content && svg.data) {
          // Some SVGs might be stored with 'data' property instead of 'content'
          svg.content = svg.data;
        }
        
        if (!svg.content) {
          console.error("SVG content is missing");
          toast.error('Invalid SVG data');
          return;
        }
        
        // Re-normalize the SVG content to ensure it's properly formatted
        // This is important because localStorage might truncate or modify data
        const { processed } = svgNormalizer.fullyProcessSvg(svg.content);
        
        // Log the SVG content for debugging
        console.log(`Processing SVG for drop: ${svg.name} (dragKey: ${svg.dragKey})`);
        
        // Calculate position based on drop location
        const canvasOffset = container.getBoundingClientRect();
        const dropX = e.clientX - canvasOffset.left;
        const dropY = e.clientY - canvasOffset.top;
        
        // Convert drop position to canvas coordinates
        const zoom = editor.canvas.getZoom();
        const viewportLeft = editor.canvas.viewportTransform?.[4] || 0;
        const viewportTop = editor.canvas.viewportTransform?.[5] || 0;
        
        // Calculate position within the canvas accounting for zoom and pan
        const canvasX = (dropX - viewportLeft) / zoom;
        const canvasY = (dropY - viewportTop) / zoom;
        
        // Use the same SVG loading mechanism as in the SVG sidebar
        svgCanvasUtils.addSvgToCanvas(editor.canvas, processed)
          .then(result => {
            if (result) {
              // Get the added object (should be the active object)
              const addedObject = editor.canvas.getActiveObject();
              if (addedObject) {
                // Move to drop position
                addedObject.set({
                  left: canvasX,
                  top: canvasY,
                  originX: 'center',
                  originY: 'center'
                });
                
                // Scale if necessary
                const maxDimension = 300; // Maximum dimension we want for the dropped SVG
                const objectWidth = addedObject.width || 100;
                const objectHeight = addedObject.height || 100;
                
                if (objectWidth > maxDimension || objectHeight > maxDimension) {
                  const scale = maxDimension / Math.max(objectWidth, objectHeight);
                  addedObject.scale(scale);
                }
                
                editor.canvas.renderAll();
                
                // Show success toast
                toast.success(`${svg.name || 'SVG'} added to canvas`);
              }
            } else {
              // Try fallback method if primary method fails
              console.warn('Primary SVG loading failed, trying fallback...');
              return svgCanvasUtils.addSvgAsImageFallback(
                editor.canvas,
                processed,
                svg.name || 'Untitled SVG'
              );
            }
          })
          .then(fallbackResult => {
            if (fallbackResult) {
              // Get the added object (should be the active object)
              const addedObject = editor.canvas.getActiveObject();
              if (addedObject) {
                // Move to drop position
                addedObject.set({
                  left: canvasX,
                  top: canvasY,
                  originX: 'center',
                  originY: 'center'
                });
                
                editor.canvas.renderAll();
                
                // Show success toast for fallback method
                toast.success(`${svg.name || 'SVG'} added to canvas (as image)`);
              }
            }
          })
          .catch(error => {
            console.error('Error adding SVG to canvas:', error);
            toast.error('Failed to add SVG to canvas');
          });
      } catch (error) {
        console.error("Error processing dropped SVG:", error);
        toast.error('Failed to process SVG');
      }
    };
    
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
    
    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, [editor]);

  return (
    <div className="h-full flex flex-col">
      <Navbar
        id={initialData.id}
        editor={editor}
        activeTool={activeTool}
        onChangeActiveTool={onChangeActiveTool}
      />
      <div className="absolute h-[calc(100%-68px)] w-full top-[68px] flex">
        <Sidebar
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <ShapeSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <FillColorSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <StrokeColorSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <StrokeWidthSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <OpacitySidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <TextSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <FontSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <ImageSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <SvgSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <TemplateSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
          onClose={() => onChangeActiveTool("select")}
        />
        <FilterSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        {activeTool === "ai" && (
          <AiSidebar
            editor={editor}
            onClose={() => setActiveTool("select")}
          />
        )}
        <RemoveBgSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <DrawSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <SettingsSidebar
          editor={editor}
          activeTool={activeTool}
          onChangeActiveTool={onChangeActiveTool}
        />
        <main className="bg-muted flex-1 overflow-auto relative flex flex-col">
          <Toolbar
            editor={editor}
            activeTool={activeTool}
            onChangeActiveTool={onChangeActiveTool}
            key={JSON.stringify(editor?.canvas.getActiveObject())}
          />
          <div className="flex-1 h-[calc(100%-124px)] bg-muted" ref={containerRef}>
            <canvas ref={canvasRef} />
            <AiSvgDisplay editor={editor} initialData={initialData} />
          </div>
          <Footer editor={editor} />
        </main>
      </div>
    </div>
  );
};
