"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Loader2,
  PlusCircle,
  MessageSquare,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Editor } from "@/features/editor/types";
import { svgNormalizer, svgCanvasUtils } from "@/lib/svg-utils";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  editor: Editor | undefined;
  onClose: () => void;
}

export const AiAssistant = ({ editor, onClose }: AiAssistantProps) => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [svgCode, setSvgCode] = useState<string | null>(null);
  const [isAddingToCanvas, setIsAddingToCanvas] = useState(false);
  
  // References
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to send a message to the AI assistant
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      setIsSending(true);
      
      // Add user message to chat
      const userMessage: Message = {
        role: "user",
        content: newMessage
      };
      
      // Update messages with the user's message
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setNewMessage("");
      
      // TEMPORARY: Mock API response until backend is complete
      // In production, this will be replaced with the actual API call
      setTimeout(() => {
        const mockResponse = {
          messages: [
            ...updatedMessages,
            {
              role: "assistant" as const,
              content: generateMockResponse(newMessage)
            }
          ],
          svg_code: newMessage.toLowerCase().includes("create") || 
                    newMessage.toLowerCase().includes("generate") || 
                    newMessage.toLowerCase().includes("draw") ? 
                    generateMockSVG() : null
        };
        
        setMessages(mockResponse.messages);
        if (mockResponse.svg_code) {
          setSvgCode(mockResponse.svg_code);
          toast.success("SVG design generated!");
        }
        
        setIsSending(false);
      }, 2000);
      
      /* COMMENTED OUT UNTIL BACKEND IS READY
      // Determine if we should request SVG generation
      const shouldGenerateSvg = newMessage.toLowerCase().includes("create") || 
                                newMessage.toLowerCase().includes("generate") || 
                                newMessage.toLowerCase().includes("draw") ||
                                newMessage.toLowerCase().includes("design") ||
                                newMessage.toLowerCase().includes("make");
      
      // Call the API
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          generate_svg: shouldGenerateSvg
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update messages with the assistant's response
      setMessages(data.messages);
      
      // Check if SVG was generated
      if (data.svg_code) {
        setSvgCode(data.svg_code);
        toast.success("SVG design generated!");
      }
      
      */
      
    } catch (error) {
      console.error("Error communicating with AI Assistant:", error);
      toast.error("Failed to get a response from the AI Assistant");
      
      // Add a system message indicating the error
      setMessages([...messages, {
        role: "system",
        content: "Sorry, I encountered an error while processing your request. Please try again."
      }]);
      
      setIsSending(false);
    }
  };
  
  // Generate a mock response (TEMPORARY until backend is ready)
  const generateMockResponse = (userMessage: string): string => {
    const lowerCaseMsg = userMessage.toLowerCase();
    
    if (lowerCaseMsg.includes("create") || lowerCaseMsg.includes("generate") || lowerCaseMsg.includes("draw")) {
      return `I've created an SVG based on your request. Here it is:\n\n\`\`\`svg\n<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1080" fill="#f8f9fa" />
  <circle cx="540" cy="540" r="250" fill="#4c6ef5" />
  <polygon points="540,200 740,500 340,500" fill="#fab005" />
  <text x="540" y="800" font-family="Arial" font-size="60" text-anchor="middle" fill="#212529">Design Preview</text>
</svg>\n\`\`\``;
    }
    
    if (lowerCaseMsg.includes("hello") || lowerCaseMsg.includes("hi")) {
      return "Hello there! I'm your AI design assistant. How can I help you with your design needs today?";
    }
    
    return "I understand your request. What specific design elements would you like me to help you with?";
  };
  
  // Generate mock SVG (TEMPORARY until backend is ready)
  const generateMockSVG = (): string => {
    return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1080" fill="#f8f9fa" />
  <circle cx="540" cy="540" r="250" fill="#4c6ef5" />
  <polygon points="540,200 740,500 340,500" fill="#fab005" />
  <text x="540" y="800" font-family="Arial" font-size="60" text-anchor="middle" fill="#212529">Design Preview</text>
</svg>`;
  };
  
  // Function to handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Add SVG to canvas
  const addToCanvas = async () => {
    if (!svgCode) return;

    try {
      setIsAddingToCanvas(true);

      // Get canvas from editor prop or global state
      const canvas = editor?.canvas || window.canvasState?.canvas;

      if (!canvas) {
        toast.error("Canvas not initialized");
        return;
      }

      // Use our improved SVG loading utility
      const result = await svgCanvasUtils.addSvgToCanvas(canvas, svgCode);

      if (!result) {
        console.warn('Primary SVG loading failed, trying fallback...');
        // If primary method fails, try fallback
        const fallbackResult = await svgCanvasUtils.addSvgAsImageFallback(
          canvas,
          svgCode,
          "AI Assistant SVG"
        );

        if (!fallbackResult) {
          throw new Error('Failed to add SVG to canvas');
        }
      }

      toast.success('SVG added to canvas!');
      // Close the assistant after adding to canvas
      onClose();
    } catch (error) {
      console.error('Error adding SVG to canvas:', error);
      toast.error('Failed to add SVG to canvas');
    } finally {
      setIsAddingToCanvas(false);
    }
  };

  // Function to format message content with syntax highlighting for code blocks
  const formatMessageContent = (content: string) => {
    // Split by code blocks
    const parts = content.split(/(```svg[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith('```svg') && part.endsWith('```')) {
        // Extract the SVG code
        const svgCode = part.replace(/```svg|```/g, '').trim();
        
        // Return highlighted code
        return (
          <div key={index} className="bg-slate-100 dark:bg-slate-800 rounded-md p-3 my-3 text-xs font-mono overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">SVG Code</span>
            </div>
            <div className="max-h-[200px] overflow-auto">
              <code className="whitespace-pre-wrap break-all">{svgCode}</code>
            </div>
          </div>
        );
      }
      
      // Regular text, preserve line breaks
      return (
        <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
          {part}
        </span>
      );
    });
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2 border-b bg-white dark:bg-slate-900">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Your helpful design companion
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <ArrowLeft size={16} />
          </Button>
        </div>
      </div>

      {/* Chat container */}
      <ScrollArea className="flex-1 p-4">
        <div ref={chatContainerRef} className="space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-blue-700 dark:text-blue-400">AI Design Assistant</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Hello! I'm your AI design assistant. I can help you create SVG designs, 
                provide suggestions, and assist with design modifications. Just tell me 
                what you'd like to create or ask for design advice!
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.filter(m => m.role !== "system").map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user" 
                    ? "bg-blue-500 text-white" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                }`}
              >
                {message.role === "assistant" 
                  ? formatMessageContent(message.content)
                  : <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                }
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* SVG Preview and actions (only shown when SVG is available) */}
      {svgCode && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-[url('/checkered-pattern.png')] bg-[length:16px_16px] flex items-center justify-center p-4 rounded-lg mb-3 h-[150px]">
            <div 
              className="w-full h-full overflow-hidden flex items-center justify-center relative bg-white rounded shadow-sm border border-slate-200 dark:border-slate-700"
              dangerouslySetInnerHTML={{
                __html: svgCode.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet" ')
              }}
            />
          </div>
          
          <Button
            onClick={addToCanvas}
            disabled={isAddingToCanvas}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
          >
            {isAddingToCanvas ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding to Canvas...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add to Canvas
              </>
            )}
          </Button>
        </div>
      )}

      {/* Message input area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex gap-2 items-end">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me to design something for you..."
            className="resize-none border-slate-200 focus-visible:ring-blue-500"
            rows={2}
            disabled={isSending}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || isSending}
            className="h-10 w-10 p-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};