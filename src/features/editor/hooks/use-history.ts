import { fabric } from "fabric";
import { useCallback, useRef, useState } from "react";

import { JSON_KEYS } from "@/features/editor/types";

interface UseHistoryProps {
  canvas: fabric.Canvas | null;
  saveCallback?: (values: {
    json: string;
    height: number;
    width: number;
  }) => void;
};

export const useHistory = ({ canvas, saveCallback }: UseHistoryProps) => {
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasHistory = useRef<string[]>([]);
  const skipSave = useRef(false);

  const canUndo = useCallback(() => {
    return historyIndex > 0;
  }, [historyIndex]);

  const canRedo = useCallback(() => {
    return historyIndex < canvasHistory.current.length - 1;
  }, [historyIndex]);

  const save = useCallback((skip = false) => {
    if (!canvas) return;
    
    try {
      const currentState = canvas.toJSON(JSON_KEYS);
      
      // Add viewport transform data to the state
      if (canvas.viewportTransform) {
        // Save the current viewport transform (zoom and pan)
        currentState._viewportTransform = [...canvas.viewportTransform];
      }
      
      const json = JSON.stringify(currentState);
  
      if (!skip && !skipSave.current) {
        // If we're in the middle of the history stack, 
        // remove everything after the current index
        if (historyIndex < canvasHistory.current.length - 1) {
          canvasHistory.current = canvasHistory.current.slice(0, historyIndex + 1);
        }
        
        // Add new state to history
        canvasHistory.current.push(json);
        setHistoryIndex(canvasHistory.current.length - 1);
      }
  
      const workspace = canvas
        .getObjects()
        .find((object) => object.name === "clip");
      const height = workspace?.height || 0;
      const width = workspace?.width || 0;
  
      saveCallback?.({ json, height, width });
    } catch (error) {
      console.error("Error saving canvas state:", error);
    }
  }, 
  [
    canvas,
    saveCallback,
    historyIndex
  ]);

  const undo = useCallback(() => {
    if (canUndo()) {
      try {
        skipSave.current = true;
        
        // Get current viewport transform before making changes
        const currentViewportTransform = canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        
        // Clear the canvas before loading new state
        canvas?.clear().renderAll();

        const previousIndex = historyIndex - 1;
        const previousStateData = JSON.parse(
          canvasHistory.current[previousIndex]
        );
        
        // Check if the state has viewport transform data
        const hasViewportData = previousStateData._viewportTransform && 
                                Array.isArray(previousStateData._viewportTransform) && 
                                previousStateData._viewportTransform.length === 6;
        
        // Extract the previous canvas state (separate from viewport data)
        const previousState = previousStateData;
        
        // Load the previous state
        canvas?.loadFromJSON(previousState, () => {
          // After loading the state, restore viewport if needed
          if (hasViewportData && canvas) {
            canvas.setViewportTransform(previousStateData._viewportTransform);
          }
          
          // Make sure objects are positioned correctly
          canvas?.getObjects().forEach(obj => {
            if (obj.name !== "clip") {  // Don't touch the workspace/clip object
              // Re-set position to force proper positioning
              if (obj.left !== undefined && obj.top !== undefined) {
                obj.set({
                  left: obj.left,
                  top: obj.top
                });
              }
            }
          });
          
          // Make sure canvas correctly renders
          canvas?.renderAll();
          setHistoryIndex(previousIndex);
          skipSave.current = false;
        });
      } catch (error) {
        console.error("Error during undo operation:", error);
        skipSave.current = false;
      }
    }
  }, [canUndo, canvas, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo()) {
      try {
        skipSave.current = true;
        
        // Get current viewport transform before making changes
        const currentViewportTransform = canvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
        
        // Clear canvas before loading new state
        canvas?.clear().renderAll();

        const nextIndex = historyIndex + 1;
        const nextStateData = JSON.parse(
          canvasHistory.current[nextIndex]
        );
        
        // Check if the state has viewport transform data
        const hasViewportData = nextStateData._viewportTransform && 
                               Array.isArray(nextStateData._viewportTransform) && 
                               nextStateData._viewportTransform.length === 6;
        
        // Extract the next canvas state
        const nextState = nextStateData;
        
        // Load the next state
        canvas?.loadFromJSON(nextState, () => {
          // After loading the state, restore viewport if needed
          if (hasViewportData && canvas) {
            canvas.setViewportTransform(nextStateData._viewportTransform);
          }
          
          // Make sure objects are positioned correctly
          canvas?.getObjects().forEach(obj => {
            if (obj.name !== "clip") {  // Don't touch the workspace/clip object
              // Re-set position to force proper positioning
              if (obj.left !== undefined && obj.top !== undefined) {
                obj.set({
                  left: obj.left,
                  top: obj.top
                });
              }
            }
          });
          
          // Make sure canvas correctly renders
          canvas?.renderAll();
          setHistoryIndex(nextIndex);
          skipSave.current = false;
        });
      } catch (error) {
        console.error("Error during redo operation:", error);
        skipSave.current = false;
      }
    }
  }, [canvas, historyIndex, canRedo]);

  return { 
    save,
    canUndo,
    canRedo,
    undo,
    redo,
    setHistoryIndex,
    canvasHistory,
  };
};
