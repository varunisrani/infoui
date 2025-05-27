import { fabric } from "fabric";
import { useCallback, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { parseSVG, makeAbsolute, Command as SvgPathCommand } from 'svg-path-parser';

// Define a more specific type for SvgPathCommand if library types are too loose	ype SvgPathCommand = SvgPathCommandBase | [string, ...number[]];

import { 
  Editor, 
  FILL_COLOR,
  STROKE_WIDTH,
  STROKE_COLOR,
  CIRCLE_OPTIONS,
  DIAMOND_OPTIONS,
  TRIANGLE_OPTIONS,
  BuildEditorProps, 
  RECTANGLE_OPTIONS,
  EditorHookProps,
  STROKE_DASH_ARRAY,
  TEXT_OPTIONS,
  FONT_FAMILY,
  FONT_WEIGHT,
  FONT_SIZE,
  JSON_KEYS,
} from "@/features/editor/types";
import { useHistory } from "@/features/editor/hooks/use-history";
import { 
  createFilter, 
  downloadFile, 
  isTextType,
  transformText
} from "@/features/editor/utils";
import { useHotkeys } from "@/features/editor/hooks/use-hotkeys";
import { useClipboard } from "@/features/editor/hooks//use-clipboard";
import { useAutoResize } from "@/features/editor/hooks/use-auto-resize";
import { useCanvasEvents } from "@/features/editor/hooks/use-canvas-events";
import { useWindowEvents } from "@/features/editor/hooks/use-window-events";
import { useLoadState } from "@/features/editor/hooks/use-load-state";

const buildEditor = ({
  save,
  undo,
  redo,
  canRedo,
  canUndo,
  autoZoom,
  copy,
  paste,
  canvas,
  fillColor,
  fontFamily,
  setFontFamily,
  setFillColor,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  selectedObjects,
  strokeDashArray,
  setStrokeDashArray,
}: BuildEditorProps): Editor => {
  const generateSaveOptions = () => {
    const { width, height, left, top } = getWorkspace() as fabric.Rect;

    return {
      name: "Image",
      format: "png",
      quality: 1,
      width,
      height,
      left,
      top,
    };
  };

  const savePng = () => {
    const options = generateSaveOptions();

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);

    downloadFile(dataUrl, "png");
    autoZoom();
  };

  const saveSvg = () => {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    // Use toSVG() method to get proper SVG content with 1080x1080 dimensions
    const svgContent = canvas.toSVG({
      width: 1080,
      height: 1080,
      viewBox: {
        x: 0,
        y: 0,
        width: 1080,
        height: 1080
      }
    });
    // Create a proper SVG data URL
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

    downloadFile(svgDataUrl, "svg");
    autoZoom();
  };

  const saveJpg = () => {
    const options = generateSaveOptions();

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);

    downloadFile(dataUrl, "jpg");
    autoZoom();
  };

  const saveJson = async () => {
    const dataUrl = canvas.toJSON(JSON_KEYS);

    await transformText(dataUrl.objects);
    const fileString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataUrl, null, "\t"),
    )}`;
    downloadFile(fileString, "json");
  };

  const loadJson = (json: string) => {
    const data = JSON.parse(json);

    canvas.loadFromJSON(data, () => {
      autoZoom();
    });
  };

  const getWorkspace = () => {
    return canvas
    .getObjects()
    .find((object) => object.name === "clip");
  };

  const center = (object: fabric.Object) => {
    const workspace = getWorkspace();
    const center = workspace?.getCenterPoint();

    if (!center) return;

    // @ts-ignore
    canvas._centerObject(object, center);
  };

  const addToCanvas = (object: fabric.Object) => {
    center(object);
    canvas.add(object);
    canvas.setActiveObject(object);
  };

  return {
    savePng,
    saveJpg,
    saveSvg,
    saveJson,
    loadJson,
    canUndo,
    canRedo,
    autoZoom,
    getWorkspace,
    zoomIn: () => {
      let zoomRatio = canvas.getZoom();
      zoomRatio += 0.05;
      const center = canvas.getCenter();
      canvas.zoomToPoint(
        new fabric.Point(center.left, center.top),
        zoomRatio > 1 ? 1 : zoomRatio
      );
    },
    zoomOut: () => {
      let zoomRatio = canvas.getZoom();
      zoomRatio -= 0.05;
      const center = canvas.getCenter();
      canvas.zoomToPoint(
        new fabric.Point(center.left, center.top),
        zoomRatio < 0.2 ? 0.2 : zoomRatio,
      );
    },
    changeSize: (value: { width: number; height: number }) => {
      const workspace = getWorkspace();

      workspace?.set(value);
      autoZoom();
      save();
    },
    changeBackground: (value: string) => {
      const workspace = getWorkspace();
      workspace?.set({ fill: value });
      canvas.renderAll();
      save();
    },
    enableDrawingMode: () => {
      canvas.discardActiveObject();
      canvas.renderAll();
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.freeDrawingBrush.color = strokeColor;
    },
    disableDrawingMode: () => {
      canvas.isDrawingMode = false;
    },
    onUndo: () => undo(),
    onRedo: () => redo(),
    onCopy: () => copy(),
    onPaste: () => paste(),
    changeImageFilter: (value: string) => {
      const objects = canvas.getActiveObjects();
      objects.forEach((object) => {
        if (object.type === "image") {
          const imageObject = object as fabric.Image;

          const effect = createFilter(value);

          imageObject.filters = effect ? [effect] : [];
          imageObject.applyFilters();
          canvas.renderAll();
        }
      });
    },
    addImage: (value: string) => {
      fabric.Image.fromURL(
        value,
        (image) => {
          const workspace = getWorkspace();

          image.scaleToWidth(workspace?.width || 0);
          image.scaleToHeight(workspace?.height || 0);

          addToCanvas(image);
        },
        {
          crossOrigin: "anonymous",
        },
      );
    },
    addSVG: (svgString: string) => {
      // Clean up SVG string
      svgString = svgString.trim();

      try {
        if (canvas) {
          // Check if this is a testimonial SVG
          const isTestimonial = svgString.includes('testimonial-background') || 
                               svgString.includes('Testimonial') || 
                               svgString.includes('JANE DOE');
          
          // Check if this is a Coming Soon SVG
          // @ts-ignore - text property exists on text objects but TypeScript doesn't recognize it
          const isComingSoon = svgString.includes('COMING') && 
                              svgString.includes('SOON') && 
                              svgString.includes('STAY TUNED');
          
          // Special handling for complex templates
          const isSpecialTemplate = isTestimonial || isComingSoon;
          
          // Load SVG string into a Fabric.js object
          fabric.loadSVGFromString(svgString, (objects, options) => {
            // Create a group with all SVG elements
            const svgGroup = new fabric.Group(objects, {
              name: isTestimonial ? 'testimonial-template' : 
                    isComingSoon ? 'coming-soon-template' : 'svg-group',
              selectable: true,
              hasControls: true,
            });

            // Special size handling for the Coming Soon template
            if (isComingSoon) {
              // Set exact size for Coming Soon template (1080x1080)
              const targetSize = { width: 1080, height: 1080 };
              
              // Add to canvas centered
              svgGroup.set({
                scaleX: 1,
                scaleY: 1,
                width: targetSize.width,
                height: targetSize.height,
                left: (canvas.width! / 2) - (targetSize.width / 2),
                top: (canvas.height! / 2) - (targetSize.height / 2)
              });
              
              // Set default size in history
              svgGroup.set({
                data: {
                  defaultWidth: targetSize.width,
                  defaultHeight: targetSize.height
                }
              });

              canvas.add(svgGroup);
              canvas.setActiveObject(svgGroup);
              canvas.renderAll();
              
              toast.success("Coming Soon template added! Use the 'Ungroup' button to edit individual elements");
              return;
            }

            // Calculate scaling factor
            const maxDimension = 500; // Max dimension for non-Coming Soon SVGs
            const scale = Math.min(
              maxDimension / (svgGroup.width || 1),
              maxDimension / (svgGroup.height || 1)
            );

            // Place centered on canvas with appropriate scaling
            svgGroup.set({
              scaleX: scale,
              scaleY: scale,
              left: canvas.width! / 2 - ((svgGroup.width || 0) * scale) / 2,
              top: canvas.height! / 2 - ((svgGroup.height || 0) * scale) / 2,
            });

            // Add SVG group to canvas
            canvas.add(svgGroup);
            canvas.setActiveObject(svgGroup);
            canvas.renderAll();

            const message = isTestimonial 
              ? "Testimonial template added! Use the 'Ungroup' button to edit individual elements"
              : "SVG added to canvas!";
            
            toast.success(message);
          });
        }
      } catch (error) {
        console.error("Error adding SVG:", error);
        toast.error("Failed to add SVG to canvas");
      }
    },
    ungroupSVG: () => {
      const activeObject = canvas.getActiveObject();

      if (!activeObject) {
        toast.info("No object selected.");
        return 0;
      }

      if (activeObject.type === 'path' && (activeObject as fabric.Path).path) {
        const pathObject = activeObject as fabric.Path;
        let pathDataString = '';

        // Prioritize toPathData() if it exists, as it gives the canonical string representation
        if (typeof (pathObject as any).toPathData === 'function') {
          pathDataString = (pathObject as any).toPathData();
        } else if (Array.isArray(pathObject.path)) {
          // @ts-ignore path is an array of arrays for fabric.Path
          pathDataString = fabric.util.pathSegmentsToString(pathObject.path as unknown as Array<[string, ...number[]]>);
        } else if (typeof pathObject.path === 'string') { // Added this check for string path
          pathDataString = pathObject.path;
        } else {
          pathDataString = (pathObject.data?.originalPathString as string) || '';
        }
        
        if (!pathDataString || pathDataString.trim() === '') {
          toast.error("Path data is empty or invalid for ungrouping.");
          return 0;
        }

        try {
          save(); 

          const parsedCommands = parseSVG(pathDataString);
          if (!parsedCommands || parsedCommands.length === 0) {
            toast.info("Path data parsed into zero commands. Cannot ungroup.");
            undo();
            return 0;
          }
          makeAbsolute(parsedCommands); // Modifies in place

          const newPaths: fabric.Path[] = [];
          let currentSubPathD = ""; // Stores the 'd' string for the current sub-path being built

          const commonPathProps = {
            fill: pathObject.fill,
            stroke: pathObject.stroke,
            strokeWidth: pathObject.strokeWidth,
            opacity: pathObject.opacity,
            shadow: pathObject.shadow ? new fabric.Shadow(pathObject.shadow as fabric.IShadowOptions) : undefined,
            visible: pathObject.visible,
          };

          for (const command of parsedCommands) {
            const codeUpper = command.code.toUpperCase();

            if (codeUpper === 'M' && currentSubPathD.trim() !== "") {
              try {
                const p = new fabric.Path(currentSubPathD.trim(), { ...commonPathProps });
                newPaths.push(p);
              } catch (e) {
                console.warn("Failed to create fabric.Path from sub-path segment:", currentSubPathD.trim(), e);
              }
              currentSubPathD = ""; 
            }

            let commandStringSegment = command.code;
            switch (codeUpper) {
                case 'M': case 'L': case 'T':
                    commandStringSegment += ` ${command.x} ${command.y}`;
                    break;
                case 'H':
                    commandStringSegment += ` ${command.x}`;
                    break;
                case 'V':
                    commandStringSegment += ` ${command.y}`;
                    break;
                case 'C':
                    commandStringSegment += ` ${command.x1} ${command.y1} ${command.x2} ${command.y2} ${command.x} ${command.y}`;
                    break;
                case 'S': case 'Q':
                    commandStringSegment += ` ${command.x1} ${command.y1} ${command.x} ${command.y}`;
                    break;
                case 'A':
                    commandStringSegment += ` ${command.rx} ${command.ry} ${command.xAxisRotation} ${command.largeArc ? 1 : 0} ${command.sweep ? 1 : 0} ${command.x} ${command.y}`;
                    break;
                case 'Z':
                    break; // Z has no parameters, command.code itself is sufficient.
                default:
                    console.warn("Unknown SVG path command:", command.code);
            }
            currentSubPathD += commandStringSegment + " ";

            if (codeUpper === 'Z') {
              if (currentSubPathD.trim() !== "") {
                try {
                  const p = new fabric.Path(currentSubPathD.trim(), { ...commonPathProps });
                  newPaths.push(p);
                } catch (e) {
                  console.warn("Failed to create fabric.Path from Z-closed sub-path:", currentSubPathD.trim(), e);
                }
              }
              currentSubPathD = ""; 
            }
          }

          if (currentSubPathD.trim() !== "") {
            try {
              const p = new fabric.Path(currentSubPathD.trim(), { ...commonPathProps });
              newPaths.push(p);
            } catch (e) {
              console.warn("Failed to create fabric.Path from final sub-path segment:", currentSubPathD.trim(), e);
            }
          }
          
          // Check if ungrouping resulted in meaningful separation
          let effectivelyUngrouped = newPaths.length > 1;
          if (newPaths.length === 1 && pathObject.path) {
             // If only one path, ensure it's different from original or that original had multiple "M"s
             // This check is simplified: if only one path results, assume no effective ungroup unless original was complex
             const originalPathStringForComparison = typeof (pathObject as any).toPathData === 'function' 
                ? (pathObject as any).toPathData() 
                : typeof pathObject.path === 'string' 
                    ? pathObject.path 
                    : (fabric.util as any).pathSegmentsToString(pathObject.path as unknown as Array<[string, ...number[]]>);
             
             let newPathDString = '';
             const newPathObjectPath = newPaths[0].path;
             if (typeof (newPaths[0] as any).toPathData === 'function') {
                newPathDString = (newPaths[0] as any).toPathData();
             } else if (typeof newPathObjectPath === 'string') {
                newPathDString = newPathObjectPath;
             } else if (Array.isArray(newPathObjectPath)) {
                newPathDString = (fabric.util as any).pathSegmentsToString(newPathObjectPath as unknown as Array<[string, ...number[]]>);
             }

             if (originalPathStringForComparison === newPathDString && parsedCommands.filter(cmd => cmd.code.toUpperCase() === 'M').length <=1) {
                 effectivelyUngrouped = false;
             }
          } else if (newPaths.length === 0) {
            effectivelyUngrouped = false;
          }


          if (!effectivelyUngrouped) {
            toast.info("Path does not contain multiple distinct shapes to ungroup or is a single shape.");
            undo(); // Reverts the canvas.remove(pathObject) and the save()
            return 0;
          }

          canvas.remove(pathObject); 

          const finalItemsToSelect: fabric.Object[] = [];

          const tempGroup = new fabric.Group(newPaths, {
            left: pathObject.left,
            top: pathObject.top,
            angle: pathObject.angle,
            scaleX: pathObject.scaleX,
            scaleY: pathObject.scaleY,
            originX: pathObject.originX,
            originY: pathObject.originY,
            // Consider if other properties of pathObject should be applied to tempGroup
          });
          
          // @ts-ignore
          const restoredItems = tempGroup.destroy().getObjects() as fabric.Object[]; 

          restoredItems.forEach((item: fabric.Object) => {
            item.set({
              selectable: true,
              hasControls: true,
              evented: true,
            });
            canvas.add(item);
            finalItemsToSelect.push(item);
          });
          
          canvas.discardActiveObject(); // Deselect the original path
          if(finalItemsToSelect.length > 0){
            const sel = new fabric.ActiveSelection(finalItemsToSelect, { canvas: canvas });
            canvas.setActiveObject(sel);
          }
          canvas.renderAll();
          toast.success(`${finalItemsToSelect.length} elements created from the path.`);
          return finalItemsToSelect.length;

        } catch (err) {
          console.error("Error ungrouping path:", err);
          toast.error("Failed to ungroup path. It might be too complex or malformed.");
          undo(); 
          return 0;
        }

      } else if (activeObject && activeObject.type === 'group' && activeObject instanceof fabric.Group) {
        const group = activeObject as fabric.Group;
        const items = group.getObjects().map(o => o); 

        if (items.length === 0) {
          toast.info("Group is empty.");
          return 0;
        }

        try {
          save();
          // @ts-ignore 
          group._restoreObjectsState(); 
          canvas.remove(group);
          
          items.forEach((item: fabric.Object) => {
            item.set({
              selectable: true,
              hasControls: true,
              evented: true,
            });
            canvas.add(item); 
          });
          
          // Select the ungrouped items
          const sel = new fabric.ActiveSelection(items, { canvas: canvas });
          canvas.setActiveObject(sel);
          canvas.renderAll();

          toast.success(`${items.length} ${items.length === 1 ? "item has" : "items have"} been ungrouped.`);
          return items.length;
        } catch (err) {
          console.error("Error ungrouping group:", err);
          toast.error("Failed to ungroup group.");
          undo();
          return 0;
        }
      }

      toast.info("Please select a group or a combined path to ungroup.");
      return 0;
    },
    delete: () => {
      canvas.getActiveObjects().forEach((object) => canvas.remove(object));
      canvas.discardActiveObject();
      canvas.renderAll();
    },
    addText: (value, options) => {
      const object = new fabric.Textbox(value, {
        ...TEXT_OPTIONS,
        fill: fillColor,
        ...options,
      });

      addToCanvas(object);
    },
    getActiveOpacity: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return 1;
      }

      const value = selectedObject.get("opacity") || 1;

      return value;
    },
    changeFontSize: (value: number) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          (object as fabric.Text).set({ fontSize: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontSize: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return FONT_SIZE;
      }

      const value = (selectedObject as fabric.Text).get("fontSize") || FONT_SIZE;
      return value;
    },
    changeTextAlign: (value: string) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          (object as fabric.Text).set({ textAlign: value });
        }
      });
      canvas.renderAll();
    },
    getActiveTextAlign: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return "left";
      }

      const value = (selectedObject as fabric.Text).get("textAlign") || "left";
      return value;
    },
    changeFontUnderline: (value: boolean) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          (object as fabric.Text).set({ underline: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontUnderline: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return false;
      }

      const value = (selectedObject as fabric.Text).get("underline") || false;
      return value;
    },
    changeFontLinethrough: (value: boolean) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          (object as fabric.Text).set({ linethrough: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontLinethrough: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return false;
      }

      const value = (selectedObject as fabric.Text).get("linethrough") || false;
      return value;
    },
    changeFontStyle: (value: string) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          (object as fabric.Text).set({ fontStyle: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontStyle: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return "normal";
      }

      const value = (selectedObject as fabric.Text).get("fontStyle") || "normal";
      return value;
    },
    changeFontWeight: (value: number | string) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          (object as fabric.Text).set({ fontWeight: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontWeight: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return FONT_WEIGHT;
      }

      const value = (selectedObject as fabric.Text).get("fontWeight") || FONT_WEIGHT;
      return value;
    },
    changeOpacity: (value: number) => {
      canvas.getActiveObjects().forEach((object) => {
        object.set({ opacity: value });
      });
      canvas.renderAll();
    },
    bringForward: () => {
      canvas.getActiveObjects().forEach((object) => {
        canvas.bringForward(object);
      });

      canvas.renderAll();
      
      const workspace = getWorkspace();
      workspace?.sendToBack();
    },
    sendBackwards: () => {
      canvas.getActiveObjects().forEach((object) => {
        canvas.sendBackwards(object);
      });

      canvas.renderAll();
      const workspace = getWorkspace();
      workspace?.sendToBack();
    },
    changeFontFamily: (value: string) => {
      setFontFamily(value);
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          (object as fabric.Text).set({ fontFamily: value });
        }
      });
      canvas.renderAll();
    },
    changeFillColor: (value: string) => {
      setFillColor(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ fill: value });
      });
      canvas.renderAll();
    },
    changeStrokeColor: (value: string) => {
      setStrokeColor(value);
      canvas.getActiveObjects().forEach((object) => {
        // Text types don't have stroke
        if (isTextType(object.type)) {
          object.set({ fill: value });
          return;
        }

        object.set({ stroke: value });
      });
      canvas.freeDrawingBrush.color = value;
      canvas.renderAll();
    },
    changeStrokeWidth: (value: number) => {
      setStrokeWidth(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ strokeWidth: value });
      });
      canvas.freeDrawingBrush.width = value;
      canvas.renderAll();
    },
    changeStrokeDashArray: (value: number[]) => {
      setStrokeDashArray(value);
      canvas.getActiveObjects().forEach((object) => {
        object.set({ strokeDashArray: value });
      });
      canvas.renderAll();
    },
    addCircle: () => {
      const object = new fabric.Circle({
        ...CIRCLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
    addSoftRectangle: () => {
      const object = new fabric.Rect({
        ...RECTANGLE_OPTIONS,
        rx: 50,
        ry: 50,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
    addRectangle: () => {
      const object = new fabric.Rect({
        ...RECTANGLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
    addTriangle: () => {
      const object = new fabric.Triangle({
        ...TRIANGLE_OPTIONS,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        strokeDashArray: strokeDashArray,
      });

      addToCanvas(object);
    },
    addInverseTriangle: () => {
      const HEIGHT = TRIANGLE_OPTIONS.height;
      const WIDTH = TRIANGLE_OPTIONS.width;

      const object = new fabric.Polygon(
        [
          { x: 0, y: 0 },
          { x: WIDTH, y: 0 },
          { x: WIDTH / 2, y: HEIGHT },
        ],
        {
          ...TRIANGLE_OPTIONS,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDashArray: strokeDashArray,
        }
      );

      addToCanvas(object);
    },
    addDiamond: () => {
      const HEIGHT = DIAMOND_OPTIONS.height;
      const WIDTH = DIAMOND_OPTIONS.width;

      const object = new fabric.Polygon(
        [
          { x: WIDTH / 2, y: 0 },
          { x: WIDTH, y: HEIGHT / 2 },
          { x: WIDTH / 2, y: HEIGHT },
          { x: 0, y: HEIGHT / 2 },
        ],
        {
          ...DIAMOND_OPTIONS,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDashArray: strokeDashArray,
        }
      );
      addToCanvas(object);
    },
    canvas,
    getActiveFontFamily: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return fontFamily;
      }

      const value = (selectedObject as fabric.Text).get("fontFamily") || fontFamily;
      return value;
    },
    getActiveFillColor: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return fillColor;
      }

      const value = selectedObject.get("fill") || fillColor;

      // Currently, gradients & patterns are not supported
      return value as string;
    },
    getActiveStrokeColor: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return strokeColor;
      }

      const value = selectedObject.get("stroke") || strokeColor;

      return value;
    },
    getActiveStrokeWidth: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return strokeWidth;
      }

      const value = selectedObject.get("strokeWidth") || strokeWidth;

      return value;
    },
    getActiveStrokeDashArray: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return strokeDashArray;
      }

      const value = selectedObject.get("strokeDashArray") || strokeDashArray;

      return value;
    },
    selectedObjects,
  };
};

export const useEditor = ({
  defaultState,
  defaultHeight,
  defaultWidth,
  clearSelectionCallback,
  saveCallback,
}: EditorHookProps) => {
  const initialState = useRef(defaultState);
  const initialWidth = useRef(defaultWidth || 1080);  // Default to 1080 if not set
  const initialHeight = useRef(defaultHeight || 1080); // Default to 1080 if not set

  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([]);

  const [fontFamily, setFontFamily] = useState(FONT_FAMILY);
  const [fillColor, setFillColor] = useState(FILL_COLOR);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTH);
  const [strokeDashArray, setStrokeDashArray] = useState<number[]>(STROKE_DASH_ARRAY);

  useWindowEvents();

  const { 
    save, 
    canRedo, 
    canUndo, 
    undo, 
    redo,
    canvasHistory,
    setHistoryIndex,
  } = useHistory({ 
    canvas,
    saveCallback
  });

  const { copy, paste } = useClipboard({ canvas });

  const { autoZoom } = useAutoResize({
    canvas,
    container,
  });

  useCanvasEvents({
    save,
    canvas,
    setSelectedObjects,
    clearSelectionCallback,
  });

  useHotkeys({
    undo,
    redo,
    copy,
    paste,
    save,
    canvas,
  });

  useLoadState({
    canvas,
    autoZoom,
    initialState,
    canvasHistory,
    setHistoryIndex,
  });

  const editor = useMemo(() => {
    if (canvas) {
      return buildEditor({
        save,
        undo,
        redo,
        canUndo,
        canRedo,
        autoZoom,
        copy,
        paste,
        canvas,
        fillColor,
        strokeWidth,
        strokeColor,
        setFillColor,
        setStrokeColor,
        setStrokeWidth,
        strokeDashArray,
        selectedObjects,
        setStrokeDashArray,
        fontFamily,
        setFontFamily,
      });
    }

    return undefined;
  }, 
  [
    canRedo,
    canUndo,
    undo,
    redo,
    save,
    autoZoom,
    copy,
    paste,
    canvas,
    fillColor,
    strokeWidth,
    strokeColor,
    selectedObjects,
    strokeDashArray,
    fontFamily,
  ]);

  const init = useCallback(
    ({
      initialCanvas,
      initialContainer,
    }: {
      initialCanvas: fabric.Canvas;
      initialContainer: HTMLDivElement;
    }) => {
      fabric.Object.prototype.set({
        cornerColor: "#FFF",
        cornerStyle: "circle",
        borderColor: "#3b82f6",
        borderScaleFactor: 1.5,
        transparentCorners: false,
        borderOpacityWhenMoving: 1,
        cornerStrokeColor: "#3b82f6",
      });

      const initialWorkspace = new fabric.Rect({
        width: initialWidth.current,
        height: initialHeight.current,
        name: "clip",
        fill: "white",
        selectable: false,
        hasControls: false,
        evented: false, // Make sure it doesn't capture events
        hoverCursor: 'default', // Cursor should remain default
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.8)",
          blur: 5,
        }),
      });

      initialCanvas.setWidth(initialContainer.offsetWidth);
      initialCanvas.setHeight(initialContainer.offsetHeight);

      initialCanvas.add(initialWorkspace);
      initialCanvas.centerObject(initialWorkspace);
      initialCanvas.clipPath = initialWorkspace;

      setCanvas(initialCanvas);
      setContainer(initialContainer);

      const currentState = JSON.stringify(
        initialCanvas.toJSON(JSON_KEYS)
      );
      canvasHistory.current = [currentState];
      setHistoryIndex(0);
    },
    [
      canvasHistory, // No need, this is from useRef
      setHistoryIndex, // No need, this is from useState
    ]
  );

  return { init, editor };
};
