"use client";

import { useState, useCallback, useEffect } from "react";
import { FileType, Upload, Trash2 } from "lucide-react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Interface for stored SVGs
interface StoredSVG {
  id: string;
  content: string;
  name: string;
  createdAt: string;
  preview: string;
}

// LocalStorage key for SVGs
const STORAGE_KEY = 'canvas_svgs';

// Helper functions for localStorage SVGs
const svgStorage = {
  getSVGs: (): StoredSVG[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveSVG: (svgContent: string, name: string, preview: string): StoredSVG => {
    const svgs = svgStorage.getSVGs();
    const newSVG = {
      id: crypto.randomUUID(),
      content: svgContent,
      name: name,
      createdAt: new Date().toISOString(),
      preview: preview
    };
    
    svgs.push(newSVG);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(svgs));
    return newSVG;
  },
  
  deleteSVG: (id: string): void => {
    const svgs = svgStorage.getSVGs();
    const filtered = svgs.filter(svg => svg.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};

// Sample SVG templates
const SVG_TEMPLATES = [
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
  const [svgs, setSvgs] = useState<StoredSVG[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load SVGs from localStorage
  useEffect(() => {
    if (activeTool === "svg") {
      setIsLoading(true);
      const storedSVGs = svgStorage.getSVGs();
      setSvgs(storedSVGs);
      setIsLoading(false);
    }
  }, [activeTool]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  // Handle SVG file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    
    // Check if file is an SVG
    if (file.type !== 'image/svg+xml') {
      toast.error('Please upload an SVG file');
      return;
    }
    
    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error('SVG must be less than 1MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const svgContent = e.target.result.toString();
        
        try {
          // Sanitize and format SVG content
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
          const svgElement = svgDoc.documentElement;
          
          // Ensure the SVG has proper viewBox and dimensions
          if (!svgElement.hasAttribute('viewBox') && 
              svgElement.hasAttribute('width') && 
              svgElement.hasAttribute('height')) {
            const width = svgElement.getAttribute('width') || '24';
            const height = svgElement.getAttribute('height') || '24';
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
          }
          
          // Set width and height attributes if missing
          if (!svgElement.hasAttribute('width')) {
            svgElement.setAttribute('width', '100%');
          }
          if (!svgElement.hasAttribute('height')) {
            svgElement.setAttribute('height', '100%');
          }
          
          // Convert back to string with proper XML declaration
          const serializer = new XMLSerializer();
          const cleanedSvgContent = serializer.serializeToString(svgElement);
          
          // Create data URL for preview
          const svgBlob = new Blob([cleanedSvgContent], {type: 'image/svg+xml'});
          const svgUrl = URL.createObjectURL(svgBlob);
          
          // Save the SVG with both content and data URL for preview
          const newSVG = svgStorage.saveSVG(
            cleanedSvgContent,
            file.name,
            svgUrl
          );
          
          setSvgs(prev => [newSVG, ...prev]);
          toast.success('SVG uploaded successfully');
        } catch (error) {
          console.error("Error processing SVG:", error);
          toast.error('Failed to process SVG. Make sure it is a valid SVG file.');
        }
      }
    };
    reader.onerror = () => {
      toast.error('Failed to upload SVG');
    };
    reader.readAsText(file);
    
    // Reset input value so same file can be uploaded again
    event.target.value = '';
  }, []);

  // Clean up URL objects when component unmounts
  useEffect(() => {
    return () => {
      // Revoke object URLs to prevent memory leaks
      svgs.forEach(svg => {
        if (svg.preview && svg.preview.startsWith('blob:')) {
          URL.revokeObjectURL(svg.preview);
        }
      });
    };
  }, [svgs]);

  // Add SVG to canvas
  const addSVGToCanvas = useCallback((svg: StoredSVG) => {
    if (!editor) return;
    
    try {
      // Load the SVG onto the canvas with fabric's loadSVGFromString
      editor.addSVG(svg.content);
      toast.success('SVG added to canvas');
    } catch (error) {
      console.error("Error adding SVG to canvas:", error);
      toast.error('Failed to add SVG to canvas');
    }
  }, [editor]);

  // Delete SVG from storage
  const deleteSVGFromStorage = useCallback((e: React.MouseEvent, id: string) => {
    // Stop the click event from bubbling up to the parent button
    e.stopPropagation();
    
    // Ask for confirmation before deleting
    if (window.confirm('Are you sure you want to delete this SVG? This action cannot be undone.')) {
      try {
        // Delete the SVG from storage
        svgStorage.deleteSVG(id);
        
        // Update the state to remove the deleted SVG
        setSvgs(prev => prev.filter(svg => svg.id !== id));
        
        // Revoke the object URL if it exists
        const svg = svgs.find(s => s.id === id);
        if (svg?.preview && svg.preview.startsWith('blob:')) {
          URL.revokeObjectURL(svg.preview);
        }
        
        toast.success('SVG deleted successfully');
      } catch (error) {
        console.error("Error deleting SVG:", error);
        toast.error('Failed to delete SVG');
      }
    }
  }, [svgs]);

  // Add template SVG to canvas
  const addTemplateSVG = useCallback((template: typeof SVG_TEMPLATES[0]) => {
    if (!editor) return;
    
    try {
      editor.addSVG(template.content);
      toast.success(`${template.name} SVG added to canvas`);
    } catch (error) {
      console.error("Error adding template SVG to canvas:", error);
      toast.error('Failed to add template SVG to canvas');
    }
  }, [editor]);

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "svg" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="SVG Elements" description="Add and edit SVG elements on your canvas" />
      <div className="p-4 border-b">
        <div className="space-y-2">
          <Label htmlFor="svg-upload" className="cursor-pointer w-full">
            <div className="flex items-center justify-center w-full h-10 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800">
              <Upload className="h-4 w-4 mr-2" />
              Upload SVG
            </div>
            <input 
              id="svg-upload" 
              type="file" 
              className="hidden" 
              accept=".svg,image/svg+xml" 
              onChange={handleFileUpload} 
            />
          </Label>
          <p className="text-xs text-muted-foreground text-center">
            Max 1MB · SVG files only
          </p>
        </div>
      </div>
      
      {/* SVG Templates Section */}
      <div className="p-4 border-b">
        <h3 className="font-medium mb-3">SVG Templates</h3>
        <ScrollArea className="max-h-[300px]">
          <div className="grid grid-cols-2 gap-4">
            {SVG_TEMPLATES.slice(0, 5).map((template) => (
              <button
                key={template.id}
                onClick={() => addTemplateSVG(template)}
                className="flex flex-col items-center justify-center p-2 border rounded-md hover:bg-gray-50 transition"
              >
                <div 
                  className="w-8 h-8 mb-1 text-black"
                  dangerouslySetInnerHTML={{ __html: template.content }}
                />
                <span className="text-xs truncate w-full text-center">{template.name}</span>
              </button>
            ))}
          </div>
          
          {/* Special layout for the testimonial template to show it properly */}
          <div className="mt-4">
            <button
              key={SVG_TEMPLATES[5].id}
              onClick={() => addTemplateSVG(SVG_TEMPLATES[5])}
              className="w-full border rounded-md hover:bg-gray-50 transition p-3"
            >
              <h4 className="text-sm font-medium mb-2">{SVG_TEMPLATES[5].name}</h4>
              <div 
                className="w-full h-[120px] bg-[#FFF5DC] relative overflow-hidden"
                style={{ border: '1px solid #e5e7eb' }}
              >
                <div className="absolute inset-0 scale-[0.22] origin-top-left">
                  <div dangerouslySetInnerHTML={{ __html: SVG_TEMPLATES[5].content }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click to add this professionally designed testimonial template</p>
            </button>
          </div>
          
          {/* Special layout for the Coming Soon template */}
          <div className="mt-4">
            <button
              key={SVG_TEMPLATES[6].id}
              onClick={() => addTemplateSVG(SVG_TEMPLATES[6])}
              className="w-full border rounded-md hover:bg-gray-50 transition p-3"
            >
              <h4 className="text-sm font-medium mb-2">{SVG_TEMPLATES[6].name} (1080×1080)</h4>
              <div 
                className="w-full h-[120px] bg-[#ECD8B7] relative overflow-hidden"
                style={{ border: '1px solid #e5e7eb' }}
              >
                <div className="absolute inset-0 scale-[0.22] origin-top-left">
                  <div dangerouslySetInnerHTML={{ __html: SVG_TEMPLATES[6].content }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Click to add this editable Coming Soon template at 1080×1080 size</p>
            </button>
          </div>
        </ScrollArea>
      </div>
      
      {/* User Uploaded SVGs Section */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <h3 className="font-medium p-4 pb-2">Your SVGs</h3>
        {isLoading && (
          <div className="flex items-center justify-center flex-1">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        )}
        {!isLoading && svgs.length === 0 && (
          <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
            <FileType className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No SVGs uploaded yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-[250px]">
              Upload SVG files to use them in your designs
            </p>
          </div>
        )}
        <ScrollArea className="flex-1">
          {!isLoading && svgs.length > 0 && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {svgs.map((svg) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addSVGToCanvas(svg);
                    }}
                    key={svg.id}
                    className="relative w-full h-[100px] group hover:opacity-75 transition bg-white rounded-sm overflow-hidden border"
                  >
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <img 
                        src={svg.preview} 
                        alt={svg.name}
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div className="absolute left-0 bottom-0 w-full text-[10px] truncate text-white p-1 bg-black/50 text-left">
                      {svg.name}
                    </div>
                    <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSVGFromStorage(e, svg.id);
                        }}
                        className="bg-white rounded-full p-1 shadow-sm hover:bg-red-50 transition-colors"
                        title="Delete SVG"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
}; 
