
import React, { useState } from 'react';
import { AppState, Article, Category, FormDefinition, FormField, TeamMember, SliderSlide, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { dbService } from '../services/supabase.ts';
import { FileText, Plus, Edit, Trash, X, ClipboardList, Monitor, Database, Users, Save, ArrowUp, ArrowDown, UserPlus, Type, List, Hash, AtSign, ToggleRight, Settings, ChevronDown, CheckCircle2, HelpCircle } from 'lucide-react';

export const AdminDashboard: React.FC<{ state: AppState, updateState: (s: Partial<AppState>) => void, onLogout: () => void }> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'sliders' | 'team' | 'forms' | 'settings'>('articles');
  const [isSaving, setIsSaving] = useState(false);
  
  // Editors
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);

  const handleSaveToCloud = async () => {
      setIsSaving(true);
      const success = await dbService.saveState(state.config.integrations.supabaseUrl, state.config.integrations.supabaseKey, state);
      setIsSaving(false);
      if (success) alert('הנתונים נשמרו בהצלחה!');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200" dir="rtl">
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-2">
          <h2 className="text-xl font-black text-[#2EB0D9] mb-8 uppercase tracking-widest">Control Center</h2>
          <button onClick={() => setActiveTab('articles')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'articles' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><FileText size={18}/> מאמרים</button>
          <button onClick={() => setActiveTab('forms')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'forms' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><ClipboardList size={18}/> טפסים</button>
          <button onClick={() => setActiveTab('team')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'team' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Users size={18}/> צוות</button>
          <button onClick={() => setActiveTab('sliders')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'sliders' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Monitor size={18}/> סליידרים</button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Settings size={18}/> הגדרות</button>
          
          <div className="mt-auto space-y-3">
              <Button onClick={handleSaveToCloud} disabled={isSaving} className="w-full h-12"><Save size={18}/> {isSaving ? 'שומר...' : 'שמור ענן'}</Button>
              <button onClick={onLogout} className="w-full p-2 text-slate-500 text-xs">יציאה</button>
          </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
          {activeTab === 'forms' && (
              <div className="space-y-8">
                  <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-black">ניהול טפסים</h3>
                      <Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.HOME], fields: [], submitEmail: state.config.contactEmail })}>טופס חדש</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(state.forms || []).map(form => (
                          <div key={form.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex justify-between items-center group">
                              <div><h4 className="font-bold">{form.title}</h4><p className="text-xs text-slate-500">{form.fields?.length || 0} שדות</p></div>
                              <div className="flex gap-2">
                                  <button onClick={() => setEditingForm(form)} className="p-2 bg-slate-800 rounded-lg hover:bg-[#2EB0D9]"><Edit size={16}/></button>
                                  <button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-2 bg-slate-800 rounded-lg hover:bg-red-600"><Trash size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          {/* Implement other tabs as simplified views... */}
      </main>

      {editingForm && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-10" dir="rtl">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl h-full flex flex-col md:flex-row overflow-hidden shadow-2xl">
                  <div className="w-full md:w-80 bg-slate-950 p-8 overflow-y-auto space-y-6">
                      <h4 className="font-black text-[#2EB0D9]">הגדרות טופס</h4>
                      <div className="space-y-4">
                          <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} placeholder="שם הטופס" />
                          <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})} placeholder="אימייל יעד" />
                      </div>
                  </div>
                  <div className="flex-1 flex flex-col bg-slate-900">
                      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                          <h3 className="text-xl font-black">שדות הטופס</h3>
                          <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingForm(null)}>ביטול</Button>
                              <Button size="sm" onClick={() => {
                                  updateState({ forms: state.forms.find(f => f.id === editingForm.id) ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] });
                                  setEditingForm(null);
                              }}>שמור</Button>
                          </div>
                      </div>
                      <div className="p-4 bg-slate-950 flex gap-2 overflow-x-auto border-b border-slate-800">
                          <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'text', label: 'שדה טקסט', required: false }]})} className="px-3 py-1 bg-slate-800 rounded text-xs hover:bg-[#2EB0D9]"><Type size={12}/> טקסט</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'boolean', label: 'כן/לא', required: false }]})} className="px-3 py-1 bg-[#2EB0D9]/20 rounded text-xs hover:bg-[#2EB0D9]"><ToggleRight size={12}/> כן/לא</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'select', label: 'בחירה', options: ['אופציה 1'], required: false }]})} className="px-3 py-1 bg-slate-800 rounded text-xs hover:bg-[#2EB0D9]"><List size={12}/> רשימה</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'children_list', label: 'רשימת ילדים', required: true }]})} className="px-3 py-1 bg-cyan-900 rounded text-xs hover:bg-[#2EB0D9]"><Users size={12}/> ילדים</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8 space-y-4">
                          {(editingForm.fields || []).map((field, idx) => (
                              <div key={field.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                                  <div className="flex items-center gap-4">
                                      <input className="flex-1 bg-transparent border-b border-slate-700 outline-none p-1 font-bold" value={field.label} onChange={e => {
                                          const next = [...editingForm.fields];
                                          next[idx].label = e.target.value;
                                          setEditingForm({...editingForm, fields: next});
                                      }} />
                                      <select className="bg-slate-900 text-[10px] p-1 rounded" value={field.helpArticleId || ''} onChange={e => {
                                          const next = [...editingForm.fields];
                                          next[idx].helpArticleId = e.target.value;
                                          setEditingForm({...editingForm, fields: next});
                                      }}>
                                          <option value="">ללא עזרה</option>
                                          {state.articles?.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                                      </select>
                                      <button onClick={() => setEditingForm({...editingForm, fields: editingForm.fields.filter(f => f.id !== field.id)})} className="text-red-500"><Trash size={14}/></button>
                                  </div>
                                  {field.type === 'select' && (
                                      <input className="w-full bg-slate-900 p-2 rounded text-[10px] text-white" placeholder="אופציות (מופרדות בפסיקים): אופציה 1, אופציה 2..." value={field.options?.join(', ') || ''} onChange={e => {
                                          const next = [...editingForm.fields];
                                          next[idx].options = e.target.value.split(',').map(s=>s.trim());
                                          setEditingForm({...editingForm, fields: next});
                                      }} />
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
