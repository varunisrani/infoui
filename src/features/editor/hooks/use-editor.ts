import { fabric } from "fabric";
import { useCallback, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { parseSVG, makeAbsolute } from 'svg-path-parser';

// Define our own SvgPathCommand type since the library doesn't export it correctly
type SvgPathCommand = {
  code: string;
  command?: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  rx?: number;
  ry?: number;
  xAxisRotation?: number;
  largeArc?: boolean;
  sweep?: boolean;
  relative?: boolean; // Added for compatibility with makeAbsolute
};

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
          // Check if this is a specific problematic SVG with many paths (like the one with 2,354 paths)
          const pathCount = (svgString.match(/<path/g) || []).length;
          
          // Special handling for extremely complex SVGs with many paths
          if (pathCount > 1000) {
            toast.info(`This SVG contains ${pathCount} paths. Processing optimally...`);
            
            // Parse SVG dimensions
            const viewBoxMatch = svgString.match(/viewBox=["']([^"']*)["']/);
            const widthMatch = svgString.match(/width=["']([^"']*)["']/);
            const heightMatch = svgString.match(/height=["']([^"']*)["']/);
            
            let width = 300;
            let height = 300;
            
            if (widthMatch && widthMatch[1]) {
              width = parseFloat(widthMatch[1]);
            }
            
            if (heightMatch && heightMatch[1]) {
              height = parseFloat(heightMatch[1]);
            }
            
            // If viewBox is specified, use it for more accurate dimensions
            if (viewBoxMatch && viewBoxMatch[1]) {
              const viewBox = viewBoxMatch[1].split(/\s+/).map(parseFloat);
              if (viewBox.length === 4) {
                if (isNaN(width) || width === 0) {
                  width = viewBox[2];
                }
                if (isNaN(height) || height === 0) {
                  height = viewBox[3];
                }
              }
            }
            
            // For very complex SVGs, add as image instead of parsing all paths
            // which gives better performance while still allowing basic editing
            fabric.Image.fromURL(
              `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`,
              (image) => {
                // Scale while maintaining aspect ratio
                const workspace = getWorkspace();
                const maxWidth = workspace?.width || 500;
                const maxHeight = workspace?.height || 500;
                
                // Calculate scaling to fit within workspace
                let scale = 1;
                if (width > maxWidth || height > maxHeight) {
                  const scaleX = maxWidth / width;
                  const scaleY = maxHeight / height;
                  scale = Math.min(scaleX, scaleY);
                }
                
                image.scale(scale);
                
                // Set additional metadata to help with ungrouping later
                image.set({
                  data: {
                    originalSvgString: svgString,
                    isComplexSvg: true,
                    pathCount: pathCount
                  }
                });
                
                addToCanvas(image);
                toast.success(`Complex SVG added to canvas. Using optimized rendering for ${pathCount} paths.`);
                
                // Add a hint about ungrouping
                setTimeout(() => {
                  toast.info("Tip: For complex SVGs, consider editing in a vector graphics program before ungrouping.");
                }, 2000);
              },
              {
                crossOrigin: "anonymous",
              }
            );
            return;
          }
          
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

      // Handle image objects that contain SVG data
      if (activeObject.type === 'image') {
        const imgObj = activeObject as fabric.Image;
        
        // Check if this is a complex SVG we added as an image
        if (imgObj.data && imgObj.data.isComplexSvg && imgObj.data.originalSvgString) {
          const pathCount = imgObj.data.pathCount || 0;
          
          // Warn user about complexity
          const proceed = confirm(`This SVG contains ${pathCount} elements and is very complex. Ungrouping may cause performance issues. Continue?`);
          if (!proceed) {
            return 0;
          }
          
          toast.info("Preparing complex SVG for ungrouping...");
          
          try {
            // Save state for undo
            save();
            
            // Create loading indicator
            const progressIndicator = document.createElement('div');
            progressIndicator.style.position = 'fixed';
            progressIndicator.style.top = '50%';
            progressIndicator.style.left = '50%';
            progressIndicator.style.transform = 'translate(-50%, -50%)';
            progressIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            progressIndicator.style.color = 'white';
            progressIndicator.style.padding = '20px';
            progressIndicator.style.borderRadius = '8px';
            progressIndicator.style.zIndex = '9999';
            progressIndicator.style.fontSize = '16px';
            progressIndicator.innerText = 'Parsing complex SVG...';
            document.body.appendChild(progressIndicator);
            
            // Get the original position and size of the image
            const imgLeft = imgObj.left || 0;
            const imgTop = imgObj.top || 0;
            const imgScaleX = imgObj.scaleX || 1;
            const imgScaleY = imgObj.scaleY || 1;
            const imgWidth = (imgObj.width || 0) * imgScaleX;
            const imgHeight = (imgObj.height || 0) * imgScaleY;
            
            // Remove the image from canvas
            canvas.remove(imgObj);
            
            // Load SVG with fabric parser - use setTimeout to prevent UI freezing
            setTimeout(() => {
              try {
                fabric.loadSVGFromString(imgObj.data.originalSvgString, (objects, options) => {
                  // Create group from loaded objects
                  if (objects.length === 0) {
                    document.body.removeChild(progressIndicator);
                    toast.error("Failed to parse SVG data.");
                    undo();
                    return;
                  }
                  
                  // If too many objects, warn and limit
                  if (objects.length > 1000) {
                    progressIndicator.innerText = 'Too many objects. Limiting to 1000...';
                    objects = objects.slice(0, 1000);
                  }
                  
                  progressIndicator.innerText = 'Creating SVG group...';
                  
                  const svgGroup = new fabric.Group(objects, {
                    left: imgLeft,
                    top: imgTop,
                    width: imgWidth,
                    height: imgHeight,
                    scaleX: 1,
                    scaleY: 1
                  });
                  
                  // Add to canvas and select
                  canvas.add(svgGroup);
                  canvas.setActiveObject(svgGroup);
                  canvas.renderAll();
                  
                  document.body.removeChild(progressIndicator);
                  
                  // Now use the regular group ungrouping logic
                  setTimeout(() => {
                    toast.info("Now ungrouping the SVG...");
                    const activeObj = canvas.getActiveObject();
                    let ungroupCount = 0;
                    
                    if (activeObj && activeObj.type === 'group') {
                      // Call ungroupSVG on the next tick to ensure it's not called recursively
                      // which would cause "this" context issues
                      setTimeout(() => {
                        // We need to manually call the ungroupSVG function from the Editor object
                        // since 'this' refers to a different context in the setTimeout callback
                        const editorObject = {
                          ungroupSVG: () => {
                            const activeObj = canvas.getActiveObject();
                            if (!activeObj || activeObj.type !== 'group') return 0;
                            
                            const group = activeObj as fabric.Group;
                            const items = group.getObjects();
                            
                            try {
                              save();
                              
                              // Get group matrix
                              const groupMatrix = group.calcTransformMatrix();
                              const groupProps = {
                                left: group.left || 0,
                                top: group.top || 0,
                                scaleX: group.scaleX || 1,
                                scaleY: group.scaleY || 1,
                                angle: group.angle || 0,
                                flipX: group.flipX || false,
                                flipY: group.flipY || false,
                                opacity: group.opacity || 1,
                              };
                              
                              // @ts-ignore - internal fabric.js method
                              group._restoreObjectsState();
                              canvas.remove(group);
                              
                              // Process items in batches
                              const batchSize = 100;
                              let processed = 0;
                              
                              const processNextBatch = () => {
                                const currentBatch = items.slice(processed, processed + batchSize);
                                if (currentBatch.length === 0) {
                                  // Done processing
                                  const allItems = canvas.getObjects().filter(o => items.includes(o));
                                  if (allItems.length > 0) {
                                    canvas.discardActiveObject();
                                    const sel = new fabric.ActiveSelection(allItems, { canvas });
                                    canvas.setActiveObject(sel);
                                  }
                                  canvas.renderAll();
                                  toast.success(`${items.length} elements processed from complex SVG.`);
                                  return;
                                }
                                
                                // Process this batch
                                currentBatch.forEach(item => {
                                  const newPoint = fabric.util.transformPoint(
                                    new fabric.Point(item.left || 0, item.top || 0),
                                    groupMatrix
                                  );
                                  
                                  item.set({
                                    left: newPoint.x,
                                    top: newPoint.y,
                                    angle: (groupProps.angle + (item.angle || 0)) % 360,
                                    scaleX: (item.scaleX || 1) * groupProps.scaleX,
                                    scaleY: (item.scaleY || 1) * groupProps.scaleY,
                                    flipX: groupProps.flipX !== item.flipX,
                                    flipY: groupProps.flipY !== item.flipY,
                                    opacity: (item.opacity || 1) * groupProps.opacity,
                                    selectable: true,
                                    hasControls: true,
                                    evented: true
                                  });
                                  
                                  canvas.add(item);
                                });
                                
                                processed += currentBatch.length;
                                if (processed % 300 === 0 || processed === items.length) {
                                  canvas.renderAll();
                                }
                                
                                // Schedule next batch
                                setTimeout(processNextBatch, 0);
                              };
                              
                              // Start processing
                              processNextBatch();
                              
                              return items.length;
                            } catch (err) {
                              console.error("Error ungrouping complex SVG:", err);
                              toast.error("Failed to ungroup complex SVG elements.");
                              undo();
                              return 0;
                            }
                          }
                        };
                        
                        ungroupCount = editorObject.ungroupSVG();
                      }, 50);
                    }
                  }, 100);
                });
              } catch (err) {
                document.body.removeChild(progressIndicator);
                console.error("Error processing complex SVG:", err);
                toast.error("Failed to process complex SVG.");
                undo();
              }
            }, 100);
            
            return 0; // Return value will be updated in callback
          } catch (err) {
            console.error("Error handling complex SVG image:", err);
            toast.error("Failed to ungroup complex SVG.");
            return 0;
          }
        }
      }

      // Check if we're dealing with a complex SVG group
      if (activeObject.type === 'group') {
        const group = activeObject as fabric.Group;
        const items = group.getObjects().map(o => o);
        
        // Add a complexity check - if too many paths, process differently
        if (items.length > 500) {
          // Confirm with user for extremely large SVGs
          if (items.length > 2000) {
            const proceed = confirm(`This SVG contains ${items.length} elements and is extremely complex. It may cause performance issues. Continue?`);
            if (!proceed) {
              return 0;
            }
          } else {
            toast.info(`This SVG contains ${items.length} elements and is very complex. Processing in batches...`);
          }
          
          try {
            // Save state for undo
            save();
            
            // Get group's transformation matrix and properties
            const groupMatrix = group.calcTransformMatrix();
            const groupProps = {
              left: group.left || 0,
              top: group.top || 0,
              scaleX: group.scaleX || 1,
              scaleY: group.scaleY || 1,
              angle: group.angle || 0,
              flipX: group.flipX || false,
              flipY: group.flipY || false,
              opacity: group.opacity || 1,
              originX: group.originX || 'left',
              originY: group.originY || 'top'
            };
            
            // Process in smaller batches for extremely large SVGs
            const batchSize = items.length > 1000 ? 50 : 100;
            const totalBatches = Math.ceil(items.length / batchSize);
            
            // First restore objects' state
            // @ts-ignore - internal fabric.js method
            group._restoreObjectsState();
            canvas.remove(group);
            
            // Progress indicator
            const progressIndicator = document.createElement('div');
            progressIndicator.style.position = 'fixed';
            progressIndicator.style.top = '50%';
            progressIndicator.style.left = '50%';
            progressIndicator.style.transform = 'translate(-50%, -50%)';
            progressIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            progressIndicator.style.color = 'white';
            progressIndicator.style.padding = '20px';
            progressIndicator.style.borderRadius = '8px';
            progressIndicator.style.zIndex = '9999';
            progressIndicator.style.fontSize = '16px';
            progressIndicator.innerText = 'Processing SVG: 0%';
            document.body.appendChild(progressIndicator);
            
            // Create array to hold processed items with memory optimization
            let processedItems: fabric.Object[] = [];
            
            // Process batches with requestAnimationFrame for better UI responsiveness
            let batchIndex = 0;
            
            const processNextBatch = () => {
              if (batchIndex < totalBatches) {
                const startIdx = batchIndex * batchSize;
                const endIdx = Math.min(startIdx + batchSize, items.length);
                const nextBatch = items.slice(startIdx, endIdx);
                
                // Process each item in the batch
                nextBatch.forEach((item: fabric.Object) => {
                  // Calculate absolute position
                  const newPoint = fabric.util.transformPoint(
                    new fabric.Point(item.left || 0, item.top || 0),
                    groupMatrix
                  );
                  
                  // Set common properties
                  const commonProps = {
                    left: newPoint.x,
                    top: newPoint.y,
                    angle: (groupProps.angle + (item.angle || 0)) % 360,
                    scaleX: (item.scaleX || 1) * groupProps.scaleX,
                    scaleY: (item.scaleY || 1) * groupProps.scaleY,
                    flipX: groupProps.flipX !== item.flipX,
                    flipY: groupProps.flipY !== item.flipY,
                    opacity: (item.opacity || 1) * groupProps.opacity,
                    originX: item.originX || 'left',
                    originY: item.originY || 'top',
                    selectable: true,
                    hasControls: true,
                    evented: true
                  };
                  
                  // Handle specific object types
                  if (item.type === 'text' || item.type === 'textbox') {
                    // Preserve text properties
                    Object.assign(commonProps, {
                      fontSize: (item as fabric.Text).fontSize,
                      fontFamily: (item as fabric.Text).fontFamily,
                      fontWeight: (item as fabric.Text).fontWeight,
                      fontStyle: (item as fabric.Text).fontStyle,
                      textAlign: (item as fabric.Text).textAlign,
                      underline: (item as fabric.Text).underline,
                      linethrough: (item as fabric.Text).linethrough,
                      editable: true
                    });
                  } else if (item.type === 'path') {
                    // Preserve path properties
                    Object.assign(commonProps, {
                      path: (item as fabric.Path).path,
                      fill: item.fill,
                      stroke: item.stroke,
                      strokeWidth: item.strokeWidth
                    });
                  } else if (item.type === 'image') {
                    // Preserve image properties
                    Object.assign(commonProps, {
                      crossOrigin: 'anonymous',
                      filters: (item as fabric.Image).filters
                    });
                  }
                  
                  // Apply all properties
                  item.set(commonProps);
                  canvas.add(item);
                  item.setCoords();
                  processedItems.push(item);
                });
                
                // Update progress
                const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
                progressIndicator.innerText = `Processing SVG: ${progress}%`;
                
                // Render only every few batches to improve performance
                if (batchIndex % 5 === 0 || batchIndex === totalBatches - 1) {
                  canvas.renderAll();
                }
                
                batchIndex++;
                
                // Use requestAnimationFrame for better performance
                requestAnimationFrame(() => {
                  // Add a small delay for extremely large SVGs to prevent UI freezing
                  if (items.length > 1500) {
                    setTimeout(processNextBatch, 5);
                  } else {
                    processNextBatch();
                  }
                });
              } else {
                // All batches processed
                document.body.removeChild(progressIndicator);
                
                if (processedItems.length > 0) {
                  // For very large numbers of items, just select a subset to prevent selection performance issues
                  let itemsToSelect = processedItems;
                  if (processedItems.length > 1000) {
                    toast.info("Too many items to select all at once. Selecting subset of items.");
                    itemsToSelect = processedItems.slice(0, 1000);
                  }
                  
                  // Select all ungrouped items
                  canvas.discardActiveObject();
                  const sel = new fabric.ActiveSelection(itemsToSelect, { canvas });
                  canvas.setActiveObject(sel);
                  canvas.renderAll();
                  
                  toast.success(`SVG ungrouped successfully. ${processedItems.length} elements processed.`);
                  
                  // Clear reference to processed items to free memory
                  processedItems = [];
                }
              }
            };
            
            // Start processing batches
            processNextBatch();
            
            return items.length; // Return number of ungrouped items
          } catch (err) {
            console.error("Error ungrouping complex SVG:", err);
            toast.error("Failed to ungroup complex SVG. Please try with a simpler file.");
            undo();
            return 0;
          }
        }
        
        // Original handling for normal-sized groups - keep existing code
        if (items.length === 0) {
          toast.info("Group is empty.");
          return 0;
        }

        try {
          // Save state for undo
          save();

          // Get group's transformation matrix
          const groupMatrix = group.calcTransformMatrix();
          const groupProps = {
            left: group.left || 0,
            top: group.top || 0,
            scaleX: group.scaleX || 1,
            scaleY: group.scaleY || 1,
            angle: group.angle || 0,
            flipX: group.flipX || false,
            flipY: group.flipY || false,
            opacity: group.opacity || 1,
            originX: group.originX || 'left',
            originY: group.originY || 'top'
          };

          // Restore objects' state and remove group
          // @ts-ignore - internal fabric.js method
          group._restoreObjectsState(); 
          canvas.remove(group);
          
          // Process each item
          items.forEach((item: fabric.Object) => {
            // Calculate absolute position
            const newPoint = fabric.util.transformPoint(
              new fabric.Point(item.left || 0, item.top || 0),
              groupMatrix
            );

            // Set common properties
            const commonProps = {
              left: newPoint.x,
              top: newPoint.y,
              angle: (groupProps.angle + (item.angle || 0)) % 360,
              scaleX: (item.scaleX || 1) * groupProps.scaleX,
              scaleY: (item.scaleY || 1) * groupProps.scaleY,
              flipX: groupProps.flipX !== item.flipX,
              flipY: groupProps.flipY !== item.flipY,
              opacity: (item.opacity || 1) * groupProps.opacity,
              originX: item.originX || 'left',
              originY: item.originY || 'top',
              selectable: true,
              hasControls: true,
              evented: true
            };

            // Handle specific object types
            if (item.type === 'text' || item.type === 'textbox') {
              // Preserve text properties
              Object.assign(commonProps, {
                fontSize: (item as fabric.Text).fontSize,
                fontFamily: (item as fabric.Text).fontFamily,
                fontWeight: (item as fabric.Text).fontWeight,
                fontStyle: (item as fabric.Text).fontStyle,
                textAlign: (item as fabric.Text).textAlign,
                underline: (item as fabric.Text).underline,
                linethrough: (item as fabric.Text).linethrough,
                editable: true
              });
            } else if (item.type === 'path') {
              // Preserve path properties
              Object.assign(commonProps, {
                path: (item as fabric.Path).path,
                fill: item.fill,
                stroke: item.stroke,
                strokeWidth: item.strokeWidth
              });
            } else if (item.type === 'image') {
              // Preserve image properties
              Object.assign(commonProps, {
                crossOrigin: 'anonymous',
                filters: (item as fabric.Image).filters
              });
            }

            // Apply all properties
            item.set(commonProps);
            canvas.add(item); 
            item.setCoords();
          });
          
          // Select all ungrouped items
          const sel = new fabric.ActiveSelection(items, { canvas: canvas });
          canvas.setActiveObject(sel);
          canvas.renderAll();

          toast.success(`${items.length} ${items.length === 1 ? "item has" : "items have"} been ungrouped.`);
          return items.length;
        } catch (err) {
          console.error("Error ungrouping:", err);
          toast.error("Failed to ungroup elements.");
          undo();
          return 0;
        }
      }

      // Handle path objects - keep the existing code for path ungrouping
      if (activeObject.type === 'path' && (activeObject as fabric.Path).path) {
        const pathObject = activeObject as fabric.Path;
        let pathDataString = '';

        // Check if path data is complex before parsing
        const isComplexPath = () => {
          if (typeof pathObject.path === 'string') {
            // Check the complexity of the path based on string length or command count
            const pathStr = pathObject.path as string;
            return pathStr.length > 10000 || 
                   (pathStr.match(/[MLHVCSQTAZ]/gi) || []).length > 500;
          } else if (Array.isArray(pathObject.path)) {
            return pathObject.path.length > 500;
          }
          return false;
        };

        // If path is extremely complex, warn the user
        if (isComplexPath()) {
          const proceed = confirm("This SVG path is very complex and may cause your browser to freeze when ungrouping. Do you want to proceed anyway?");
          if (!proceed) {
            return 0;
          }
          toast.info("Processing complex path. This may take a moment...");
        }

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

          // Create progress indicator for long parsing operations
          const progressIndicator = document.createElement('div');
          progressIndicator.style.position = 'fixed';
          progressIndicator.style.top = '50%';
          progressIndicator.style.left = '50%';
          progressIndicator.style.transform = 'translate(-50%, -50%)';
          progressIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          progressIndicator.style.color = 'white';
          progressIndicator.style.padding = '20px';
          progressIndicator.style.borderRadius = '8px';
          progressIndicator.style.zIndex = '9999';
          progressIndicator.style.fontSize = '16px';
          progressIndicator.innerText = 'Parsing SVG path data...';
          document.body.appendChild(progressIndicator);

          // Parse path data with a slight delay to allow UI to update
          setTimeout(() => {
            try {
              let parsedCommands: SvgPathCommand[];
              
              // Optimize parsing for very large paths by chunking the path into subpaths at 'M' commands
              if (typeof pathDataString === 'string' && pathDataString.length > 30000) {
                progressIndicator.innerText = 'Path is very large. Optimizing...';
                
                // Pre-split the path into chunks to make parsing more efficient
                const segments = pathDataString.split(/(?=[Mm])/);
                parsedCommands = [];
                
                // Parse each segment separately
                for (let i = 0; i < segments.length; i++) {
                  if (segments[i].trim() === '') continue;
                  
                  // Make sure each segment starts with M/m
                  const segmentStr = segments[i].trim();
                  const segment = (i === 0 && !segmentStr.match(/^[Mm]/)) 
                    ? 'M0,0 ' + segmentStr 
                    : segmentStr;
                    
                  try {
                    const segmentCommands = parseSVG(segment);
                    if (segmentCommands && segmentCommands.length > 0) {
                      // @ts-ignore - makeAbsolute has compatibility issues with our type definition
                      makeAbsolute(segmentCommands);
                      parsedCommands.push(...segmentCommands);
                    }
                  } catch (e) {
                    console.warn("Skipping invalid path segment:", segment, e);
                  }
                  
                  // Update progress for very large paths
                  if (segments.length > 10 && i % 5 === 0) {
                    progressIndicator.innerText = `Parsing path: ${Math.round((i / segments.length) * 100)}%`;
                  }
                }
              } else {
                // For smaller paths, parse normally
                parsedCommands = parseSVG(pathDataString);
                // @ts-ignore - makeAbsolute has compatibility issues with our type definition
                makeAbsolute(parsedCommands); // Modifies in place
              }
              
              progressIndicator.innerText = 'Creating new paths...';
              
              if (!parsedCommands || parsedCommands.length === 0) {
                document.body.removeChild(progressIndicator);
                toast.info("Path data parsed into zero commands. Cannot ungroup.");
                undo();
                return 0;
              }

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

              // Batch process commands for better performance
              const batchSize = parsedCommands.length > 2000 ? 200 : 500;
              const totalCommands = parsedCommands.length;
              
              // Create a function to process commands in batches
              const processCommandBatch = (startIdx: number) => {
                const endIdx = Math.min(startIdx + batchSize, totalCommands);
                
                for (let i = startIdx; i < endIdx; i++) {
                  const command = parsedCommands[i];
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
                
                // Update progress
                const progress = Math.round((Math.min(endIdx, totalCommands) / totalCommands) * 100);
                progressIndicator.innerText = `Processing path commands: ${progress}%`;
                
                // If there are more commands to process, schedule the next batch
                if (endIdx < totalCommands) {
                  requestAnimationFrame(() => {
                    // For very large command sets, add a small delay to keep UI responsive
                    if (totalCommands > 2000) {
                      setTimeout(() => processCommandBatch(endIdx), 5);
                    } else {
                      processCommandBatch(endIdx);
                    }
                  });
                } else {
                  // Done processing all commands
                  // Handle any remaining path data
                  if (currentSubPathD.trim() !== "") {
                    try {
                      const p = new fabric.Path(currentSubPathD.trim(), { ...commonPathProps });
                      newPaths.push(p);
                    } catch (e) {
                      console.warn("Failed to create fabric.Path from final sub-path segment:", currentSubPathD.trim(), e);
                    }
                  }
                  
                  // For extremely large path sets, throttle memory by limiting paths
                  if (newPaths.length > 5000) {
                    progressIndicator.innerText = 'Too many paths detected. Optimizing...';
                    // Take a representative sample to prevent browser crash
                    const sampleSize = 2000;
                    const sampledPaths: fabric.Path[] = [];
                    const step = Math.floor(newPaths.length / sampleSize);
                    
                    for (let i = 0; i < newPaths.length; i += step) {
                      sampledPaths.push(newPaths[i]);
                      if (sampledPaths.length >= sampleSize) break;
                    }
                    
                    // Use sampled paths instead of all paths
                    while (newPaths.length > 0) newPaths.pop(); // Clear array without reassigning
                    sampledPaths.forEach(p => newPaths.push(p)); // Add sampled paths back
                    
                    toast.info(`SVG path contained too many elements (${newPaths.length}). Using a representative sample to maintain performance.`);
                  }
                  
                  finalizePaths();
                }
              };
              
              // Function to finalize path processing
              const finalizePaths = () => {
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
                  document.body.removeChild(progressIndicator);
                  toast.info("Path does not contain multiple distinct shapes to ungroup or is a single shape.");
                  undo(); // Reverts the canvas.remove(pathObject) and the save()
                  return 0;
                }

                progressIndicator.innerText = 'Adding paths to canvas...';
                canvas.remove(pathObject); 

                // Process in batches if there are many paths
                if (newPaths.length > 300) {
                  processBatchedPaths();
                } else {
                  // Original code for smaller path sets
                  const finalItemsToSelect: fabric.Object[] = [];

                  const tempGroup = new fabric.Group(newPaths, {
                    left: pathObject.left,
                    top: pathObject.top,
                    angle: pathObject.angle,
                    scaleX: pathObject.scaleX,
                    scaleY: pathObject.scaleY,
                    originX: pathObject.originX,
                    originY: pathObject.originY,
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
                  
                  document.body.removeChild(progressIndicator);
                  
                  canvas.discardActiveObject(); // Deselect the original path
                  if(finalItemsToSelect.length > 0){
                    const sel = new fabric.ActiveSelection(finalItemsToSelect, { canvas: canvas });
                    canvas.setActiveObject(sel);
                  }
                  canvas.renderAll();
                  toast.success(`${finalItemsToSelect.length} elements created from the path.`);
                  return finalItemsToSelect.length;
                }
              };
              
              // Function to process batched paths
              const processBatchedPaths = () => {
                toast.info(`This operation will create ${newPaths.length} new objects. Processing in batches...`);
                  
                const finalItemsToSelect: fabric.Object[] = [];
                const batchSize = newPaths.length > 1000 ? 50 : 100;
                const totalBatches = Math.ceil(newPaths.length / batchSize);
                
                // Process batches with improved performance
                let batchIndex = 0;
                
                const processNextPathBatch = () => {
                  if (batchIndex < totalBatches) {
                    const startIdx = batchIndex * batchSize;
                    const endIdx = Math.min(startIdx + batchSize, newPaths.length);
                    const batchPaths = newPaths.slice(startIdx, endIdx);
                    
                    const tempGroup = new fabric.Group(batchPaths, {
                      left: pathObject.left,
                      top: pathObject.top,
                      angle: pathObject.angle,
                      scaleX: pathObject.scaleX,
                      scaleY: pathObject.scaleY,
                      originX: pathObject.originX,
                      originY: pathObject.originY,
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
                    
                    // Update progress
                    const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
                    progressIndicator.innerText = `Adding paths to canvas: ${progress}%`;
                    
                    // Only render periodically to improve performance
                    if (batchIndex % 5 === 0 || batchIndex === totalBatches - 1) {
                      canvas.renderAll();
                    }
                    
                    batchIndex++;
                    
                    // Use requestAnimationFrame with delay for better performance
                    requestAnimationFrame(() => {
                      if (newPaths.length > 1000) {
                        setTimeout(processNextPathBatch, 5);
                      } else {
                        setTimeout(processNextPathBatch, 0);
                      }
                    });
                  } else {
                    // All batches processed, select all items
                    document.body.removeChild(progressIndicator);
                    
                    if (finalItemsToSelect.length > 0) {
                      canvas.discardActiveObject();
                      
                      // For extremely large numbers of items, just select a subset to prevent selection performance issues
                      let itemsToSelect = finalItemsToSelect;
                      if (finalItemsToSelect.length > 1000) {
                        toast.info("Too many items to select all at once. Selecting subset of items.");
                        itemsToSelect = finalItemsToSelect.slice(0, 1000);
                      }
                      
                      const sel = new fabric.ActiveSelection(itemsToSelect, { canvas: canvas });
                      canvas.setActiveObject(sel);
                      canvas.renderAll();
                      
                      toast.success(`${finalItemsToSelect.length} elements created from the path.`);
                    }
                  }
                };
                
                // Start processing path batches
                processNextPathBatch();
                
                return newPaths.length;
              };
              
              // Start processing commands
              processCommandBatch(0);
              
            } catch (err) {
              document.body.removeChild(progressIndicator);
              console.error("Error parsing path:", err);
              toast.error("Failed to parse path data. It might be malformed.");
              undo();
              return 0;
            }
          }, 50); // Small delay to allow UI to update before heavy processing
          
          return 0; // Return value will be provided by the callback
          
        } catch (err) {
          console.error("Error ungrouping path:", err);
          toast.error("Failed to ungroup path. It might be too complex or malformed.");
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
