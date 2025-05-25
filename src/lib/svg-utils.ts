/**
 * SVG Utilities
 *
 * This module provides comprehensive utilities for SVG handling:
 * - SVG normalization and cleaning
 * - SVG rendering and preview generation
 * - SVG storage management
 * - SVG validation and error handling
 */

import { fabric } from "fabric";

// Interface for stored SVGs
export interface StoredSVG {
  id: string;
  name: string;
  content: string;
  dataUrl: string;
  dateAdded: number;
}

// Storage key - centralized for consistency
export const SVG_STORAGE_KEY = 'canvas_svgs';

/**
 * SVG Storage Management Functions
 */
export const svgStorage = {
  // Get all SVGs from storage
  getSVGs: (): StoredSVG[] => {
    if (typeof window === 'undefined') return [];

    try {
      // Check main storage
      const data = localStorage.getItem(SVG_STORAGE_KEY);
      let svgs: StoredSVG[] = data ? JSON.parse(data) : [];

      // Check for the old storage format (for backward compatibility)
      try {
        const oldStorageKey = 'canvas_svgs';
        if (SVG_STORAGE_KEY !== oldStorageKey) {
          const oldData = localStorage.getItem(oldStorageKey);
          if (oldData) {
            const oldSvgs = JSON.parse(oldData);

            // Convert old format to new format if needed
            const convertedOldSvgs = oldSvgs.map((oldSvg: any) => {
              if (!oldSvg.dataUrl && oldSvg.preview) {
                return {
                  ...oldSvg,
                  dataUrl: oldSvg.preview,
                  dateAdded: oldSvg.createdAt ? new Date(oldSvg.createdAt).getTime() : Date.now()
                };
              }
              return oldSvg;
            });

            // Merge, avoiding duplicates by ID
            const existingIds = new Set(svgs.map(svg => svg.id));
            const uniqueOldSvgs = convertedOldSvgs.filter((svg: any) =>
              !existingIds.has(svg.id)
            );

            svgs = [...svgs, ...uniqueOldSvgs];
          }
        }
      } catch (e) {
        console.error("Error reading from old storage format:", e);
        // Continue with what we have
      }

      return svgs;
    } catch (error) {
      console.error("Error retrieving SVGs from storage:", error);
      return [];
    }
  },

  // Save an SVG to storage
  saveSVG: (svgContent: string, name: string, dataUrl: string): StoredSVG => {
    try {
      // Make sure the SVG is fully processed before saving
      const { processed, dataUrl: processedDataUrl } = svgNormalizer.fullyProcessSvg(svgContent);
      
      const svgs = svgStorage.getSVGs();
      const newSVG = {
        id: crypto.randomUUID(),
        content: processed, // Use the processed SVG content
        name: name,
        dataUrl: processedDataUrl || dataUrl, // Use the processed data URL
        dateAdded: Date.now()
      };
  
      svgs.push(newSVG);
      localStorage.setItem(SVG_STORAGE_KEY, JSON.stringify(svgs));
      
      // Dispatch both a storage event and custom event to notify other components
      if (typeof window !== 'undefined') {
        // Standard storage event for tab/window communication
        window.dispatchEvent(new StorageEvent('storage', {
          key: SVG_STORAGE_KEY,
          newValue: JSON.stringify(svgs)
        }));
        
        // Custom event for in-page communication
        window.dispatchEvent(new CustomEvent('svg-library-updated'));
      }
      
      return newSVG;
    } catch (error) {
      console.error("Error saving SVG to storage:", error);
      // Create a minimal valid SVG if processing failed
      const fallbackSVG = {
        id: crypto.randomUUID(),
        content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><text x="10" y="50" font-family="Arial">Error: Invalid SVG</text></svg>`,
        name: name || "Error SVG",
        dataUrl: dataUrl || "",
        dateAdded: Date.now()
      };
      return fallbackSVG;
    }
  },

  // Delete an SVG from storage
  deleteSVG: (id: string): boolean => {
    const svgs = svgStorage.getSVGs();
    const filtered = svgs.filter(svg => svg.id !== id);
    localStorage.setItem(SVG_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
};

/**
 * SVG Normalization & Cleaning Functions
 */
export const svgNormalizer = {
  // Ensure SVG has proper namespace
  ensureNamespace: (svgContent: string): string => {
    let processedContent = svgContent;

    // Add xmlns attribute if missing
    if (!processedContent.includes('xmlns=')) {
      processedContent = processedContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Add XLink namespace if needed for href attributes
    if ((processedContent.includes('xlink:href') || processedContent.includes('href=')) 
        && !processedContent.includes('xmlns:xlink=')) {
      processedContent = processedContent.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    return processedContent;
  },

  // Ensure SVG has proper dimensions
  ensureDimensions: (svgContent: string): string => {
    let processedContent = svgContent;

    // Extract existing viewBox if present
    const viewBoxMatch = processedContent.match(/viewBox=['"]([^'"]*)['"]/);
    let viewBoxValue = '0 0 1080 1080';

    if (viewBoxMatch && viewBoxMatch[1]) {
      // Keep the original viewBox to preserve element positioning
      viewBoxValue = viewBoxMatch[1];
      // Remove the existing viewBox to avoid duplicates
      processedContent = processedContent.replace(/viewBox=['"][^'"]*['"]/, '');
    } else {
      // Try to extract width and height to create a viewBox
      const widthMatch = processedContent.match(/width=['"]([^'"]*)['"]/);
      const heightMatch = processedContent.match(/height=['"]([^'"]*)['"]/);
      
      if (widthMatch && heightMatch) {
        const width = parseFloat(widthMatch[1]) || 1080;
        const height = parseFloat(heightMatch[1]) || 1080;
        viewBoxValue = `0 0 ${width} ${height}`;
      }
    }

    // Ensure viewBox attribute with original or default value
    processedContent = processedContent.replace('<svg', `<svg viewBox="${viewBoxValue}"`);

    // Extract width and height from viewBox for consistency
    const viewBoxParts = viewBoxValue.split(/\s+/);
    let width = '1080';
    let height = '1080';

    if (viewBoxParts.length === 4) {
      width = viewBoxParts[2];
      height = viewBoxParts[3];
    }

    // Always set width and height attributes to match viewBox
    // First remove any existing width and height attributes
    processedContent = processedContent.replace(/width="[^"]*"/g, '');
    processedContent = processedContent.replace(/height="[^"]*"/g, '');

    // Then add the dimensions that match the viewBox
    processedContent = processedContent.replace(/<svg([^>]*)>/, `<svg$1 width="${width}" height="${height}">`);

    // Add preserveAspectRatio if missing
    if (!processedContent.includes('preserveAspectRatio=')) {
      processedContent = processedContent.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
    }

    return processedContent;
  },

  // Remove problematic elements like external references
  removeProblematicElements: (svgElement: SVGSVGElement): void => {
    // Only remove script tags (potential security risk)
    const scripts = svgElement.querySelectorAll('script');
    scripts.forEach(script => script.parentNode?.removeChild(script));
  },

  // Ensure styles are properly applied
  ensureStyles: (svgElement: SVGSVGElement): void => {
    // Make sure all elements have basic styling if needed
    const elements = svgElement.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line');
    elements.forEach(el => {
      // Check various ways an element could have fill defined
      const hasFill = el.hasAttribute('fill') || 
                      el.hasAttribute('style') && el.getAttribute('style')?.includes('fill') ||
                      getComputedStyle(el).fill !== 'none';
      
      if (!hasFill) {
        // For stroke-only elements like line or polyline with stroke
        if (el.hasAttribute('stroke') || 
            el.tagName.toLowerCase() === 'line' || 
            (el.hasAttribute('style') && el.getAttribute('style')?.includes('stroke'))) {
          el.setAttribute('fill', 'none');
        } else {
          el.setAttribute('fill', '#000000');
        }
      }
      
      // Ensure stroke elements have stroke-width if stroke exists
      if (el.hasAttribute('stroke') && !el.hasAttribute('stroke-width')) {
        el.setAttribute('stroke-width', '1');
      }
    });
    
    // Make sure text elements have proper defaults
    const textElements = svgElement.querySelectorAll('text');
    textElements.forEach(el => {
      if (!el.hasAttribute('font-family')) {
        el.setAttribute('font-family', 'Arial, sans-serif');
      }
    });
  },

  // Convert classes to inline styles
  convertClassesToInlineStyles: (svgContent: string): string => {
    let processedContent = svgContent;

    // Extract style definitions
    const styleRegex = /<style>([\s\S]*?)<\/style>/g;
    const styleMatch = styleRegex.exec(processedContent);

    if (styleMatch && styleMatch[1]) {
      const styleContent = styleMatch[1];

      // Find all classes in the SVG
      const classRegex = /class="([^"]*)"/g;
      let classMatch;

      while ((classMatch = classRegex.exec(processedContent)) !== null) {
        const className = classMatch[1];

        // Find style for this class
        const classStyleRegex = new RegExp(`\\.${className}\\s*{([^}]*)}`, 'g');
        const classStyleMatch = classStyleRegex.exec(styleContent);

        if (classStyleMatch && classStyleMatch[1]) {
          // Extract style properties
          const styleProps = classStyleMatch[1].trim();

          // Replace class with inline style
          processedContent = processedContent.replace(
            new RegExp(`class="${className}"`, 'g'),
            'style="' + styleProps + '"'
          );
        }
      }

      // Remove style tags after processing
      processedContent = processedContent.replace(/<style>[\s\S]*?<\/style>/g, '');
    }

    return processedContent;
  },

  // Create a data URL from SVG content
  createDataUrl: (svgContent: string): string => {
    const encodedSvg = encodeURIComponent(svgContent);
    return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  },

  // Parse and clean SVG content while preserving structure
  parseAndClean: (svgContent: string): { cleaned: string, error?: Error } => {
    try {
      // Ensure proper namespace and dimensions first
      let content = svgNormalizer.ensureNamespace(svgContent);
      content = svgNormalizer.ensureDimensions(content);

      // Parse the SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(content, 'image/svg+xml');

      // Check for parse errors
      const parseError = svgDoc.querySelector('parsererror');
      if (parseError) {
        console.warn("SVG parse error:", parseError.textContent);
        return { cleaned: content, error: new Error("SVG parsing error") };
      }

      const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;

      // Always set standard dimensions for consistency
      svgElement.setAttribute('width', '1080');
      svgElement.setAttribute('height', '1080');

      // Set preserveAspectRatio to ensure proper scaling
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // Process and clean the SVG (more gently than before)
      svgNormalizer.removeProblematicElements(svgElement);
      svgNormalizer.ensureStyles(svgElement);

      // Make sure original transforms and grouping are preserved
      const groups = svgElement.querySelectorAll('g');
      groups.forEach(group => {
        // Ensure transform attribute is preserved
        if (group.hasAttribute('transform')) {
          // Make sure the transform attribute is kept intact
          const transform = group.getAttribute('transform');
          group.setAttribute('transform', transform || '');
        }
      });

      // Ensure all elements have their styles and positions preserved
      const elements = svgElement.querySelectorAll('*');
      elements.forEach(el => {
        // Preserve fill colors
        if (el.hasAttribute('fill')) {
          const fill = el.getAttribute('fill');
          el.setAttribute('fill', fill || '');
        }

        // Preserve stroke properties
        if (el.hasAttribute('stroke')) {
          const stroke = el.getAttribute('stroke');
          el.setAttribute('stroke', stroke || '');
        }

        // Preserve opacity
        if (el.hasAttribute('opacity')) {
          const opacity = el.getAttribute('opacity');
          el.setAttribute('opacity', opacity || '');
        }

        // Preserve position attributes
        ['x', 'y', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'points', 'd'].forEach(attr => {
          if (el.hasAttribute(attr)) {
            const value = el.getAttribute(attr);
            el.setAttribute(attr, value || '');
          }
        });

        // Preserve font properties for text elements
        if (el.tagName.toLowerCase() === 'text') {
          ['font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline'].forEach(attr => {
            if (el.hasAttribute(attr)) {
              const value = el.getAttribute(attr);
              el.setAttribute(attr, value || '');
            }
          });

          // Preserve text content
          if (el.textContent) {
            el.textContent = el.textContent;
          }
        }
      });

      // Convert back to string
      const serializer = new XMLSerializer();
      const cleanedContent = serializer.serializeToString(svgElement);

      return { cleaned: cleanedContent };
    } catch (error) {
      console.error("Error cleaning SVG:", error);
      return { cleaned: svgContent, error: error as Error };
    }
  },

  // Full processing pipeline for SVG cleaning
  fullyProcessSvg: (svgContent: string): { processed: string, dataUrl: string } => {
    // Add debugging info
    console.log(`[SVG] Processing SVG: ${svgContent ? svgContent.substring(0, 50) + '...' : 'undefined/null'}`);
    
    // Handle null or empty content gracefully
    if (!svgContent || typeof svgContent !== 'string') {
      console.error("[SVG] Invalid SVG content received:", svgContent);
      // Return a simple placeholder SVG
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
        <rect width="1080" height="1080" fill="#f0f0f0" />
        <text x="540" y="540" font-family="Arial" font-size="24" fill="red" text-anchor="middle">Invalid SVG</text>
      </svg>`;
      const dataUrl = svgNormalizer.createDataUrl(fallbackSvg);
      return { processed: fallbackSvg, dataUrl };
    }

    try {
      // First try minimal processing to preserve original structure
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

      // Check for parse errors
      const parseError = svgDoc.querySelector('parsererror');
      if (!parseError) {
        // Only make minimal changes if SVG is valid
        const svgElement = svgDoc.documentElement;

        // Basic namespace
        if (!svgElement.hasAttribute('xmlns')) {
          svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }

        // Add XLink namespace if needed
        if (!svgElement.hasAttribute('xmlns:xlink') &&
            (svgContent.includes('xlink:href') || svgContent.includes('use') || svgContent.includes('href='))) {
          svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        }

        // Add minimal viewBox if needed
        if (!svgElement.hasAttribute('viewBox')) {
          if (svgElement.hasAttribute('width') && svgElement.hasAttribute('height')) {
            const width = svgElement.getAttribute('width') || '100';
            const height = svgElement.getAttribute('height') || '100';
            // Handle percentage-based dimensions
            const numWidth = width.includes('%') ? 1080 : (parseInt(width, 10) || 1080);
            const numHeight = height.includes('%') ? 1080 : (parseInt(height, 10) || 1080);
            svgElement.setAttribute('viewBox', `0 0 ${numWidth} ${numHeight}`);
          } else {
            // Default viewBox if no dimensions available
            svgElement.setAttribute('viewBox', '0 0 1080 1080');
          }
        }

        // Ensure width and height attributes exist
        if (!svgElement.hasAttribute('width') || svgElement.getAttribute('width') === '100%') {
          const viewBox = svgElement.getAttribute('viewBox');
          if (viewBox) {
            const parts = viewBox.split(/\s+/);
            if (parts.length === 4) {
              svgElement.setAttribute('width', parts[2]);
            } else {
              svgElement.setAttribute('width', '1080');
            }
          } else {
            svgElement.setAttribute('width', '1080');
          }
        }

        if (!svgElement.hasAttribute('height') || svgElement.getAttribute('height') === '100%') {
          const viewBox = svgElement.getAttribute('viewBox');
          if (viewBox) {
            const parts = viewBox.split(/\s+/);
            if (parts.length === 4) {
              svgElement.setAttribute('height', parts[3]);
            } else {
              svgElement.setAttribute('height', '1080');
            }
          } else {
            svgElement.setAttribute('height', '1080');
          }
        }
        
        // Add preserveAspectRatio if missing
        if (!svgElement.hasAttribute('preserveAspectRatio')) {
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }

        // Clean up potentially harmful elements
        const scripts = svgElement.querySelectorAll('script');
        scripts.forEach(script => script.parentNode?.removeChild(script));

        // Ensure all shape elements have fill attributes
        svgNormalizer.ensureStyles(svgElement as unknown as SVGSVGElement);

        // Preserve all groups and their transforms
        const groups = svgElement.querySelectorAll('g');
        groups.forEach(group => {
          // Make sure transform attributes are preserved
          if (group.hasAttribute('transform')) {
            const transform = group.getAttribute('transform');
            group.setAttribute('data-transform', transform || '');
          }
        });

        // Create data URL for preview
        const serializer = new XMLSerializer();
        const minimallyProcessed = serializer.serializeToString(svgElement);
        const dataUrl = svgNormalizer.createDataUrl(minimallyProcessed);

        console.log(`[SVG] Successfully processed SVG with minimal changes (${minimallyProcessed.length} bytes)`);
        return { processed: minimallyProcessed, dataUrl };
      } else {
        console.warn('SVG parse error detected, applying more thorough cleaning', parseError.textContent);
      }
    } catch (error) {
      console.warn('Error with minimal SVG processing, falling back to more aggressive processing', error);
      // If minimal processing fails, continue with more aggressive approach
    }

    // More aggressive processing for problematic SVGs
    // Apply initial cleaning steps but be careful with the structure
    const sanitized = svgContent
      .replace(/@import\s+url\(['"]https?:\/\/[^'"]+['"]\)/g, '') // Remove external resources
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;'); // Fix XML entities

    // Parse and clean the SVG
    const { cleaned } = svgNormalizer.parseAndClean(sanitized);

    // Create data URL for preview
    const dataUrl = svgNormalizer.createDataUrl(cleaned);
    
    console.log(`[SVG] Processed SVG with aggressive cleaning (${cleaned.length} bytes)`);
    return { processed: cleaned, dataUrl };
  }
};

/**
 * SVG Testing & Validation Functions
 */
export const svgTester = {
  // Test if SVG can be loaded by Fabric.js
  testWithFabric: async (svgContent: string): Promise<boolean> => {
    console.log(`[SVG Test] Starting Fabric.js compatibility test`);
    return new Promise((resolve) => {
      try {
        // Create temporary canvas for testing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 10;
        tempCanvas.height = 10;
        const fabricCanvas = new fabric.Canvas(tempCanvas);

        // Set a timeout in case loading hangs
        const timeoutId = setTimeout(() => {
          fabricCanvas.dispose();
          console.warn('[SVG Test] Test timed out after 1000ms');
          resolve(false);
        }, 1000);

        // Try to load the SVG
        fabric.loadSVGFromString(svgContent, (objects) => {
          clearTimeout(timeoutId);
          fabricCanvas.dispose();

          if (!objects || objects.length === 0) {
            console.warn('[SVG Test] No objects found in SVG');
            resolve(false);
          } else {
            console.log(`[SVG Test] Successfully loaded ${objects.length} objects with Fabric.js`);
            resolve(true);
          }
        });
      } catch (error) {
        console.error("[SVG Test] Error testing SVG with Fabric:", error);
        resolve(false);
      }
    });
  },

  // Get a fallback version of the SVG with more aggressive cleaning
  getFallbackVersion: (svgContent: string): string => {
    try {
      // Apply more aggressive cleaning
      let cleanedSvg = svgContent
        .replace(/<defs>[\s\S]*?<\/defs>/g, '') // Remove defs
        .replace(/<style>[\s\S]*?<\/style>/g, '') // Remove styles
        .replace(/class="[^"]*"/g, '') // Remove classes
        .replace(/@import[^;]*;/g, ''); // Remove imports

      // Add necessary attributes
      if (!cleanedSvg.includes('preserveAspectRatio')) {
        cleanedSvg = cleanedSvg.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
      }

      return cleanedSvg;
    } catch (error) {
      console.error("Error creating fallback SVG:", error);
      return svgContent;
    }
  }
};

/**
 * SVG canvas utilities - functions for working with SVGs in the canvas
 */
export const svgCanvasUtils = {
  // Add SVG to canvas - returns true if successful, false if failed
  addSvgToCanvas: async (canvas: fabric.Canvas, svgContent: string): Promise<boolean> => {
    console.log('[SVG Canvas] Adding SVG to canvas');
    return new Promise<boolean>((resolve) => {
      try {
        // First normalize the SVG content with strict preservation of dimensions and styles
        const normalized = svgNormalizer.fullyProcessSvg(svgContent);
        const cleanedSvg = normalized.processed;

        console.log('[SVG Canvas] Loading SVG with fabric.loadSVGFromString...', cleanedSvg.substring(0, 100) + '...');

        // Use Fabric's built-in SVG loader with options to preserve SVG structure
        fabric.loadSVGFromString(cleanedSvg, (objects, options) => {
          // Check if objects were found
          if (!objects || objects.length === 0) {
            console.warn('[SVG Canvas] No objects found in SVG');
            resolve(false);
            return;
          }

          console.log(`[SVG Canvas] Successfully loaded ${objects.length} objects`);

          // Get canvas dimensions
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();

          // Get SVG viewbox dimensions from options
          const svgWidth = options.viewBoxWidth || 1080;
          const svgHeight = options.viewBoxHeight || 1080;

          // Calculate scaling factor to fit in canvas while preserving aspect ratio
          const scale = Math.min(
            (canvasWidth * 0.8) / svgWidth,
            (canvasHeight * 0.8) / svgHeight
          );

          // Create a group with all SVG elements, preserving their exact positions
          const svgGroup = new fabric.Group(objects, {
            name: 'svg-group',
            selectable: true,
            hasControls: true,
            // Preserve original dimensions
            scaleX: scale,
            scaleY: scale,
            // Ensure SVG is not distorted
            lockUniScaling: true,
            // Preserve SVG viewbox dimensions
            width: svgWidth,
            height: svgHeight,
            // Center the group in the canvas
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center'
          });

          // Ensure all objects in the group maintain their original positions, colors and styles
          objects.forEach(obj => {
            // Preserve original fill and stroke
            if (obj.fill) obj.set('fill', obj.fill);
            if (obj.stroke) obj.set('stroke', obj.stroke);
            if (obj.strokeWidth) obj.set('strokeWidth', obj.strokeWidth);
            if (obj.opacity) obj.set('opacity', obj.opacity);

            // Preserve original position relative to the SVG viewbox
            if (obj.left !== undefined) obj.set('left', obj.left);
            if (obj.top !== undefined) obj.set('top', obj.top);

            // Preserve transforms
            if ((obj as any).transformMatrix) (obj as any).set('transformMatrix', (obj as any).transformMatrix);
            if (obj.angle) obj.set('angle', obj.angle);
          });

          // Add to canvas
          canvas.add(svgGroup);
          canvas.setActiveObject(svgGroup);
          canvas.renderAll();
          
          console.log('[SVG Canvas] SVG group added successfully to canvas');
          resolve(true);
        });
      } catch (error) {
        console.error('[SVG Canvas] Error loading SVG:', error);
        resolve(false);
      }
    });
  },

  // Fallback method: add SVG as image if direct SVG loading fails
  addSvgAsImageFallback: async (canvas: fabric.Canvas, svgContent: string, name: string): Promise<boolean> => {
    console.log('[SVG Fallback] Attempting to add SVG as image');
    return new Promise<boolean>((resolve) => {
      try {
        // Normalize the SVG content first with strict preservation of dimensions and styles
        const normalized = svgNormalizer.fullyProcessSvg(svgContent);
        const cleanedSvg = normalized.processed;

        // Extract viewBox dimensions from the SVG
        const viewBoxMatch = cleanedSvg.match(/viewBox=['"]([^'"]*)['"]/);
        let viewBoxWidth = 1080;
        let viewBoxHeight = 1080;

        if (viewBoxMatch && viewBoxMatch[1]) {
          const viewBoxParts = viewBoxMatch[1].split(/\s+/);
          if (viewBoxParts.length === 4) {
            viewBoxWidth = parseFloat(viewBoxParts[2]);
            viewBoxHeight = parseFloat(viewBoxParts[3]);
            console.log(`[SVG Fallback] Extracted viewBox dimensions: ${viewBoxWidth}x${viewBoxHeight}`);
          }
        }

        // Create a data URL
        const svgBlob = new Blob([cleanedSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        // Load as image
        fabric.Image.fromURL(url, (img) => {
          // Check if image loaded successfully
          if (!img) {
            console.warn('Failed to load SVG as image');
            resolve(false);
            return;
          }

          // Get canvas dimensions
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();

          // Calculate scaling factor to fit in canvas while preserving aspect ratio
          const scale = Math.min(
            (canvasWidth * 0.8) / viewBoxWidth,
            (canvasHeight * 0.8) / viewBoxHeight
          );

          // Set properties
          img.set({
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            name: `svg-image-${name || 'untitled'}`,
            // Ensure image is not distorted
            lockUniScaling: true,
            // Set the original SVG dimensions
            width: viewBoxWidth,
            height: viewBoxHeight
          });

          // Add to canvas
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();

          // Clean up URL
          URL.revokeObjectURL(url);
          
          console.log('[SVG Fallback] Successfully added SVG as image');
          resolve(true);
        }, {
          crossOrigin: 'anonymous',
          // Preserve SVG dimensions
          width: viewBoxWidth,
          height: viewBoxHeight
        });
      } catch (error) {
        console.error('[SVG Fallback] Error loading SVG as image:', error);
        resolve(false);
      }
    });
  }
};
