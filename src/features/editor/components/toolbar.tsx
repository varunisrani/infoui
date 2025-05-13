import { useState, useEffect } from "react";
import { toast } from "sonner";

import { 
  FaBold, 
  FaItalic, 
  FaStrikethrough, 
  FaUnderline
} from "react-icons/fa";
import { TbColorFilter } from "react-icons/tb";
import { BsBorderWidth } from "react-icons/bs";
import { RxTransparencyGrid } from "react-icons/rx";
import { 
  ArrowUp, 
  ArrowDown, 
  ChevronDown, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Trash,
  SquareSplitHorizontal,
  Copy,
  Ungroup,
  Edit,
  MoveHorizontal,
  MoveVertical
} from "lucide-react";

import { isTextType } from "@/features/editor/utils";
import { FontSizeInput } from "@/features/editor/components/font-size-input";
import { 
  ActiveTool, 
  Editor, 
  FONT_SIZE, 
  FONT_WEIGHT
} from "@/features/editor/types";

import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

interface Properties {
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  textAlign: string;
  underline: boolean;
  linethrough: boolean;
  fillColor: string;
  strokeColor: string;
  fontFamily: string;
  objectWidth: number;
  objectHeight: number;
  textContent: string;
}

interface ToolbarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

const defaultProperties: Properties = {
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  fontStyle: "normal",
  textAlign: "left",
  underline: false,
  linethrough: false,
  fillColor: "#000000",
  strokeColor: "",
  fontFamily: "Arial",
  objectWidth: 0,
  objectHeight: 0,
  textContent: "",
};

export const Toolbar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: ToolbarProps) => {
  const [properties, setProperties] = useState<Properties>({
    ...defaultProperties,
    fontSize: editor?.getActiveFontSize() || defaultProperties.fontSize,
    fontWeight: Number(editor?.getActiveFontWeight()) || defaultProperties.fontWeight,
    fontStyle: editor?.getActiveFontStyle() || defaultProperties.fontStyle,
    textAlign: editor?.getActiveTextAlign() || defaultProperties.textAlign,
    underline: editor?.getActiveFontUnderline() || defaultProperties.underline,
    linethrough: editor?.getActiveFontLinethrough() || defaultProperties.linethrough,
    fillColor: editor?.getActiveFillColor() || defaultProperties.fillColor,
    strokeColor: editor?.getActiveStrokeColor() || defaultProperties.strokeColor,
    fontFamily: editor?.getActiveFontFamily() || defaultProperties.fontFamily,
  });

  const selectedObject = editor?.selectedObjects[0];
  const selectedObjectType = editor?.selectedObjects[0]?.type;

  const isText = isTextType(selectedObjectType);
  const isImage = selectedObjectType === "image";
  const isGroup = selectedObjectType === "group";
  const isShape = !isText && !isImage && !isGroup && !!selectedObject;

  // Update properties when the selected object changes
  useEffect(() => {
    if (!editor?.canvas) return;
    
    const updateProperties = () => {
      const object = editor.canvas.getActiveObject();
      
      if (!object) {
        setProperties({
          fontSize: FONT_SIZE,
          fontWeight: FONT_WEIGHT,
          fontStyle: "normal",
          textAlign: "left",
          underline: false,
          linethrough: false,
          fillColor: "#000000",
          strokeColor: "",
          fontFamily: "Arial",
          objectWidth: 0,
          objectHeight: 0,
          textContent: "",
        });
        return;
      }
      
      // Determine object type
      const isText = object.type === "text";
      const isGroup = object.type === "group";
      const isImage = object.type === "image";
      const isShape = !isText && !isGroup && !isImage;
      
      // Get width and height
      let width = 0;
      let height = 0;
      
      if ((object as any).width && (object as any).height) {
        width = Math.round((object as any).width * ((object as any).scaleX || 1));
        height = Math.round((object as any).height * ((object as any).scaleY || 1));
      } else if ((object as any).getScaledWidth && (object as any).getScaledHeight) {
        width = Math.round((object as any).getScaledWidth());
        height = Math.round((object as any).getScaledHeight());
      }
      
      // Get text content for text objects
      let text = "";
      if (isText) {
        text = (object as any).text || "";
      }
      
      // Get current properties
      const fill = (object as any).fill || "#000000";
      const fontFamily = isText ? (object as any).fontFamily || "Arial" : "Arial";
      const fontSize = isText ? (object as any).fontSize || 16 : 16;
      const fontWeight = isText ? (object as any).fontWeight || "normal" : "normal";
      const textAlign = isText ? (object as any).textAlign || "left" : "left";
      const strokeColor = (object as any).stroke || "";
      const strokeWidth = (object as any).strokeWidth || 0;
      const underline = isText ? (object as any).underline || false : false;
      const italic = isText ? (object as any).fontStyle === "italic" : false;
      const opacity = (object as any).opacity !== undefined ? (object as any).opacity * 100 : 100;
      
      setProperties({
        fontSize,
        fontWeight,
        fontStyle: italic ? "italic" : "normal",
        textAlign,
        underline,
        linethrough: false, // Not currently tracking this property
        fillColor: fill,
        strokeColor: strokeColor,
        fontFamily: fontFamily,
        objectWidth: width,
        objectHeight: height,
        textContent: text,
      });
    };
    
    // Update properties when selection changes
    editor.canvas.on("selection:created", updateProperties);
    editor.canvas.on("selection:updated", updateProperties);
    editor.canvas.on("selection:cleared", updateProperties);
    
    // Initial update
    updateProperties();
    
    // Cleanup
    return () => {
      editor.canvas.off("selection:created", updateProperties);
      editor.canvas.off("selection:updated", updateProperties);
      editor.canvas.off("selection:cleared", updateProperties);
    };
  }, [editor?.canvas]);

  const onChangeFontSize = (value: number) => {
    if (!selectedObject) {
      return;
    }

    editor?.changeFontSize(value);
    setProperties((current) => ({
      ...current,
      fontSize: value,
    }));
  };

  const onChangeTextAlign = (value: string) => {
    if (!selectedObject) {
      return;
    }

    editor?.changeTextAlign(value);
    setProperties((current) => ({
      ...current,
      textAlign: value,
    }));
  };

  const onBoldClick = () => {
    if (!editor) {
      return;
    }

    const currentWeight = Number(properties.fontWeight);
    const newValue = currentWeight > 500 ? 400 : 700;

    editor?.changeFontWeight(newValue);
    setProperties((current) => ({
      ...current,
      fontWeight: newValue,
    }));
  };

  const toggleItalic = () => {
    if (!selectedObject) {
      return;
    }

    const isItalic = properties.fontStyle === "italic";
    const newValue = isItalic ? "normal" : "italic";

    editor?.changeFontStyle(newValue);
    setProperties((current) => ({
      ...current,
      fontStyle: newValue,
    }));
  };

  const toggleUnderline = () => {
    if (!selectedObject) {
      return;
    }

    const newValue = properties.underline ? false : true;

    editor?.changeFontUnderline(newValue);
    setProperties((current) => ({
      ...current,
      underline: newValue,
    }));
  };

  const toggleLinethrough = () => {
    if (!selectedObject) {
      return;
    }

    const newValue = properties.linethrough ? false : true;

    editor?.changeFontLinethrough(newValue);
    setProperties((current) => ({
      ...current,
      linethrough: newValue,
    }));
  };

  // Handle width changes for objects (excluding groups)
  const onChangeWidth = (newWidth: number) => {
    if (!newWidth || !properties.objectWidth || !editor || !editor.canvas) return;
    
    const object = editor.canvas.getActiveObject();
    if (!object) return;
    
    // Calculate the scaling factor
    const scaleFactor = newWidth / properties.objectWidth;
    
    // Get current scaleX
    const currentScaleX = (object as any).scaleX || 1;
    
    // Apply new scale using type assertion
    (object as any).set({ scaleX: currentScaleX * scaleFactor });
    
    // Update local state
    setProperties((prev) => ({ ...prev, objectWidth: newWidth }));
    
    // Render canvas with changes
    editor.canvas.requestRenderAll();
  };
  
  // Handle height changes for objects (excluding groups)
  const onChangeHeight = (newHeight: number) => {
    if (!newHeight || !properties.objectHeight || !editor || !editor.canvas) return;
    
    const object = editor.canvas.getActiveObject();
    if (!object) return;
    
    // Calculate the scaling factor
    const scaleFactor = newHeight / properties.objectHeight;
    
    // Get current scaleY
    const currentScaleY = (object as any).scaleY || 1;
    
    // Apply new scale using type assertion
    (object as any).set({ scaleY: currentScaleY * scaleFactor });
    
    // Update local state
    setProperties((prev) => ({ ...prev, objectHeight: newHeight }));
    
    // Render canvas with changes
    editor.canvas.requestRenderAll();
  };
  
  // Handle text content changes
  const onChangeTextContent = (newText: string) => {
    if (!editor || !editor.canvas) return;
    
    const object = editor.canvas.getActiveObject();
    if (!object || object.type !== 'text') return;
    
    // Update text content using type assertion
    (object as any).set({ text: newText });
    
    // Update local state
    setProperties((prev) => ({ ...prev, textContent: newText }));
    
    // Render canvas with changes
    editor.canvas.requestRenderAll();
  };

  if (editor?.selectedObjects.length === 0) {
    return (
      <div className="shrink-0 h-[56px] border-b bg-white w-full flex items-center overflow-x-auto z-[49] p-2 gap-x-2" />
    );
  }

  return (
    <div className="shrink-0 h-[56px] border-b bg-white w-full flex items-center overflow-x-auto z-[49] p-2 gap-x-2">
      {!isImage && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Color" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("fill")}
              size="icon"
              variant="ghost"
              className={cn(
                activeTool === "fill" && "bg-gray-100"
              )}
            >
              <div
                className="rounded-sm size-4 border"
                style={{ backgroundColor: properties.fillColor }}
              />
            </Button>
          </Hint>
        </div>
      )}
      {!isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Stroke color" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("stroke-color")}
              size="icon"
              variant="ghost"
              className={cn(
                activeTool === "stroke-color" && "bg-gray-100"
              )}
            >
              <div
                className="rounded-sm size-4 border-2 bg-white"
                style={{ borderColor: properties.strokeColor }}
              />
            </Button>
          </Hint>
        </div>
      )}
      {!isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Stroke width" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("stroke-width")}
              size="icon"
              variant="ghost"
              className={cn(
                activeTool === "stroke-width" && "bg-gray-100"
              )}
            >
              <BsBorderWidth className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Font" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("font")}
              size="icon"
              variant="ghost"
              className={cn(
                "w-auto px-2 text-sm",
                activeTool === "font" && "bg-gray-100"
              )}
            >
              <div className="max-w-[100px] truncate">
                {properties.fontFamily}
              </div>
              <ChevronDown className="size-4 ml-2 shrink-0" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Bold" side="bottom" sideOffset={5}>
            <Button
              onClick={onBoldClick}
              size="icon"
              variant="ghost"
              className={cn(
                properties.fontWeight > 500 && "bg-gray-100"
              )}
            >
              <FaBold className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Italic" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleItalic}
              size="icon"
              variant="ghost"
              className={cn(
                properties.fontStyle === "italic" && "bg-gray-100"
              )}
            >
              <FaItalic className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Underline" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleUnderline}
              size="icon"
              variant="ghost"
              className={cn(
                properties.underline && "bg-gray-100"
              )}
            >
              <FaUnderline className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Strike" side="bottom" sideOffset={5}>
            <Button
              onClick={toggleLinethrough}
              size="icon"
              variant="ghost"
              className={cn(
                properties.linethrough && "bg-gray-100"
              )}
            >
              <FaStrikethrough className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Align left" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeTextAlign("left")}
              size="icon"
              variant="ghost"
              className={cn(
                properties.textAlign === "left" && "bg-gray-100"
              )}
            >
              <AlignLeft className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Align center" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeTextAlign("center")}
              size="icon"
              variant="ghost"
              className={cn(
                properties.textAlign === "center" && "bg-gray-100"
              )}
            >
              <AlignCenter className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Align right" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeTextAlign("right")}
              size="icon"
              variant="ghost"
              className={cn(
                properties.textAlign === "right" && "bg-gray-100"
              )}
            >
              <AlignRight className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isText && (
        <div className="flex items-center h-full justify-center">
         <FontSizeInput
            value={properties.fontSize}
            onChange={onChangeFontSize}
         />
        </div>
      )}
      {isImage && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Filters" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("filter")}
              size="icon"
              variant="ghost"
              className={cn(
                activeTool === "filter" && "bg-gray-100"
              )}
            >
              <TbColorFilter className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      {isImage && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Remove background" side="bottom" sideOffset={5}>
            <Button
              onClick={() => onChangeActiveTool("remove-bg")}
              size="icon"
              variant="ghost"
              className={cn(
                activeTool === "remove-bg" && "bg-gray-100"
              )}
            >
              <SquareSplitHorizontal className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      <div className="flex items-center h-full justify-center">
        <Hint label="Bring forward" side="bottom" sideOffset={5}>
          <Button
            onClick={() => editor?.bringForward()}
            size="icon"
            variant="ghost"
          >
            <ArrowUp className="size-4" />
          </Button>
        </Hint>
      </div>
      <div className="flex items-center h-full justify-center">
        <Hint label="Send backwards" side="bottom" sideOffset={5}>
          <Button
            onClick={() => editor?.sendBackwards()}
            size="icon"
            variant="ghost"
          >
            <ArrowDown className="size-4" />
          </Button>
        </Hint>
      </div>
      <div className="flex items-center h-full justify-center">
        <Hint label="Opacity" side="bottom" sideOffset={5}>
          <Button
            onClick={() => onChangeActiveTool("opacity")}
            size="icon"
            variant="ghost"
            className={cn(activeTool === "opacity" && "bg-gray-100")}
          >
            <RxTransparencyGrid className="size-4" />
          </Button>
        </Hint>
      </div>
      
      {/* Width & Height for shapes and other elements (not for groups) */}
      {!isGroup && (
        <>
          <div className="flex items-center h-full justify-center">
            <Hint label="Width" side="bottom" sideOffset={5}>
              <div className="flex items-center gap-1 px-2 rounded-md">
                <MoveHorizontal className="size-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={properties.objectWidth}
                  onChange={(e) => onChangeWidth(parseInt(e.target.value, 10))}
                  className="w-[60px] h-8 text-sm"
                  min={1}
                />
              </div>
            </Hint>
          </div>
          <div className="flex items-center h-full justify-center">
            <Hint label="Height" side="bottom" sideOffset={5}>
              <div className="flex items-center gap-1 px-2 rounded-md">
                <MoveVertical className="size-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={properties.objectHeight}
                  onChange={(e) => onChangeHeight(parseInt(e.target.value, 10))}
                  className="w-[60px] h-8 text-sm"
                  min={1}
                />
              </div>
            </Hint>
          </div>
        </>
      )}
      
      {/* Text Edit Dialog */}
      {isText && (
        <div className="flex items-center h-full justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost"
              >
                <Hint label="Edit Text" side="bottom" sideOffset={5}>
                  <Edit className="size-4" />
                </Hint>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Text Content</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <textarea
                    rows={5}
                    className="w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={properties.textContent}
                    onChange={(e) => onChangeTextContent(e.target.value)}
                    placeholder="Enter your text here..."
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button type="button">
                    Done
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      <div className="flex items-center h-full justify-center">
        <Hint label="Duplicate" side="bottom" sideOffset={5}>
          <Button
            onClick={() => {
              editor?.onCopy();
              editor?.onPaste();
            }}
            size="icon"
            variant="ghost"
          >
            <Copy className="size-4" />
          </Button>
        </Hint>
      </div>
      {isGroup && (
        <div className="flex items-center h-full justify-center">
          <Hint label="Ungroup SVG (Preserves Positions)" side="bottom" sideOffset={5}>
            <Button
              onClick={() => {
                const count = editor?.ungroupSVG();
                if (count && count > 0) {
                  // Toast is now handled in the ungroupSVG function
                }
              }}
              size="icon"
              variant="ghost"
            >
              <Ungroup className="size-4" />
            </Button>
          </Hint>
        </div>
      )}
      <div className="flex items-center h-full justify-center">
        <Hint label="Delete" side="bottom" sideOffset={5}>
          <Button
            onClick={() => editor?.delete()}
            size="icon"
            variant="ghost"
            className="text-red-600"
          >
            <Trash className="size-4" />
          </Button>
        </Hint>
      </div>
    </div>
  );
};
