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
  const MAX_HISTORY = 50;

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
      const json = JSON.stringify(currentState);

      if (!skip && !skipSave.current) {
        if (historyIndex < canvasHistory.current.length - 1) {
          canvasHistory.current = canvasHistory.current.slice(0, historyIndex + 1);
        }

        const last = canvasHistory.current[canvasHistory.current.length - 1];
        if (last !== json) {
          canvasHistory.current.push(json);
          if (canvasHistory.current.length > MAX_HISTORY) {
            canvasHistory.current.shift();
          }
          setHistoryIndex(canvasHistory.current.length - 1);
        }
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
        
        // Store current canvas state
        const currentObjects = canvas?.getObjects() || [];
        
        // Clear the canvas before loading new state
        canvas?.clear().renderAll();

        const previousIndex = historyIndex - 1;
        const previousState = JSON.parse(
          canvasHistory.current[previousIndex]
        );

        canvas?.loadFromJSON(previousState, () => {
          const workspace = canvas
            .getObjects()
            .find((o) => (o as any).name === 'clip');
          if (workspace) {
            canvas.clipPath = workspace as unknown as fabric.Rect;
          }

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
        
        // Clear canvas before loading new state
        canvas?.clear().renderAll();

        const nextIndex = historyIndex + 1;
        const nextState = JSON.parse(
          canvasHistory.current[nextIndex]
        );

        canvas?.loadFromJSON(nextState, () => {
          const workspace = canvas
            .getObjects()
            .find((o) => (o as any).name === 'clip');
          if (workspace) {
            canvas.clipPath = workspace as unknown as fabric.Rect;
          }

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
  };
};
