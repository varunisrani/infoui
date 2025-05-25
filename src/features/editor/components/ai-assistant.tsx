"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Loader2,
  PlusCircle,
  MessageSquare,
  Check,
  Palette,
  Type,
  Maximize,
  RotateCw,
  Download,
  Copy,
  Wand2,
  RefreshCw,
  Expand,
  Minimize,
  ExternalLink,
  Save,
  CheckCircle2,
  MenuSquare,
  Trash,
  X,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Editor } from "@/features/editor/types";
import { svgNormalizer, svgCanvasUtils, svgStorage, svgTester } from "@/lib/svg-utils";
import { chatStorage, Chat } from "@/lib/chat-storage";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  editor: Editor | undefined;
  onClose: () => void;
}

// Quick action suggestions for design modifications
const quickActions = [
  { icon: Palette, label: "Change Colors", prompt: "Change the colors to a different color scheme" },
  { icon: Type, label: "Change Font", prompt: "Change the font style to something more modern" },
  { icon: Maximize, label: "Make Bigger", prompt: "Make the text and elements larger" },
  { icon: RotateCw, label: "Different Style", prompt: "Create a different design style for this" },
  { icon: RefreshCw, label: "Simplify", prompt: "Make this design simpler and more minimalist" },
  { icon: Wand2, label: "Add Effects", prompt: "Add some visual effects or decorative elements" },
];

export const AiAssistant = ({ editor, onClose }: AiAssistantProps) => {
  // Get the router at the top level of the component
  const router = useRouter();
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [svgCode, setSvgCode] = useState<string | null>(null);
  const [isAddingToCanvas, setIsAddingToCanvas] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Chat management state
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  
  // References
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Function to extract SVG code from message content
  const extractSvgCode = (message: string): string | null => {
    const svgMatch = message.match(/```svg\s*([\s\S]*?)\s*```/);
    return svgMatch ? svgMatch[1].trim() : null;
  };

  // Load chats from storage
  useEffect(() => {
    const loadedChats = chatStorage.getChats();
    setChats(loadedChats);
  }, []);

  // Listen for chat updates from other components
  useEffect(() => {
    const handleChatsUpdated = () => {
      setChats(chatStorage.getChats());
    };
    
    window.addEventListener('ai-chats-updated', handleChatsUpdated);
    return () => {
      window.removeEventListener('ai-chats-updated', handleChatsUpdated);
    };
  }, []);
  
  // Load chat when activeChat changes
  useEffect(() => {
    if (activeChat) {
      setMessages(activeChat.messages);
      setSvgCode(activeChat.svgCode);
    } else {
      // Clear messages when starting a new chat
      setMessages([]);
      setSvgCode(null);
    }
  }, [activeChat]);

  // Save chat when messages or SVG changes
  useEffect(() => {
    if (messages.length > 0) {
      // Don't save empty chats
      if (activeChat) {
        // Update existing chat
        chatStorage.updateChat(activeChat.id, { 
          messages, 
          svgCode,
          title: chatStorage.generateChatTitle(messages)
        });
      } else {
        // Create new chat when we have messages but no activeChat
        const newChat = chatStorage.saveChat({
          title: chatStorage.generateChatTitle(messages),
          messages,
          svgCode
        });
        setActiveChat(newChat);
        setChats(chatStorage.getChats());
      }
    }
  }, [messages, svgCode, activeChat]);

  // Function to create a new chat
  const createNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    setSvgCode(null);
    setShowChatSidebar(false);
    setNewMessage(""); // Clear any message that was being composed
    setIsSending(false); // Reset message sending state
    setIsAddingToCanvas(false); // Reset canvas adding state
    setShowQuickActions(false); // Hide quick actions
    setShowFullImage(false); // Reset image view state
    setIsSaving(false); // Reset saving state
    setIsSaved(false); // Reset saved state
  };
  
  // Function to delete a chat
  const deleteChat = (chatId: string) => {
    // If we're deleting the active chat, reset the view
    if (activeChat?.id === chatId) {
      setActiveChat(null);
      setMessages([]);
      setSvgCode(null);
    }
    
    // Delete the chat from storage
    chatStorage.deleteChat(chatId);
    
    // Update the chats list
    setChats(chatStorage.getChats());
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Chat Sidebar Component
  const ChatSidebar = () => {
    return (
      <div 
        className={`absolute top-0 left-0 z-50 h-full w-[280px] bg-white dark:bg-slate-900 shadow-xl border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform ${
          showChatSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-500" />
            <h3 className="font-medium text-sm">Chat History</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChatSidebar(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
          <Button
            variant="outline"
            size="sm"
            onClick={createNewChat}
            className="w-full justify-start gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-2">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
              <LayoutGrid className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-xs">No chat history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div 
                  key={chat.id}
                  className={`p-3 rounded-lg cursor-pointer group transition-colors ${
                    activeChat?.id === chat.id 
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                  onClick={() => {
                    setActiveChat(chat);
                    setShowChatSidebar(false);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-medium text-sm truncate mb-1">
                        {chat.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(chat.createdAt)}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering chat selection
                        deleteChat(chat.id);
                      }}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash className="h-3 w-3 text-slate-500" />
                    </Button>
                  </div>
                  
                  {chat.svgCode && (
                    <div className="mt-2 overflow-hidden rounded-md bg-white h-[60px] w-[60px] border flex items-center justify-center">
                      <div
                        className="scale-75 ai-svg-preview"
                        dangerouslySetInnerHTML={{
                          __html: chat.svgCode.replace(
                            /<svg/,
                            '<svg preserveAspectRatio="xMidYMid meet" width="100%" height="100%" '
                          )
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  };

  // Update SVG code when messages change
  useEffect(() => {
    // Find the last assistant message that might contain SVG code
    const lastSvgMessage = [...messages].reverse().find(msg => 
      msg.role === "assistant" && msg.content.includes("```svg")
    );
    
    if (lastSvgMessage) {
      const newSvgCode = extractSvgCode(lastSvgMessage.content);
      if (newSvgCode && newSvgCode !== svgCode) {
        setSvgCode(newSvgCode);
        setShowQuickActions(false); // Reset view state
        setShowFullImage(false);
        setIsSaved(false); // Reset saved state for new SVG
        
        // Force a redraw of the preview div
        const previewTimer = setTimeout(() => {
          const previewElements = document.querySelectorAll('.ai-svg-preview');
          previewElements.forEach(el => {
            // Force a redraw by slight CSS change and restore
            const currentDisplay = (el as HTMLElement).style.display;
            (el as HTMLElement).style.display = 'none';
            void (el as HTMLElement).offsetHeight; // Trigger reflow
            (el as HTMLElement).style.display = currentDisplay;
          });
        }, 100);
        
        return () => clearTimeout(previewTimer);
      }
    }
  }, [messages, svgCode]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Show quick actions when SVG is generated
  useEffect(() => {
    if (svgCode) {
      setShowQuickActions(false); // Start with quick actions hidden
      setShowFullImage(false); // Start with compact view
    }
  }, [svgCode]);

  // Check if current SVG is already saved in the library
  useEffect(() => {
    if (!svgCode) return;

    const existingSvgs = svgStorage.getSVGs();
    const isDuplicate = existingSvgs.some(svg => svg.content.trim() === svgCode.trim());
    setIsSaved(isDuplicate);
  }, [svgCode]);

  // Function to send a message to the AI assistant
  const sendMessage = async (messageToSend?: string) => {
    const messageContent = messageToSend || newMessage;
    if (!messageContent.trim()) return;
    
    try {
      setIsSending(true);
      
      // Add user message to chat
      const userMessage: Message = {
        role: "user",
        content: messageContent
      };
      
      // Update messages with the user's message
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setNewMessage("");
      
      // Determine if we should request SVG generation
      const shouldGenerateSvg = messageContent.toLowerCase().includes("create") || 
                                messageContent.toLowerCase().includes("generate") || 
                                messageContent.toLowerCase().includes("draw") ||
                                messageContent.toLowerCase().includes("design") ||
                                messageContent.toLowerCase().includes("make");
      
      // Call the API - use the provided external API
      const apiUrl = "https://pppp-351z.onrender.com/api/chat-assistant";
      
      const response = await fetch(apiUrl, {
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
        toast.success("🎨 Design created successfully!");
      }
      
    } catch (error) {
      console.error("Error communicating with AI Assistant:", error);
      toast.error("Failed to get a response from the AI Assistant");
      
      // Add a system message indicating the error
      setMessages([...messages, {
        role: "system",
        content: "Sorry, I encountered an error while processing your request. Please try again."
      }]);
    } finally {
      setIsSending(false);
    }
  };
  
  // Function to handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle quick action clicks
  const handleQuickAction = (action: typeof quickActions[0]) => {
    sendMessage(action.prompt);
    setShowQuickActions(false);
  };

  // Use SVG in editor (redirect to editor with this SVG)
  const useThisSvg = async () => {
    if (!svgCode) return;

    try {
      setIsAddingToCanvas(true);
      
      // Process the SVG to ensure it's properly formatted
      const { svgNormalizer } = await import("@/lib/svg-utils");
      const { processed } = svgNormalizer.fullyProcessSvg(svgCode);
      
      // Create a new project with the SVG data
      // Using the same structure as AI SVG Generator for compatibility with AI SVG Display
      const projectData = {
        svg: processed,
        prompt: "Generated by AI Assistant",
        enhancedPrompt: ""
      };
      
      // Import storage from lib/storage to access saveProject
      const { storage } = await import("@/lib/storage");
      
      // Create a new project with the SVG data
      const project = storage.saveProject({
        name: `AI Assistant Design`,
        json: JSON.stringify(projectData),
        width: 1080,
        height: 1080,
      });
      
      toast.success("New project created with AI design!");
      
      // Close the assistant before navigation to prevent any state issues
      onClose();
      
      // Add a short delay before navigating to ensure the component unmounts properly
      setTimeout(() => {
        // Navigate to the editor with the new project
        router.push(`/editor/${project.id}`);
      }, 100);
    } catch (error) {
      console.error('Error creating project with SVG:', error);
      toast.error('Failed to create project with design');
    } finally {
      setIsAddingToCanvas(false);
    }
  };

  // Copy SVG code to clipboard
  const copySvgCode = async () => {
    if (!svgCode) return;
    try {
      await navigator.clipboard.writeText(svgCode);
      toast.success("SVG code copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy SVG code");
    }
  };

  // Download SVG as file
  const downloadSvg = () => {
    if (!svgCode) return;
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-design.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("SVG downloaded!");
  };

  // Save SVG to library
  const saveToLibrary = async () => {
    if (!svgCode) return;

    try {
      setIsSaving(true);

      // First, make sure we have a clean SVG by running it through our normalizer
      const { processed, dataUrl } = svgNormalizer.fullyProcessSvg(svgCode);

      // Get a name from the last user message or default name
      const lastUserMessage = [...messages].reverse().find(msg => msg.role === "user");
      const prompt = lastUserMessage?.content || "AI Assistant Design";
      const name = `AI: ${prompt.substring(0, 20)}${prompt.length > 20 ? '...' : ''}`;

      // Test if the SVG can be loaded by Fabric.js before saving
      const canLoad = await svgTester.testWithFabric(processed);
      
      if (!canLoad) {
        console.warn("SVG failed fabric.js loading test, applying additional processing");
        // Apply more aggressive cleaning if needed
        const fallbackSvg = svgTester.getFallbackVersion(processed);
        const { processed: finalProcessed, dataUrl: finalDataUrl } = svgNormalizer.fullyProcessSvg(fallbackSvg);
        
        // Save the fallback version
        svgStorage.saveSVG(finalProcessed, name, finalDataUrl);
      } else {
        // Save to storage using the centralized storage utility
        svgStorage.saveSVG(processed, name, dataUrl);
      }

      setIsSaved(true);
      toast.success('SVG saved to your library!');
    } catch (error) {
      console.error('Error saving SVG to library:', error);
      toast.error('Failed to save SVG to library');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to format message content with syntax highlighting for code blocks
  const formatMessageContent = (content: string) => {
    // Split by code blocks
    const parts = content.split(/(```svg[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith('```svg') && part.endsWith('```')) {
        // Don't show SVG code in chat - we handle it separately
        return null;
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
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Chat Sidebar */}
      <ChatSidebar />
      
      {/* Modern Header */}
      <div className="relative p-6 pb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowChatSidebar(!showChatSidebar)}
              className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <MenuSquare className="h-5 w-5 text-slate-500" />
            </button>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Design Studio
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create stunning designs with AI assistance
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            <ArrowLeft size={18} />
          </Button>
        </div>
      </div>

      {/* Chat container */}
      <ScrollArea className="flex-1 p-6">
        <div ref={chatContainerRef} className="space-y-6">
          {/* Welcome message */}
          {messages.length === 0 && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Wand2 className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                    {activeChat ? 'Continue Your Conversation' : 'Welcome to AI Design Studio!'}
                  </h4>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  {activeChat 
                    ? 'Your previous conversation has been loaded. Continue where you left off or start a new chat from the sidebar.'
                    : 'I can help you create amazing designs! Try saying:'}
                </p>
                {!activeChat && (
                  <div className="grid grid-cols-1 gap-2">
                    <Badge variant="secondary" className="justify-start py-2 px-3">
                      &ldquo;Create a coming soon poster for my clothing brand&rdquo;
                    </Badge>
                    <Badge variant="secondary" className="justify-start py-2 px-3">
                      &ldquo;Design a testimonial card for my restaurant&rdquo;
                    </Badge>
                    <Badge variant="secondary" className="justify-start py-2 px-3">
                      &ldquo;Make a logo for my tech startup&rdquo;
                    </Badge>
                  </div>
                )}
                {activeChat && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={createNewChat}
                    className="mt-2"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Start New Chat
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {messages.filter(m => m.role !== "system").map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card 
                className={`max-w-[85%] ${
                  message.role === "user" 
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-500" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <CardContent className="p-4">
                  <div className={`text-sm ${message.role === "user" ? "text-blue-50" : "text-slate-700 dark:text-slate-300"}`}>
                    {message.role === "assistant" 
                      ? formatMessageContent(message.content)
                      : <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Loading indicator */}
          {isSending && (
            <div className="flex justify-start">
              <Card className="bg-white dark:bg-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Creating your design...</span>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* SVG Preview and actions */}
      {svgCode && (
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="space-y-3">
            {/* Preview Title */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 text-sm">
                <Check className="h-3 w-3 text-green-500" />
                Design Ready
              </h4>
              <Badge variant="outline" className="text-xs">
                {showFullImage ? '180×180px' : '120×120px'} Preview
              </Badge>
            </div>

            {/* Compact Design Preview */}
            <div className="flex items-center gap-3">
              <div 
                className={`${showFullImage ? 'w-[180px] h-[180px]' : 'w-[120px] h-[120px]'} flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="8" height="8" fill="#f8fafc"/><rect x="8" y="8" width="8" height="8" fill="#f8fafc"/></svg>')}")`,
                  backgroundSize: '16px 16px'
                }}
              >
                <div 
                  className="w-full h-full ai-svg-preview"
                  key={`svg-preview-${Date.now()}`} // Force re-render when SVG changes
                  dangerouslySetInnerHTML={{
                    __html: svgCode.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet" width="100%" height="100%" ')
                  }}
                />
              </div>

              {/* Compact Action Buttons */}
              <div className={`${showFullImage ? 'flex flex-col gap-2' : 'flex-1 grid grid-cols-3 gap-2'}`}>
                <Button
                  onClick={useThisSvg}
                  disabled={isAddingToCanvas}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 h-8"
                >
                  {isAddingToCanvas ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Use this SVG
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={saveToLibrary}
                  disabled={isSaving || isSaved}
                  size="sm"
                  className="hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950 h-8"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : isSaved ? (
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Library'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowFullImage(!showFullImage)}
                  size="sm"
                  className="hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950 h-8"
                >
                  {showFullImage ? (
                    <>
                      <Minimize className="h-3 w-3 mr-1" />
                      Compact
                    </>
                  ) : (
                    <>
                      <Expand className="h-3 w-3 mr-1" />
                      Full View
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  size="sm"
                  className="hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 h-8"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  {showQuickActions ? 'Less' : 'Edit'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={copySvgCode}
                  size="sm"
                  className="hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950 h-8"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                
                <Button
                  variant="outline"
                  onClick={downloadSvg}
                  size="sm"
                  className="hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-950 h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>

            {/* Collapsible Quick Actions */}
            {showQuickActions && (
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400">Quick Edits:</h5>
                <div className="grid grid-cols-3 gap-1">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAction(action)}
                      disabled={isSending}
                      className="h-7 px-2 flex items-center gap-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <action.icon className="h-3 w-3" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message input area */}
      <div className="p-4 pt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="space-y-2">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Describe the design you want to create..."
                className="resize-none border-slate-300 dark:border-slate-600 focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-xl pr-12 min-h-[50px]"
                rows={2}
                disabled={isSending}
              />
              <div className="absolute bottom-3 right-3">
                <MessageSquare className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            <Button 
              onClick={() => sendMessage()} 
              disabled={!newMessage.trim() || isSending}
              className="h-[50px] w-[50px] p-0 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Suggestion Pills */}
          {messages.length === 0 && !activeChat && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendMessage("Create a coming soon poster")}
                className="h-7 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300"
                disabled={isSending}
              >
                Coming Soon Poster
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendMessage("Design a testimonial card")}
                className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-300"
                disabled={isSending}
              >
                Testimonial Card
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendMessage("Create a business logo")}
                className="h-7 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:hover:bg-purple-900 dark:text-purple-300"
                disabled={isSending}
              >
                Business Logo
              </Button>
            </div>
          )}
          
          {/* Chat history indicator */}
          {messages.length === 0 && activeChat && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChatSidebar(true)}
              >
                <MenuSquare className="h-3 w-3 mr-1" />
                Chat History
              </Button>
              <p className="text-xs text-slate-500">or continue this conversation below</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};