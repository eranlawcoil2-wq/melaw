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
      // Assuming we keep the site config in a table called 'site_config', row ID 1
      const { data, error } = await supabase
        .from('site_config')
        .select('data')
        .order('id', { ascending: true }) // Get the first record (or specific ID)
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

    // We strip out the UI state (isAdminLoggedIn, currentCategory) before saving
    const dataToSave = {
       articles: state.articles,
       timelines: state.timelines,
       slides: state.slides,
       forms: state.forms,
       teamMembers: state.teamMembers,
       menuItems: state.menuItems,
       config: state.config
    };

    try {
      // We assume row ID 1 exists. If not, we might need to insert.
      // Upsert is safer.
      // Note: 'site_config' table must exist with 'id' and 'data' columns.
      // We check if row 1 exists
      const { data: existing } = await supabase.from('site_config').select('id').limit(1);

      if (existing && existing.length > 0) {
          // Update
          const id = existing[0].id;
          const { error } = await supabase
            .from('site_config')
            .update({ data: dataToSave, updated_at: new Date().toISOString() })
            .eq('id', id);
          
          if (error) throw error;
      } else {
          // Insert
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
  }
};
