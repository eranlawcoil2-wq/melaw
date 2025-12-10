
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
        // PGRST116 is the error code for "JSON object requested, multiple (or no) rows returned"
        // In the context of .single(), it usually means no rows were found.
        if (error.code === 'PGRST116') {
            console.log("Supabase: No configuration found in 'site_config' table. Using default state.");
            return null;
        }
        console.error("Supabase load error:", error.message || error);
        return null;
      }

      if (data && data.data) {
        return data.data as Partial<AppState>;
      }
      return null;
    } catch (e: any) {
      console.error("Supabase exception:", e.message || e);
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
      // Check if a row exists
      const { data: existing, error: selectError } = await supabase.from('site_config').select('id').limit(1);
      
      if (selectError) {
          console.error("Supabase check existence error:", selectError.message || selectError);
          // If table doesn't exist, we can't save.
          if (selectError.code === '42P01') { // undefined_table
              alert("שגיאה: הטבלה 'site_config' אינה קיימת ב-Supabase. נא ליצור את הטבלה תחילה.");
              return false;
          }
          // Proceed to try insert anyway if it's another error, or fail? 
          // Let's assume if select fails, we might still want to try insert or report fail.
      }

      if (existing && existing.length > 0) {
          const id = existing[0].id;
          const { error } = await supabase
            .from('site_config')
            .update({ data: dataToSave, updated_at: new Date().toISOString() })
            .eq('id', id);
          
          if (error) {
              console.error("Supabase update error:", error.message || error);
              throw error;
          }
      } else {
          const { error } = await supabase
            .from('site_config')
            .insert([{ data: dataToSave }]);
          
          if (error) {
              console.error("Supabase insert error:", error.message || error);
              throw error;
          }
      }
      return true;
    } catch (e: any) {
      console.error("Supabase save exception:", e.message || e);
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
              console.error("Supabase Upload Error:", uploadError.message || uploadError);
              throw uploadError;
          }

          // Get Public URL
          const { data } = supabase.storage.from('images').getPublicUrl(filePath);
          
          return data.publicUrl;
      } catch (e: any) {
          console.error("Supabase image upload failed:", e.message || e);
          return null;
      }
  }
};
