"use client";

import { useState, useEffect, useRef } from 'react';
import { svgNormalizer } from '@/lib/svg-utils';

interface SvgRendererProps {
  svgContent: string;
  width?: string | number;
  height?: string | number;
  preserveAspectRatio?: string;
  className?: string;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
}

/**
 * A component for rendering SVG content consistently
 */
export const SvgRenderer = ({
  svgContent,
  width = '100%',
  height = '100%',
  preserveAspectRatio = 'xMidYMid meet',
  className = '',
  onError,
  fallback,
}: SvgRendererProps) => {
  const [processedSvg, setProcessedSvg] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Skip processing if no content
    if (!svgContent) {
      setProcessedSvg('');
      return;
    }
    
    try {
      // First try to parse and validate the SVG with DOMParser
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      
      // Check for parse errors
      const parseError = svgDoc.querySelector('parsererror');
      if (parseError) {
        console.warn("SVG parse error, will try normalization:", parseError.textContent);
        // Continue with normalization which will handle the error
      } else {
        // If no parse error, try a simple approach first - add necessary attributes 
        // but keep original structure completely intact 
        const svgElement = svgDoc.documentElement;
        
        // Ensure basic attributes are set but preserve everything else
        if (!svgElement.hasAttribute('xmlns')) {
          svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        
        // Ensure width/height/viewBox if missing
        if (!svgElement.hasAttribute('width')) {
          svgElement.setAttribute('width', typeof width === 'number' ? `${width}px` : width);
        }
        
        if (!svgElement.hasAttribute('height')) {
          svgElement.setAttribute('height', typeof height === 'number' ? `${height}px` : height);
        }
        
        if (!svgElement.hasAttribute('viewBox') && 
            svgElement.hasAttribute('width') && 
            svgElement.hasAttribute('height')) {
          const svgWidth = svgElement.getAttribute('width') || '100';
          const svgHeight = svgElement.getAttribute('height') || '100';
          const numWidth = parseInt(svgWidth, 10) || 100;
          const numHeight = parseInt(svgHeight, 10) || 100;
          svgElement.setAttribute('viewBox', `0 0 ${numWidth} ${numHeight}`);
        }
        
        // Set preserveAspectRatio
        if (preserveAspectRatio && !svgElement.hasAttribute('preserveAspectRatio')) {
          svgElement.setAttribute('preserveAspectRatio', preserveAspectRatio);
        }
        
        // Convert back to string with all original elements intact
        const serializer = new XMLSerializer();
        const minimallyProcessedSvg = serializer.serializeToString(svgElement);
        
        // Try the minimal processing first
        setProcessedSvg(minimallyProcessedSvg);
        return;
      }
      
      // If there was a parse error or the simple approach didn't work,
      // use the more aggressive normalization
      const normalizedResult = svgNormalizer.fullyProcessSvg(svgContent);
      
      // Further process the SVG to ensure proper sizing
      let finalSvg = normalizedResult.processed;
      
      // Set explicit dimensions if provided
      if (width !== '100%' || height !== '100%') {
        const widthValue = typeof width === 'number' ? `${width}px` : width;
        const heightValue = typeof height === 'number' ? `${height}px` : height;
        
        // Replace width and height attributes
        finalSvg = finalSvg.replace(
          /<svg([^>]*)width="[^"]*"([^>]*)height="[^"]*"([^>]*)>/,
          `<svg$1width="${widthValue}"$2height="${heightValue}"$3>`
        );
        
        // If they were not found, add them
        if (!finalSvg.includes('width="') || !finalSvg.includes('height="')) {
          finalSvg = finalSvg.replace(
            /<svg([^>]*)>/,
            `<svg$1 width="${widthValue}" height="${heightValue}">`
          );
        }
      }
      
      // Set preserve aspect ratio if provided
      if (preserveAspectRatio) {
        finalSvg = finalSvg.replace(
          /<svg([^>]*)preserveAspectRatio="[^"]*"([^>]*)>/,
          `<svg$1preserveAspectRatio="${preserveAspectRatio}"$2>`
        );
        
        // If not found, add it
        if (!finalSvg.includes('preserveAspectRatio="')) {
          finalSvg = finalSvg.replace(
            /<svg([^>]*)>/,
            `<svg$1 preserveAspectRatio="${preserveAspectRatio}">`
          );
        }
      }
      
      setProcessedSvg(finalSvg);
    } catch (error) {
      console.error('Error processing SVG:', error);
      if (onError) {
        onError(error as Error);
      }
      
      // Provide a fallback in case of error
      if (fallback) {
        return;
      }
      
      setProcessedSvg(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${width}" height="${height}">
          <rect width="200" height="200" fill="#f8f9fa" />
          <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#6c757d" text-anchor="middle">
            SVG Error
          </text>
        </svg>
      `);
    }
  }, [svgContent, width, height, preserveAspectRatio, onError]);
  
  if (!processedSvg) {
    return fallback || null;
  }
  
  return (
    <div 
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: processedSvg }}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    />
  );
}; 