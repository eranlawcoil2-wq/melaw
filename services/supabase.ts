import { createClient } from '@supabase/supabase-js';
import { AppState } from '../types.ts';

export const dbService = {
  getClient(url: string, key: string) {
    if (!url || !key) return null;
    return createClient(url, key);
  },

  async loadState(url: string, key: string): Promise<Partial<AppState> | null> {
    const supabase = this.getClient(url, key);
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('data')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error("Supabase load error:", error);
        return null;
      }

      if (data && data.data) {
        return data.data as Partial<AppState>;
      }
      return null;
    } catch (e) {
      console.error("Supabase exception:", e);
      return null;
    }
  },

  async saveState(url: string, key: string, state: AppState): Promise<boolean> {
    const supabase = this.getClient(url, key);
    if (!supabase) return false;

    const dataToSave = {
       articles: state.articles,
       timelines: state.timelines,
       slides: state.slides,
       forms: state.forms,
       teamMembers: state.teamMembers,
       menuItems: state.menuItems,
       config: state.config,
       lastUpdated: state.lastUpdated // Ensure this is saved
    };

    try {
      const { data: existing } = await supabase.from('site_config').select('id').limit(1);

      if (existing && existing.length > 0) {
          const id = existing[0].id;
          const { error } = await supabase
            .from('site_config')
            .update({ data: dataToSave, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) throw error;
      } else {
          const { error } = await supabase
            .from('site_config')
            .insert([{ data: dataToSave }]);
          if (error) throw error;
      }
      return true;
    } catch (e) {
      console.error("Supabase save error:", e);
      return false;
    }
  },

  async uploadImage(url: string, key: string, file: File): Promise<string | null> {
      const supabase = this.getClient(url, key);
      if (!supabase) return null;

      try {
          // Generate a unique file name
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${fileName}`;

          // Upload to 'images' bucket
          const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(filePath, file);

          if (uploadError) {
              console.error("Supabase Upload Error:", uploadError);
              throw uploadError;
          }

          // Get Public URL
          const { data } = supabase.storage.from('images').getPublicUrl(filePath);
          
          return data.publicUrl;
      } catch (e) {
          console.error("Supabase image upload failed:", e);
          return null;
      }
  }
};