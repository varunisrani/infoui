"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Imported in case of future redirection needs
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input'; // Added Input import
import { svgStorage, svgNormalizer } from '@/lib/svg-utils'; // Uncommented imports

const NewFromAiPage = () => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgName, setSvgName] = useState<string>(""); 
  const [isLoading, setIsLoading] = useState(true); // Added isLoading state
  const router = useRouter(); // Instantiated in case of future redirection needs

  useEffect(() => {
    setIsLoading(true); // Start loading
    const storedSvg = localStorage.getItem("newlyGeneratedSvg");
    if (storedSvg) {
      setSvgContent(storedSvg);
      // Using a more descriptive default name, including a part of the date for uniqueness
      setSvgName(`AI Generated SVG - ${new Date().toISOString().split('T')[0]}`); 
      localStorage.removeItem("newlyGeneratedSvg");
      toast.info("AI Generated SVG loaded successfully!"); // Changed to toast.info
    } else {
      toast.info("No new AI SVG found in storage. You can generate one from the dashboard.");
    }
    setIsLoading(false); // Finish loading
  }, []); // Empty dependency array ensures this runs once on mount

  const handleSaveToLibrary = () => {
    if (!svgContent) {
      toast.error("No SVG content available to save.");
      return;
    }
    if (!svgName.trim()) {
      toast.error("SVG name cannot be empty. Please provide a name.");
      return;
    }

    try {
      const dataUrl = svgNormalizer.createDataUrl(svgContent);
      const savedSVG = svgStorage.saveSVG(svgContent, svgName.trim(), dataUrl);

      if (savedSVG) {
        toast.success(`SVG "${savedSVG.name}" saved successfully!`);
        // Optionally, disable the button or redirect, for now, just a toast
      } else {
        // This case might not be hit if saveSVG always throws on failure or returns a valid object.
        toast.error("Failed to save SVG. Unknown error occurred.");
      }
    } catch (error) {
      console.error("Error saving SVG to library:", error);
      toast.error(`Failed to save SVG: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground mb-4">Loading AI Generated SVG...</p>
      </div>
    );
  }

  if (!svgContent) { // This condition is met if isLoading is false and svgContent is still null
    return (
      <div className="container mx-auto p-4 text-center flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground mb-4">No SVG data found to display.</p>
        <Button onClick={() => router.push('/')} variant="outline">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">Review Your AI Generated SVG</h1>
        {/* Input for changing name can be added here or near the save button if desired in future */}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* SVG Preview Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-medium">Preview</h2>
          <div 
            aria-label="SVG Preview Container" // Added aria-label
            className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
            style={{ 
              minHeight: '300px', // Minimum height for the preview box
              maxHeight: '500px', // Maximum height for the preview box
              aspectRatio: '1/1'  // Maintain aspect ratio for the container
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgContent }} // svgContent is guaranteed to be non-null here
            />
          </div>
        </div>

        {/* SVG Code and Actions Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-medium">SVG Code & Actions</h2>
          <div className="space-y-4">
            <textarea
              readOnly
              value={svgContent}
              className="w-full h-64 md:h-80 p-3 border rounded-md font-mono text-sm bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
              aria-label="SVG Code"
            />
            <div className="space-y-2 mt-3">
              <label htmlFor="svgNameInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                SVG Name:
              </label>
              <Input
                id="svgNameInput"
                type="text"
                value={svgName}
                onChange={(e) => setSvgName(e.target.value)}
                placeholder="Enter a name for the SVG"
                className="w-full"
                disabled={!svgContent}
              />
            </div>
            <Button onClick={handleSaveToLibrary} className="w-full sm:w-auto text-base py-3 px-6 mt-3">
              Save to My SVGs
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Saving will add this SVG to your personal library.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewFromAiPage;
