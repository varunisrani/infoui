"use client";

import { useState, useEffect, useRef } from 'react';
import { svgNormalizer } from '@/lib/svg-utils';

interface SvgRendererProps {
  svgContent?: string;
  width?: string | number;
  height?: string | number;
  preserveAspectRatio?: string;
  className?: string;
  onError?: (error: Error) => void;
  fallback?: string;
}

/**
 * A component for rendering SVG content consistently
 */
export const SvgRenderer: React.FC<SvgRendererProps> = ({
  svgContent,
  width = '100%',
  height = '100%',
  preserveAspectRatio = 'xMidYMid meet',
  className = '',
  onError,
  fallback = ''
}) => {
  const [processedSvg, setProcessedSvg] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!svgContent) {
      setProcessedSvg('');
      return;
    }

    try {
      // Parse and clean the SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      
      if (svgDoc.querySelector('parsererror')) {
        console.error("SVG parse error, using fallback");
        setProcessedSvg(fallback);
        return;
      }

      // Process the SVG
      const svgElement = svgDoc.documentElement;
      processAndSetSvg(svgElement);
    } catch (error) {
      console.error("Error processing SVG:", error);
      setProcessedSvg(fallback);
    }
  }, [svgContent, fallback]);
  
  const processAndSetSvg = (svgElement: Element) => {
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
  };
  
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