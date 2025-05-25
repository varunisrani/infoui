import { fabric } from "fabric";
import { useEffect } from "react";

interface UseCanvasEventsProps {
  save: () => void;
  initializeHistory: () => void;
  canvas: fabric.Canvas | null;
  setSelectedObjects: (objects: fabric.Object[]) => void;
  clearSelectionCallback?: () => void;
};

export const useCanvasEvents = ({
  save,
  initializeHistory,
  canvas,
  setSelectedObjects,
  clearSelectionCallback,
}: UseCanvasEventsProps) => {
  useEffect(() => {
    if (canvas) {
      // Initialize the history with the current state
      initializeHistory();
      
      // Standard object manipulation events
      canvas.on("object:added", () => save());
      canvas.on("object:removed", () => save());
      canvas.on("object:modified", () => save());
      
      // Text specific events - for font changes
      canvas.on("text:changed", () => save());
      canvas.on("text:style:changed", () => save());
      
      // More granular property changes
      canvas.on("object:rotating", () => {/* Don't save during rotation */});
      canvas.on("object:rotated", () => save());
      canvas.on("object:scaling", () => {/* Don't save during scaling */});
      canvas.on("object:scaled", () => save());
      canvas.on("object:moved", () => save());
      
      // Position finalization events - critical for SVG drop position
      canvas.on("drop", () => save()); // Custom event that might be fired after SVG drop
      canvas.on("object:positioned", () => save()); // After positioning is complete

      // Selection events
      canvas.on("selection:created", (e) => {
        setSelectedObjects(e.selected || []);
      });
      canvas.on("selection:updated", (e) => {
        setSelectedObjects(e.selected || []);
      });
      canvas.on("selection:cleared", () => {
        setSelectedObjects([]);
        clearSelectionCallback?.();
      });
    }

    return () => {
      if (canvas) {
        // Clean up all event listeners
        canvas.off("object:added");
        canvas.off("object:removed");
        canvas.off("object:modified");
        canvas.off("text:changed");
        canvas.off("text:style:changed");
        canvas.off("object:rotating");
        canvas.off("object:rotated");
        canvas.off("object:scaling");
        canvas.off("object:scaled");
        canvas.off("object:moved");
        canvas.off("drop");
        canvas.off("object:positioned");
        canvas.off("selection:created");
        canvas.off("selection:updated");
        canvas.off("selection:cleared");
      }
    };
  },
  [
    save,
    initializeHistory,
    canvas,
    clearSelectionCallback,
    setSelectedObjects
  ]);
};
