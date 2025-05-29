import { Message } from "@/features/editor/components/ai-assistant";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
let supabase: SupabaseClient;

if (typeof window !== 'undefined') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not set:', {
      url: supabaseUrl,
      key: supabaseAnonKey ? '[HIDDEN]' : undefined
    });
    throw new Error('Supabase configuration is missing. Please check your .env.local file.');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

// Helper function to ensure user is authenticated
const ensureAuthenticated = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    // If not authenticated, sign in anonymously
    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) {
      throw new Error('Failed to authenticate: ' + signInError.message);
    }
    return data.session?.user?.id;
  }
  return session.user.id;
};

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  svgCode: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DBChat {
  id: string;
  title: string;
  messages: Message[];
  svg_code: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Add retry utility at the top of the file
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      // Only retry on timeout errors
      if (error?.code !== '57014') {
        throw error;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
};

export const chatStorage = {
  getChats: async (): Promise<Chat[]> => {
    const userId = await ensureAuthenticated();
    
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats:', error);
      return [];
    }

    return (chats as DBChat[]).map(chat => ({
      ...chat,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      svgCode: chat.svg_code
    }));
  },
  
  saveChat: async (chat: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> => {
    const userId = await ensureAuthenticated();
    
    try {
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('chats')
          .insert([{
            title: chat.title,
            messages: chat.messages,
            svg_code: chat.svgCode,
            user_id: userId
          }])
          .select()
          .single();
      });

      if (error) {
        console.error('Error saving chat:', error);
        throw error;
      }

      // Dispatch event for any components that are listening
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai-chats-updated'));
      }

      const dbChat = data as DBChat;
      return {
        ...dbChat,
        createdAt: dbChat.created_at,
        updatedAt: dbChat.updated_at,
        svgCode: dbChat.svg_code
      };
    } catch (error) {
      console.error('Error in saveChat:', error);
      if ((error as any)?.code === '57014') {
        throw new Error('The operation timed out. Please try again.');
      }
      throw error;
    }
  },
  
  updateChat: async (id: string, data: Partial<Chat>): Promise<Chat | null> => {
    await ensureAuthenticated();
    
    try {
      // Optimize the update payload
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };

      // Only include fields that are actually provided
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.messages !== undefined) updatePayload.messages = data.messages;
      if (data.svgCode !== undefined) updatePayload.svg_code = data.svgCode;

      // Use retry logic for the update operation
      const { data: updatedChat, error } = await retryOperation(async () => {
        return await supabase
          .from('chats')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
      });

      if (error) {
        console.error('Error updating chat:', error);
        return null;
      }

      // Dispatch event for any components that are listening
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai-chats-updated'));
      }

      const dbChat = updatedChat as DBChat;
      return {
        ...dbChat,
        createdAt: dbChat.created_at,
        updatedAt: dbChat.updated_at,
        svgCode: dbChat.svg_code
      };
    } catch (error) {
      console.error('Error in updateChat:', error);
      // If it's a timeout error, show a more specific message
      if ((error as any)?.code === '57014') {
        throw new Error('The operation timed out. Please try again.');
      }
      throw error;
    }
  },
  
  deleteChat: async (id: string): Promise<void> => {
    await ensureAuthenticated();
    
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting chat:', error);
      return;
    }

    // Dispatch event for any components that are listening
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai-chats-updated'));
    }
  },
  
  getChat: async (id: string): Promise<Chat | null> => {
    await ensureAuthenticated();
    
    const { data: chat, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !chat) {
      console.error('Error fetching chat:', error);
      return null;
    }

    const dbChat = chat as DBChat;
    return {
      ...dbChat,
      createdAt: dbChat.created_at,
      updatedAt: dbChat.updated_at,
      svgCode: dbChat.svg_code
    };
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