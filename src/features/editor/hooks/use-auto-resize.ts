import { fabric } from "fabric";
import { useCallback, useEffect } from "react";

interface UseAutoResizeProps {
  canvas: fabric.Canvas | null;
  container: HTMLDivElement | null;
}

export const useAutoResize = ({ canvas, container }: UseAutoResizeProps) => {
  const autoZoom = useCallback(() => {
    if (!canvas || !container) return;

    try {
      const width = container.offsetWidth;
      const height = container.offsetHeight;

      canvas.setWidth(width);
      canvas.setHeight(height);

      const center = canvas.getCenter();

      const zoomRatio = 0.85;
      const localWorkspace = canvas
        .getObjects()
        .find((object) => object.name === "clip");
        
      // If workspace is not found, create it
      if (!localWorkspace) {
        console.warn("Workspace not found, creating one");
        
        const newWorkspace = new fabric.Rect({
          width: 1080,
          height: 1080,
          name: "clip",
          fill: "white",
          selectable: false,
          hasControls: false,
          evented: false,
          hoverCursor: 'default',
          shadow: new fabric.Shadow({
            color: "rgba(0,0,0,0.8)",
            blur: 5,
          }),
        });
        
        canvas.add(newWorkspace);
        canvas.centerObject(newWorkspace);
        canvas.renderAll();
        
        // Use the new workspace for auto-zoom calculations
        const freshWorkspace = canvas.getObjects().find(obj => obj.name === "clip");
        if (!freshWorkspace) {
          console.error("Failed to create workspace");
          return;
        }
      }
      
      // Get the workspace again, as it might have been created
      const workspace = canvas.getObjects().find(obj => obj.name === "clip");
      if (!workspace) return;

      // Calculate scale - either use fabric's utility or fallback to custom implementation
      let scale: number;
      
      try {
        // Try to use fabric's findScaleToFit if available
        // @ts-ignore - findScaleToFit may not be in type definitions but exists in the library
        if (fabric.util && fabric.util.findScaleToFit) {
          // @ts-ignore
          scale = fabric.util.findScaleToFit(workspace, {
            width: width,
            height: height,
          });
        } else {
          // Custom implementation as fallback
          const objectWidth = workspace.getScaledWidth();
          const objectHeight = workspace.getScaledHeight();
          
          if (!objectWidth || !objectHeight) {
            console.warn("Cannot determine workspace dimensions for scaling");
            return;
          }
          
          // Calculate the scale to fit the workspace in the container
          const scaleX = width / objectWidth;
          const scaleY = height / objectHeight;
          scale = Math.min(scaleX, scaleY);
        }
      } catch (error) {
        console.error("Error calculating scale for auto-resize:", error);
        return;
      }

      const zoom = zoomRatio * scale;

      try {
        // Safely reset and apply zoom
        canvas.setViewportTransform(fabric.iMatrix.concat());
        canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
      } catch (error) {
        console.error("Error applying zoom:", error);
        
        // Fallback - try to set zoom directly if zoomToPoint fails
        try {
          canvas.setZoom(zoom);
        } catch (innerError) {
          console.error("Fallback zoom also failed:", innerError);
        }
      }

      try {
        const workspaceCenter = workspace.getCenterPoint();
        
        if (!workspaceCenter) {
          console.warn("Could not determine workspace center point");
          return;
        }
        
        const viewportTransform = canvas.viewportTransform;

        if (
          canvas.width === undefined ||
          canvas.height === undefined ||
          !viewportTransform
        ) {
          console.warn("Canvas dimensions or viewport transform not available");
          return;
        }

        viewportTransform[4] = canvas.width / 2 - workspaceCenter.x * viewportTransform[0];
        viewportTransform[5] = canvas.height / 2 - workspaceCenter.y * viewportTransform[3];

        canvas.setViewportTransform(viewportTransform);

        // Wrap the clone operation in a try-catch to handle potential errors
        try {
          workspace.clone((cloned: fabric.Rect) => {
            canvas.clipPath = cloned;
            canvas.requestRenderAll();
          });
        } catch (error) {
          console.error("Error creating clip path:", error);
          // Still render the canvas even if clipping fails
          canvas.requestRenderAll();
        }
      } catch (error) {
        console.error("Error in workspace centering:", error);
        // Try to render anyway
        canvas.requestRenderAll();
      }
    } catch (error) {
      console.error("Error in autoZoom function:", error);
    }
  }, [canvas, container]);

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    if (canvas && container) {
      resizeObserver = new ResizeObserver(() => {
        autoZoom();
      });

      resizeObserver.observe(container);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [canvas, container, autoZoom]);

  return { autoZoom };
};
