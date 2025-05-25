import { Message } from "@/features/editor/components/ai-assistant";

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  svgCode: string | null;
  createdAt: string;
  updatedAt: string;
}

const CHAT_STORAGE_KEY = 'aiAssistantChats';

export const chatStorage = {
  getChats: (): Chat[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(CHAT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveChat: (chat: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Chat => {
    const chats = chatStorage.getChats();
    const newChat = {
      ...chat,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    chats.push(newChat);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
    
    // Dispatch event for any components that are listening
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai-chats-updated'));
    }
    
    return newChat;
  },
  
  updateChat: (id: string, data: Partial<Chat>): Chat | null => {
    const chats = chatStorage.getChats();
    const index = chats.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    chats[index] = {
      ...chats[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
    
    // Dispatch event for any components that are listening
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai-chats-updated'));
    }
    
    return chats[index];
  },
  
  deleteChat: (id: string): void => {
    const chats = chatStorage.getChats();
    const filtered = chats.filter(c => c.id !== id);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(filtered));
    
    // Dispatch event for any components that are listening
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai-chats-updated'));
    }
  },
  
  getChat: (id: string): Chat | null => {
    const chats = chatStorage.getChats();
    return chats.find(c => c.id === id) || null;
  },
  
  // Get a chat title from the first user message or return a default title
  generateChatTitle: (messages: Message[]): string => {
    const firstUserMessage = messages.find(msg => msg.role === "user");
    if (firstUserMessage) {
      const content = firstUserMessage.content;
      // Truncate long messages
      return content.length <= 20 ? content : `${content.substring(0, 20)}...`;
    }
    return `Chat ${new Date().toLocaleString()}`;
  }
};