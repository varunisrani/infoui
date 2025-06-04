"use client";

import { useState, useEffect, useRef, ReactNode } from 'react';
import { svgNormalizer } from '@/lib/svg-utils';

interface SvgRendererProps {
  svgContent?: string;
  width?: string | number;
  height?: string | number;
  preserveAspectRatio?: string;
  className?: string;
  onError?: (error: Error) => void;
  fallback?: ReactNode;
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
  fallback = null
}) => {
  const [processedSvg, setProcessedSvg] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgContent) {
      setProcessedSvg('');
      return;
    }

    try {
      const { processed } = svgNormalizer.fullyProcessSvg(svgContent);
      setProcessedSvg(processed);
    } catch (error) {
      console.error('Error processing SVG:', error);
      onError?.(error as Error);
      setProcessedSvg('');
    }
  }, [svgContent, onError]);
  
  if (!processedSvg) {
    return (
      <div 
        ref={containerRef}
        className={className}
        style={{ 
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {fallback}
      </div>
    );
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
}
;

