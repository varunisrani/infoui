import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SVGData {
  id: string;
  name: string;
  content: string;
  dataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const svgStorageSupabase = {
  async saveSVG(content: string, name: string, dataUrl?: string): Promise<SVGData> {
    try {
      const { data, error } = await supabase
        .from('svg_storage')
        .insert([
          { content, name, data_url: dataUrl }
        ])
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        content: data.content,
        dataUrl: data.data_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error saving SVG to Supabase:', error);
      throw error;
    }
  },

  async getSVGs(): Promise<SVGData[]> {
    try {
      const { data, error } = await supabase
        .from('svg_storage')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        name: item.name,
        content: item.content,
        dataUrl: item.data_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error getting SVGs from Supabase:', error);
      throw error;
    }
  },

  async deleteSVG(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('svg_storage')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting SVG from Supabase:', error);
      throw error;
    }
  },

  async updateSVG(id: string, updates: Partial<SVGData>): Promise<SVGData> {
    try {
      const { data, error } = await supabase
        .from('svg_storage')
        .update({
          name: updates.name,
          content: updates.content,
          data_url: updates.dataUrl
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        content: data.content,
        dataUrl: data.data_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error updating SVG in Supabase:', error);
      throw error;
    }
  }
}; 