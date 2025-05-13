import { fabric } from "fabric";
import { useCallback, useState, useMemo, useRef } from "react";
import { toast } from "sonner";

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
    const options = generateSaveOptions();

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const dataUrl = canvas.toDataURL(options);

    downloadFile(dataUrl, "svg");
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
      
      // Check if the selected object is a group
      if (activeObject && activeObject.type === 'group') {
        // Store the original properties of the group
        const groupProps = {
          left: activeObject.left || 0,
          top: activeObject.top || 0,
          width: activeObject.width || 0,
          height: activeObject.height || 0,
          scaleX: activeObject.scaleX || 1,
          scaleY: activeObject.scaleY || 1,
          angle: activeObject.angle || 0,
          originX: activeObject.originX || 'left',
          originY: activeObject.originY || 'top',
          flipX: activeObject.flipX || false,
          flipY: activeObject.flipY || false
        };
        
        // @ts-ignore - accessing objects property of the group
        const items = activeObject._objects || [];
        
        // Detect template type by looking for specific text elements
        const isTestimonial = items.some((item: fabric.Object) => {
          // @ts-ignore - text property exists on text objects
          return item.type === 'text' && item.text && item.text.includes('Testimonial');
        });
        
        const isComingSoon = items.some((item: fabric.Object) => {
          // @ts-ignore - text property exists on text objects but TypeScript doesn't know about it
          return item.type === 'text' && item.text && 
                 // @ts-ignore - text property exists on text objects but TypeScript doesn't know about it
                 (item.text.includes('COMING') || item.text.includes('SOON') || item.text.includes('STAY TUNED'));
        });
        
        // Special template flag
        const isSpecialTemplate = isTestimonial || isComingSoon;
        
        // Get the group's transformation matrix
        const groupMatrix = activeObject.calcTransformMatrix();
        
        // Clone all objects before removing the group
        interface ClonedItem {
          item: fabric.Object;
          props: {
            left: number;
            top: number;
            width: number;
            height: number;
            scaleX: number;
            scaleY: number;
            angle: number;
            originX: string;
            originY: string;
            type: string;
            flipX: boolean;
            flipY: boolean;
            // Additional properties for text objects
            fontSize?: number;
            fontFamily?: string;
            fill?: string;
            textAlign?: string;
            fontWeight?: string;
            text?: string;
            // Additional properties for paths
            path?: any;
            pathOffset?: { x: number, y: number };
          }
        }
        
        const clonedItems: ClonedItem[] = [];
        
        // First pass - clone the objects to preserve their properties
        items.forEach((item: fabric.Object) => {
          // Get all properties of the item
          const itemProps: any = {
            left: item.left || 0,
            top: item.top || 0,
            width: item.width || 0,
            height: item.height || 0,
            scaleX: item.scaleX || 1,
            scaleY: item.scaleY || 1,
            angle: item.angle || 0,
            originX: item.originX || 'left',
            originY: item.originY || 'top',
            type: item.type || '',
            flipX: item.flipX || false,
            flipY: item.flipY || false
          };
          
          // For text objects, capture additional properties
          if (item.type === 'text' || item.type === 'i-text' || item.type === 'textbox') {
            // @ts-ignore - these properties exist on text objects
            itemProps.fontSize = item.fontSize || 32;
            // @ts-ignore - these properties exist on text objects
            itemProps.fontFamily = item.fontFamily || 'Arial';
            // @ts-ignore - these properties exist on text objects
            itemProps.fill = item.fill || '#000000';
            // @ts-ignore - these properties exist on text objects
            itemProps.textAlign = item.textAlign || 'left';
            // @ts-ignore - these properties exist on text objects
            itemProps.fontWeight = item.fontWeight || 'normal';
            // @ts-ignore - these properties exist on text objects
            itemProps.text = item.text || '';
          }
          
          // For path objects, capture path data
          if (item.type === 'path') {
            // @ts-ignore - these properties exist on path objects
            itemProps.path = item.path;
            // @ts-ignore - these properties exist on path objects
            itemProps.pathOffset = item.pathOffset;
          }
          
          clonedItems.push({
            item,
            props: itemProps
          });
        });
        
        // Now that we've captured all properties, remove the group
        canvas.remove(activeObject);
        
        // Detect background rectangle(s) for all SVGs, not just special templates
        // This will handle steel backgrounds and other background types
        const backgroundRects: fabric.Object[] = [];
        
        // Find all potential background rectangles
        items.forEach((item: fabric.Object) => {
          // Check if this is a rectangle that could be a background
          if (item.type === 'rect') {
            // @ts-ignore - checking for fill property
            const fill = item.fill;
            // @ts-ignore - checking for width/height
            const width = item.width || 0;
            // @ts-ignore - checking for width/height
            const height = item.height || 0;
            
            // Check if this is likely a background rectangle:
            // 1. It has a fill color
            // 2. It's relatively large compared to the group
            const isLargeRect = (width * item.scaleX! > groupProps.width * 0.8) && 
                               (height * item.scaleY! > groupProps.height * 0.8);
            
            // Check for common background colors or large rectangles
            const isBackground = fill && (
              // Known template background colors
              fill === '#FFF5DC' || 
              fill === '#ECD8B7' || 
              // Steel/metallic background colors
              fill.includes('gradient') ||
              fill.includes('steel') ||
              fill.includes('metal') ||
              fill.includes('silver') ||
              fill.includes('gray') ||
              fill.includes('grey') ||
              // Or it's a large rectangle that's likely a background
              isLargeRect
            );
            
            if (isBackground) {
              backgroundRects.push(item);
            }
          }
        });
        
        // Sort backgrounds by size (largest first) to ensure main background is processed first
        backgroundRects.sort((a, b) => {
          // @ts-ignore - accessing width/height
          const areaA = (a.width || 0) * (a.height || 0) * (a.scaleX || 1) * (a.scaleY || 1);
          // @ts-ignore - accessing width/height
          const areaB = (b.width || 0) * (b.height || 0) * (b.scaleX || 1) * (b.scaleY || 1);
          return areaB - areaA; // Descending order
        });
        
        // Process all background rectangles
        backgroundRects.forEach(bgRect => {
          const bgItemProps = {
            left: bgRect.left || 0,
            top: bgRect.top || 0,
            width: bgRect.width || 0,
            height: bgRect.height || 0,
            scaleX: bgRect.scaleX || 1,
            scaleY: bgRect.scaleY || 1,
            angle: bgRect.angle || 0,
            originX: bgRect.originX || 'left',
            originY: bgRect.originY || 'top',
            flipX: bgRect.flipX || false,
            flipY: bgRect.flipY || false
          };
          
          // Calculate absolute position in canvas coordinates
          const newPoint = fabric.util.transformPoint(
            new fabric.Point(bgItemProps.left, bgItemProps.top), 
            groupMatrix
          );
          
          // Add to canvas with precise positioning
          canvas.add(bgRect);
          bgRect.set({
            left: newPoint.x,
            top: newPoint.y,
            angle: groupProps.angle + bgItemProps.angle,
            scaleX: bgItemProps.scaleX * groupProps.scaleX,
            scaleY: bgItemProps.scaleY * groupProps.scaleY,
            flipX: groupProps.flipX !== bgItemProps.flipX,
            flipY: groupProps.flipY !== bgItemProps.flipY,
            originX: bgItemProps.originX,
            originY: bgItemProps.originY,
            selectable: true,
            hasControls: true,
            borderColor: '#3b82f6',
            cornerColor: '#FFF',
            cornerSize: 10,
            transparentCorners: false
          });
          bgRect.setCoords();
          bgRect.sendToBack();
        });
        
        // Process and add each object to the canvas, preserving positions
        clonedItems.forEach((clonedItem: ClonedItem) => {
          const item = clonedItem.item;
          const itemProps = clonedItem.props;
          
          // Skip if this item is one of the background rectangles we already added
          if (backgroundRects.includes(item)) return;
          
          // Special handling for text objects in templates
          if (item.type === 'text' || item.type === 'i-text' || item.type === 'textbox') {
            const textContent = itemProps.text || '';
            
            if (!textContent.trim()) {
              return; // Skip empty text elements
            }
            
            // Calculate absolute position in canvas coordinates
            const newPoint = fabric.util.transformPoint(
              new fabric.Point(itemProps.left, itemProps.top), 
              groupMatrix
            );
            
            // Create a textbox object for better editing
            const textbox = new fabric.Textbox(textContent, {
              left: newPoint.x,
              top: newPoint.y,
              width: itemProps.width * groupProps.scaleX,
              fontSize: (itemProps.fontSize || 32) * groupProps.scaleX,
              fontFamily: itemProps.fontFamily || 'Arial',
              fill: itemProps.fill || '#000000',
              textAlign: itemProps.textAlign || 'left',
              fontWeight: itemProps.fontWeight || 'normal',
              angle: groupProps.angle + itemProps.angle,
              flipX: groupProps.flipX !== itemProps.flipX,
              flipY: groupProps.flipY !== itemProps.flipY,
              originX: itemProps.originX,
              originY: itemProps.originY,
              borderColor: '#3b82f6',
              cornerColor: '#FFF',
              cornerSize: 10,
              transparentCorners: false,
              selectable: true,
              hasControls: true,
              lockScalingX: false,
              lockScalingY: false,
              lockRotation: false,
              editable: true, // Ensure text is editable
              visible: true, // Explicitly make visible
              opacity: 1, // Ensure fully opaque
            });
            
            // Add the new textbox to canvas
            canvas.add(textbox);
            textbox.setCoords();
          } else if (item.type === 'rect') {
            // For rectangle objects, check if it's a background or content rectangle
            // @ts-ignore - checking for fill property
            const fill = item.fill;
            // @ts-ignore - checking for width/height
            const width = item.width || 0;
            // @ts-ignore - checking for width/height
            const height = item.height || 0;
            
            // Skip if this is likely a background rectangle that we missed earlier
            const isLargeRect = (width * item.scaleX! > groupProps.width * 0.8) && 
                               (height * item.scaleY! > groupProps.height * 0.8);
            
            if (isLargeRect && fill) {
              // This is likely a background rectangle we missed, so add it to the background
              const newPoint = fabric.util.transformPoint(
                new fabric.Point(itemProps.left, itemProps.top), 
                groupMatrix
              );
              
              item.set({
                left: newPoint.x,
                top: newPoint.y,
                angle: groupProps.angle + itemProps.angle,
                scaleX: itemProps.scaleX * groupProps.scaleX,
                scaleY: itemProps.scaleY * groupProps.scaleY,
                flipX: groupProps.flipX !== itemProps.flipX,
                flipY: groupProps.flipY !== itemProps.flipY,
                originX: itemProps.originX,
                originY: itemProps.originY,
                borderColor: '#3b82f6',
                cornerColor: '#FFF',
                cornerSize: 10,
                transparentCorners: false,
                selectable: true,
                hasControls: true
              });
              
              canvas.add(item);
              item.setCoords();
              item.sendToBack();
            } else {
              // This is a content rectangle, position it normally
              const newPoint = fabric.util.transformPoint(
                new fabric.Point(itemProps.left, itemProps.top), 
                groupMatrix
              );
              
              item.set({
                left: newPoint.x,
                top: newPoint.y,
                angle: groupProps.angle + itemProps.angle,
                scaleX: itemProps.scaleX * groupProps.scaleX,
                scaleY: itemProps.scaleY * groupProps.scaleY,
                flipX: groupProps.flipX !== itemProps.flipX,
                flipY: groupProps.flipY !== itemProps.flipY,
                originX: itemProps.originX,
                originY: itemProps.originY,
                borderColor: '#3b82f6',
                cornerColor: '#FFF',
                cornerSize: 10,
                transparentCorners: false,
                selectable: true,
                hasControls: true
              });
              
              canvas.add(item);
              item.setCoords();
            }
          } else {
            // For all other non-text, non-rectangle objects
            const newPoint = fabric.util.transformPoint(
              new fabric.Point(itemProps.left, itemProps.top), 
              groupMatrix
            );
            
            // For regular objects, adjust position and rotation
            const newProps: any = {
              left: newPoint.x,
              top: newPoint.y,
              angle: groupProps.angle + itemProps.angle,
              scaleX: itemProps.scaleX * groupProps.scaleX,
              scaleY: itemProps.scaleY * groupProps.scaleY,
              flipX: groupProps.flipX !== itemProps.flipX,
              flipY: groupProps.flipY !== itemProps.flipY,
              originX: itemProps.originX,
              originY: itemProps.originY,
              borderColor: '#3b82f6',
              cornerColor: '#FFF',
              cornerSize: 10,
              transparentCorners: false,
              selectable: true,
              hasControls: true,
              lockScalingX: false,
              lockScalingY: false,
              lockRotation: false,
            };
            
            // For path objects, preserve path data
            if (item.type === 'path' && itemProps.path) {
              newProps.path = itemProps.path;
              if (itemProps.pathOffset) {
                newProps.pathOffset = itemProps.pathOffset;
              }
            }
            
            // Apply all properties
            item.set(newProps);
            canvas.add(item);
            item.setCoords();
          }
        });
        
        // Update canvas and save state
        canvas.renderAll();
        save();
        
        // Provide special instructions for special templates or backgrounds
        if (isSpecialTemplate) {
          const templateName = isTestimonial ? "Testimonial" : "Coming Soon";
          toast.success(`${templateName} template ungrouped. All elements remain in their exact positions.`);
        } else if (backgroundRects.length > 0) {
          // Check if any of the backgrounds might be steel/metallic
          const hasMetallicBg = backgroundRects.some(bg => {
            // @ts-ignore - checking fill property
            const fill = bg.fill;
            return fill && (
              fill.includes('gradient') || 
              fill.includes('steel') || 
              fill.includes('metal') || 
              fill.includes('silver') || 
              fill.includes('gray') || 
              fill.includes('grey')
            );
          });
          
          if (hasMetallicBg) {
            toast.success(`SVG with metallic background ungrouped. All elements maintain their exact positions.`);
          } else {
            toast.success(`SVG ungrouped. All elements maintain their exact positions.`);
          }
        } else {
          toast.success(`SVG ungrouped. All elements maintain their exact positions.`);
        }
        
        return items.length; // Return number of ungrouped items
      }
      
      return 0; // Return 0 if nothing was ungrouped
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
          // @ts-ignore
          // Faulty TS library, fontSize exists.
          object.set({ fontSize: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontSize: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return FONT_SIZE;
      }

      // @ts-ignore
      // Faulty TS library, fontSize exists.
      const value = selectedObject.get("fontSize") || FONT_SIZE;

      return value;
    },
    changeTextAlign: (value: string) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, textAlign exists.
          object.set({ textAlign: value });
        }
      });
      canvas.renderAll();
    },
    getActiveTextAlign: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return "left";
      }

      // @ts-ignore
      // Faulty TS library, textAlign exists.
      const value = selectedObject.get("textAlign") || "left";

      return value;
    },
    changeFontUnderline: (value: boolean) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, underline exists.
          object.set({ underline: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontUnderline: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return false;
      }

      // @ts-ignore
      // Faulty TS library, underline exists.
      const value = selectedObject.get("underline") || false;

      return value;
    },
    changeFontLinethrough: (value: boolean) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, linethrough exists.
          object.set({ linethrough: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontLinethrough: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return false;
      }

      // @ts-ignore
      // Faulty TS library, linethrough exists.
      const value = selectedObject.get("linethrough") || false;

      return value;
    },
    changeFontStyle: (value: string) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, fontStyle exists.
          object.set({ fontStyle: value });
        }
      });
      canvas.renderAll();
    },
    getActiveFontStyle: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return "normal";
      }

      // @ts-ignore
      // Faulty TS library, fontStyle exists.
      const value = selectedObject.get("fontStyle") || "normal";

      return value;
    },
    changeFontWeight: (value: number) => {
      canvas.getActiveObjects().forEach((object) => {
        if (isTextType(object.type)) {
          // @ts-ignore
          // Faulty TS library, fontWeight exists.
          object.set({ fontWeight: value });
        }
      });
      canvas.renderAll();
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
          // @ts-ignore
          // Faulty TS library, fontFamily exists.
          object.set({ fontFamily: value });
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
    getActiveFontWeight: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return FONT_WEIGHT;
      }

      // @ts-ignore
      // Faulty TS library, fontWeight exists.
      const value = selectedObject.get("fontWeight") || FONT_WEIGHT;

      return value;
    },
    getActiveFontFamily: () => {
      const selectedObject = selectedObjects[0];

      if (!selectedObject) {
        return fontFamily;
      }

      // @ts-ignore
      // Faulty TS library, fontFamily exists.
      const value = selectedObject.get("fontFamily") || fontFamily;

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
