"use client";

import { useState, useCallback, useEffect } from "react";
import { AlertTriangle, Image as ImageIcon, Upload } from "lucide-react";
import Image from "next/image";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Interface for stored images
interface StoredImage {
  id: string;
  url: string;
  name: string;
  createdAt: string;
}

// LocalStorage key for images
const STORAGE_KEY = 'canvas_images';

// Helper functions for localStorage images
const imageStorage = {
  getImages: (): StoredImage[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveImage: (imageData: string, name: string): StoredImage => {
    const images = imageStorage.getImages();
    const newImage = {
      id: crypto.randomUUID(),
      url: imageData,
      name: name,
      createdAt: new Date().toISOString()
    };
    
    images.push(newImage);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    return newImage;
  },
  
  deleteImage: (id: string): void => {
    const images = imageStorage.getImages();
    const filtered = images.filter(img => img.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
};

interface ImageSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const ImageSidebar = ({ editor, activeTool, onChangeActiveTool }: ImageSidebarProps) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load images from localStorage
  useEffect(() => {
    if (activeTool === "images") {
      setIsLoading(true);
      const storedImages = imageStorage.getImages();
      setImages(storedImages);
      setIsLoading(false);
    }
  }, [activeTool]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const imageData = e.target.result.toString();
        const newImage = imageStorage.saveImage(imageData, file.name);
        setImages(prev => [newImage, ...prev]);
        toast.success('Image uploaded successfully');
      }
    };
    reader.onerror = () => {
      toast.error('Failed to upload image');
    };
    reader.readAsDataURL(file);
    
    // Reset input value so the same file can be uploaded again
    event.target.value = '';
  }, []);

  // Add image to canvas
  const addImageToCanvas = useCallback((imageUrl: string) => {
    editor?.addImage(imageUrl);
  }, [editor]);

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "images" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Images" description="Add images to your canvas" />
      <div className="p-4 border-b">
        <div className="space-y-2">
          <Label htmlFor="image-upload" className="cursor-pointer w-full">
            <div className="flex items-center justify-center w-full h-10 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800">
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </div>
            <input 
              id="image-upload" 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </Label>
          <p className="text-xs text-muted-foreground text-center">
            Max 5MB · JPG, PNG, GIF
          </p>
        </div>
      </div>
      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      )}
      {!isLoading && images.length === 0 && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No images uploaded yet</p>
          <p className="text-xs text-muted-foreground text-center max-w-[250px]">
            Upload your first image to use it in your designs
          </p>
        </div>
      )}
      <ScrollArea className="flex-1">
        {!isLoading && images.length > 0 && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {images.map((image) => (
                <button
                  onClick={() => addImageToCanvas(image.url)}
                  key={image.id}
                  className="relative w-full h-[100px] group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border"
                >
                  <Image
                    src={image.url}
                    alt={image.name}
                    width={200}
                    height={100}
                    className="w-full h-full object-cover"
                    unoptimized // Since we're using data URLs
                  />
                  <div className="absolute left-0 bottom-0 w-full text-[10px] truncate text-white p-1 bg-black/50 text-left">
                    {image.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
