
import React, { useState } from 'react';
import { AppState, Article, Category, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx';
import { dbService } from '../services/supabase.ts';
import { FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Monitor, Database, Users, Save, ArrowUp, ArrowDown, UserPlus, Type, List, Hash, AtSign, ToggleRight } from 'lucide-react';

export const AdminDashboard: React.FC<{ state: AppState, updateState: (s: Partial<AppState>) => void, onLogout: () => void }> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'forms' | 'team' | 'integrations'>('articles');
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToCloud = async () => {
      setIsSaving(true);
      const success = await dbService.saveState(state.config.integrations.supabaseUrl, state.config.integrations.supabaseKey, state);
      setIsSaving(false);
      if (success) alert('נשמר בהצלחה!');
      else alert('שגיאה בשמירה לענן. בדוק הגדרות Supabase.');
  };

  const addField = (type: FieldType) => {
      if (!editingForm) return;
      const newField: FormField = { id: Date.now().toString(), type, label: type === 'children_list' ? 'רשימת ילדים' : 'שדה חדש', required: false };
      setEditingForm({ ...editingForm, fields: [...editingForm.fields, newField] });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
      if (!editingForm) return;
      const fields = [...editingForm.fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= fields.length) return;
      [fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]];
      setEditingForm({ ...editingForm, fields });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200">
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-4">
          <h2 className="text-2xl font-black text-[#2EB0D9] mb-8">ADMIN</h2>
          <button onClick={() => setActiveTab('articles')} className={`flex gap-3 p-3 rounded-lg ${activeTab === 'articles' ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800'}`}><FileText/> מאמרים</button>
          <button onClick={() => setActiveTab('forms')} className={`flex gap-3 p-3 rounded-lg ${activeTab === 'forms' ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800'}`}><ClipboardList/> טפסים</button>
          <button onClick={() => setActiveTab('team')} className={`flex gap-3 p-3 rounded-lg ${activeTab === 'team' ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800'}`}><Users/> צוות</button>
          <button onClick={() => setActiveTab('integrations')} className={`flex gap-3 p-3 rounded-lg ${activeTab === 'integrations' ? 'bg-[#2EB0D9] text-white' : 'hover:bg-slate-800'}`}><Database/> חיבורים</button>
          
          <div className="mt-auto space-y-2">
              <Button onClick={handleSaveToCloud} disabled={isSaving} className="w-full gap-2"><Save size={18}/> {isSaving ? 'שומר...' : 'שמור לענן'}</Button>
              <button onClick={onLogout} className="w-full p-2 text-slate-500 hover:text-red-400">יציאה</button>
          </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
          {activeTab === 'forms' && (
              <div className="space-y-8">
                  <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-black">ניהול טפסים</h3>
                      <Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.HOME], fields: [], submitEmail: '', order: 99 })}>טופס חדש</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                      {state.forms.map(form => (
                          <div key={form.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between items-center">
                              <div>
                                  <h4 className="font-bold text-lg">{form.title}</h4>
                                  <span className="text-xs opacity-50">{form.fields.length} שדות</span>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => setEditingForm(form)} className="p-2 hover:bg-[#2EB0D9] rounded transition-colors"><Edit size={18}/></button>
                                  <button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-2 hover:bg-red-500 rounded transition-colors"><Trash size={18}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {editingForm && (
              <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-full flex flex-col">
                      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                          <h3 className="text-xl font-bold">עריכת טופס: {editingForm.title}</h3>
                          <div className="flex gap-4">
                              <Button onClick={() => { updateState({ forms: state.forms.find(f => f.id === editingForm.id) ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] }); setEditingForm(null); }}>שמור</Button>
                              <button onClick={() => setEditingForm(null)} className="p-2 hover:bg-slate-800 rounded-full"><X/></button>
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8 space-y-6">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">שם הטופס (למשל: שאלון ירושה)</label>
                              <input className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} placeholder="שם הטופס" />
                          </div>
                          
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">קטגוריות להצגה</label>
                              <div className="flex gap-2 flex-wrap">
                                  {Object.values(Category).map(cat => (
                                      <button 
                                          key={cat} 
                                          onClick={() => {
                                              const current = editingForm.categories || [];
                                              const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
                                              setEditingForm({...editingForm, categories: next});
                                          }}
                                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${editingForm.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white' : 'bg-slate-800 text-slate-400'}`}
                                      >
                                          {CATEGORY_LABELS[cat]}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="flex gap-2 p-3 bg-black/40 rounded-xl overflow-x-auto no-scrollbar">
                              <button onClick={() => addField('text')} className="whitespace-nowrap px-4 py-2 hover:bg-[#2EB0D9] rounded-lg flex gap-2 text-xs items-center transition-colors"><Type size={14}/> טקסט</button>
                              <button onClick={() => addField('email')} className="whitespace-nowrap px-4 py-2 hover:bg-[#2EB0D9] rounded-lg flex gap-2 text-xs items-center transition-colors"><AtSign size={14}/> אימייל</button>
                              <button onClick={() => addField('composite_name_id')} className="whitespace-nowrap px-4 py-2 hover:bg-[#2EB0D9] rounded-lg flex gap-2 text-xs items-center bg-[#2EB0D9]/20 transition-colors"><UserPlus size={14}/> שם+ת.ז</button>
                              <button onClick={() => addField('children_list')} className="whitespace-nowrap px-4 py-2 hover:bg-[#2EB0D9] rounded-lg flex gap-2 text-xs items-center bg-[#2EB0D9]/40 border border-[#2EB0D9]/50 transition-colors font-bold"><Users size={14}/> פקד ילדים</button>
                          </div>

                          <div className="space-y-4">
                              {editingForm.fields.map((field, idx) => (
                                  <div key={field.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 group relative">
                                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                          <button onClick={() => moveField(idx, 'up')} className="p-1 hover:text-[#2EB0D9]" title="הזז למעלה"><ArrowUp size={14}/></button>
                                          <button onClick={() => moveField(idx, 'down')} className="p-1 hover:text-[#2EB0D9]" title="הזז למטה"><ArrowDown size={14}/></button>
                                          <button onClick={() => setEditingForm({...editingForm, fields: editingForm.fields.filter(f => f.id !== field.id)})} className="p-1 hover:text-red-500" title="מחק שדה"><Trash size={14}/></button>
                                      </div>
                                      <div className="flex gap-4 items-center">
                                          <div className="opacity-40">
                                              {field.type === 'children_list' ? <Users size={18}/> : field.type === 'composite_name_id' ? <UserPlus size={18}/> : <Type size={18}/>}
                                          </div>
                                          <div className="flex-1 space-y-1">
                                              <input className="w-full bg-transparent border-b border-slate-700 outline-none text-sm font-bold" value={field.label} onChange={e => {
                                                  const newFields = [...editingForm.fields];
                                                  newFields[idx].label = e.target.value;
                                                  setEditingForm({...editingForm, fields: newFields});
                                              }} placeholder="תווית השדה" />
                                              <div className="text-[10px] text-slate-500 uppercase tracking-widest">{field.type}</div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] text-slate-500">חובה?</span>
                                              <input type="checkbox" checked={field.required} onChange={e => {
                                                   const newFields = [...editingForm.fields];
                                                   newFields[idx].required = e.target.checked;
                                                   setEditingForm({...editingForm, fields: newFields});
                                              }} />
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </main>
    </div>
  );
};
