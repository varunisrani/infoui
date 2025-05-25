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
  const initialStateSet = useRef(false);

  const canUndo = useCallback(() => {
    return historyIndex > 0;
  }, [historyIndex]);

  const canRedo = useCallback(() => {
    return historyIndex < canvasHistory.current.length - 1;
  }, [historyIndex]);

  const save = useCallback((skip = false) => {
    if (!canvas) return;
    
    try {
      // Ensure objects have accurate positions and properties in the JSON
      canvas.forEachObject(obj => {
        if (obj.group) {
          // Make sure grouped objects have correct coordinates
          const matrix = obj.calcTransformMatrix();
          obj.setCoords();
        }
      });
      
      const currentState = canvas.toJSON(JSON_KEYS);
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

  // Initialize history with current state if it's empty
  const initializeHistory = useCallback(() => {
    if (!canvas || initialStateSet.current) return;
    save(true);
    initialStateSet.current = true;
  }, [canvas, save]);

  const undo = useCallback(() => {
    if (canUndo()) {
      try {
        skipSave.current = true;
        
        // Reset any ongoing transformations
        if (canvas?.isDrawingMode) canvas.isDrawingMode = false;
        canvas?.discardActiveObject();
        
        // Clear the canvas before loading new state
        canvas?.clear().renderAll();

        const previousIndex = historyIndex - 1;
        const previousState = JSON.parse(
          canvasHistory.current[previousIndex]
        );

        // Load the previous state
        canvas?.loadFromJSON(previousState, () => {
          // Apply correct transforms to all objects
          canvas.forEachObject(obj => {
            obj.setCoords();
          });
          
          // Make sure canvas correctly renders
          canvas.renderAll();
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
        
        // Reset any ongoing transformations
        if (canvas?.isDrawingMode) canvas.isDrawingMode = false;
        canvas?.discardActiveObject();
        
        // Clear canvas before loading new state
        canvas?.clear().renderAll();

        const nextIndex = historyIndex + 1;
        const nextState = JSON.parse(
          canvasHistory.current[nextIndex]
        );

        // Load the next state
        canvas?.loadFromJSON(nextState, () => {
          // Apply correct transforms to all objects
          canvas.forEachObject(obj => {
            obj.setCoords();
          });
          
          // Make sure canvas correctly renders
          canvas.renderAll();
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
    initializeHistory,
  };
};
