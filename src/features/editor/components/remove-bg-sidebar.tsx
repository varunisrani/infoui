import { Editor, ActiveTool } from "@/features/editor/types";
import { useRemoveBg } from "@/features/editor/hooks/use-remove-bg";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Wand2 } from "lucide-react";
import { fabric } from "fabric";

interface RemoveBgSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

// Extend the fabric.Image type to include the properties we need
interface ExtendedFabricImage extends fabric.Image {
  _element?: HTMLImageElement;
  _originalElement?: HTMLImageElement;
}

export const RemoveBgSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: RemoveBgSidebarProps) => {
  const mutation = useRemoveBg();

  // Get the selected objects from the canvas
  const selectedObjects = editor?.canvas?.getActiveObjects() || [];
  const selectedObject = selectedObjects[0];

  // Check if the selected object is an image
  const isImage = selectedObject instanceof fabric.Image;
  
  // Safely get the image source using our extended type
  const imageSrc = isImage 
    ? ((selectedObject as ExtendedFabricImage)._element?.src || 
       (selectedObject as ExtendedFabricImage)._originalElement?.src)
    : undefined;

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onClick = async () => {
    if (!imageSrc || !selectedObject || !isImage) return;
    
    try {
      const result = await mutation.mutateAsync({
        imageUrl: imageSrc
      });

      if (!result) return;

      // Create a new image element with the processed image
      const img = new Image();
      img.src = result;

      // Wait for the image to load
      img.onload = () => {
        if (!editor?.canvas) return;

        // Create a new fabric.Image instance with the processed image
        const newImage = new fabric.Image(img, {
          ...selectedObject.toObject(),
          src: result
        });

        // Replace the old image with the new one
        editor.canvas.remove(selectedObject);
        editor.canvas.add(newImage);
        editor.canvas.renderAll();
        
        // Select the new image
        editor.canvas.setActiveObject(newImage);
      };
    } catch (error) {
      console.error("Error removing background:", error);
    }
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "remove-bg" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Remove background"
        description="Remove the background from your image"
      />
      <div className="p-4 space-y-4">
        <Button
          onClick={onClick}
          disabled={!imageSrc || mutation.isPending || !isImage}
          className="w-full"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Remove background
            </>
          )}
        </Button>
        {!isImage && selectedObject && (
          <p className="text-sm text-muted-foreground">
            Please select an image to remove its background
          </p>
        )}
        {!selectedObject && (
          <p className="text-sm text-muted-foreground">
            Select an image to get started
          </p>
        )}
      </div>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
