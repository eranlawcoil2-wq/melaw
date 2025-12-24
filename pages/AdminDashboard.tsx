
import React, { useState } from 'react';
import { AppState, Article, Category, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS, TimelineItem, CalculatorDefinition, Product, MenuItem } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx';
import { ImageUploadButton } from '../components/ImageUploadButton.tsx';
import { dbService } from '../services/supabase.ts';
import { FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Monitor, Database, Users, Save, ArrowUp, ArrowDown, UserPlus, Type, List, Hash, AtSign, ToggleRight, Layout, Image as ImageIcon, Settings, ShoppingCart, Calculator, Calendar, Mail, ChevronDown, CheckCircle2, ToggleLeft } from 'lucide-react';

export const AdminDashboard: React.FC<{ state: AppState, updateState: (s: Partial<AppState>) => void, onLogout: () => void }> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'sliders' | 'timelines' | 'team' | 'forms' | 'calculators' | 'products' | 'integrations' | 'settings'>('articles');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  
  // Modals / Editors
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);

  const [imagePicker, setImagePicker] = useState<{ isOpen: boolean, onSelect: (url: string) => void, query: string }>({ isOpen: false, onSelect: () => {}, query: '' });

  const handleSaveToCloud = async () => {
      setIsSaving(true);
      const success = await dbService.saveState(state.config.integrations.supabaseUrl, state.config.integrations.supabaseKey, state);
      setIsSaving(false);
      if (success) alert('הנתונים נשמרו בהצלחה בענן!');
      else alert('שגיאה בשמירה. וודא הגדרות Supabase.');
  };

  const handleAiArticle = async () => {
      if (!newTopic) return;
      setIsGenerating(true);
      try {
          const res = await generateArticleContent(newTopic, Category.HOME, state.config.integrations.geminiApiKey);
          const article: Article = {
              id: Date.now().toString(),
              title: res.title || newTopic,
              abstract: res.abstract || '',
              imageUrl: 'https://picsum.photos/800/600',
              categories: [Category.HOME],
              tabs: res.tabs || [],
              order: ((state.articles?.length || 0) + 1)
          };
          updateState({ articles: [article, ...(state.articles || [])] });
          setEditingArticle(article);
          setNewTopic('');
      } catch (e) {
          alert('שגיאה ביצירת מאמר AI');
      } finally {
          setIsGenerating(false);
      }
  };

  const toggleCategory = (current: Category[], cat: Category) => 
    (current || []).includes(cat) ? current.filter(c => c !== cat) : [...(current || []), cat];

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200" dir="rtl">
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-2 overflow-y-auto">
          <h2 className="text-2xl font-black text-[#2EB0D9] mb-8">ניהול MeLaw</h2>
          
          <button onClick={() => setActiveTab('articles')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'articles' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><FileText size={18}/> מאמרים</button>
          <button onClick={() => setActiveTab('forms')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'forms' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><ClipboardList size={18}/> טפסים</button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'settings' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Settings size={18}/> הגדרות המשרד</button>
          <button onClick={() => setActiveTab('integrations')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'integrations' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Database size={18}/> חיבורים</button>
          
          <div className="mt-auto pt-6 space-y-2 border-t border-slate-800">
              <Button onClick={handleSaveToCloud} disabled={isSaving} className="w-full gap-2"><Save size={18}/> {isSaving ? 'שומר...' : 'שמור ענן'}</Button>
              <button onClick={onLogout} className="w-full p-2 text-slate-500 hover:text-red-400 text-sm">יציאה</button>
          </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
          {activeTab === 'articles' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-black">ניהול מאמרים</h3>
                      <div className="flex gap-2">
                          <input 
                            placeholder="נושא למאמר AI..." 
                            className="bg-slate-900 border border-slate-800 px-4 rounded-lg w-64 text-white" 
                            value={newTopic} onChange={e => setNewTopic(e.target.value)} 
                          />
                          <Button onClick={handleAiArticle} disabled={isGenerating}><Sparkles className="ml-2"/> {isGenerating ? 'יוצר...' : 'צור מאמר AI'}</Button>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(state.articles || []).sort((a,b)=>(a.order||0)-(b.order||0)).map(art => (
                          <div key={art.id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group">
                              <div className="h-40 bg-slate-800 relative">
                                  <img src={art.imageUrl} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all">
                                      <button onClick={() => setEditingArticle(art)} className="p-3 bg-[#2EB0D9] rounded-full"><Edit size={20}/></button>
                                      <button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== art.id) })} className="p-3 bg-red-600 rounded-full"><Trash size={20}/></button>
                                  </div>
                              </div>
                              <div className="p-4">
                                  <h4 className="font-bold line-clamp-1">{art.title}</h4>
                                  <div className="text-[10px] text-slate-500 mt-2">{(art.categories || []).map(c => CATEGORY_LABELS[c]).join(', ')}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'forms' && (
              <div className="space-y-8">
                  <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-black">ניהול טפסים חכמים</h3>
                      <Button onClick={() => setEditingForm({ 
                          id: Date.now().toString(), 
                          title: 'טופס חדש', 
                          categories: [Category.HOME], 
                          fields: [], 
                          submitEmail: state.config.contactEmail,
                          submitButtonText: 'שלח טופס',
                          sendClientEmail: false
                      })}>טופס חדש</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(state.forms || []).map(form => (
                          <div key={form.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between items-center hover:border-[#2EB0D9]/50 transition-colors group">
                              <div>
                                  <h4 className="font-bold text-lg">{form.title}</h4>
                                  <p className="text-xs text-slate-500 mt-1">{(form.categories || []).map(c => CATEGORY_LABELS[c]).join(', ')}</p>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingForm(form)} className="p-2 bg-slate-800 rounded hover:bg-[#2EB0D9] transition-colors"><Edit size={16}/></button>
                                  <button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-2 bg-red-900 rounded hover:bg-red-800 transition-colors"><Trash size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'settings' && (
              <div className="max-w-4xl space-y-10">
                  <h3 className="text-3xl font-black">הגדרות המשרד</h3>
                  <div className="grid grid-cols-2 gap-6 bg-slate-900 p-8 rounded-2xl border border-slate-800">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">שם המשרד</label>
                          <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded text-white" value={state.config.officeName} onChange={e => updateState({ config: {...state.config, officeName: e.target.value} })} />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">כתובת המשרד</label>
                          <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded text-white" value={state.config.address} onChange={e => updateState({ config: {...state.config, address: e.target.value} })} />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">טלפון</label>
                          <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded text-white" value={state.config.phone} onChange={e => updateState({ config: {...state.config, phone: e.target.value} })} />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400">וואטסאפ (לפקד הצף)</label>
                          <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded text-white" value={state.config.whatsapp || ''} onChange={e => updateState({ config: {...state.config, whatsapp: e.target.value} })} placeholder="למשל: 972501234567" />
                      </div>
                      <div className="space-y-2 col-span-2">
                          <label className="text-xs font-bold text-slate-400">לוגו (URL או העלאה)</label>
                          <div className="flex gap-2">
                              <input className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded text-white" value={state.config.logoUrl} onChange={e => updateState({ config: {...state.config, logoUrl: e.target.value} })} />
                              <ImageUploadButton onImageSelected={url => updateState({ config: {...state.config, logoUrl: url} })} />
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </main>

      {/* Form Editor Modal */}
      {editingForm && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-10" dir="rtl">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl h-full flex flex-col md:flex-row overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  
                  {/* Sidebar */}
                  <div className="w-full md:w-80 bg-slate-950 border-l border-slate-800 p-6 overflow-y-auto space-y-6">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-black text-[#2EB0D9]">הגדרות טופס</h4>
                          <button className="md:hidden" onClick={() => setEditingForm(null)}><X/></button>
                      </div>

                      <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">שם הטופס</label>
                            <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm text-white" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">אימייל לקבלת הטופס</label>
                            <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm text-white" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">שיוך לקטגוריה</label>
                            <div className="grid grid-cols-1 gap-1 mt-1">
                                {Object.values(Category).map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => setEditingForm({...editingForm, categories: toggleCategory(editingForm.categories || [], cat)})}
                                        className={`text-right px-3 py-1.5 rounded text-xs transition-colors ${(editingForm.categories || []).includes(cat) ? 'bg-[#2EB0D9] text-white' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}
                                    >
                                        {CATEGORY_LABELS[cat]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">טקסט על כפתור הסיום</label>
                            <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm text-white" value={editingForm.submitButtonText || ''} placeholder="שלח טופס" onChange={e => setEditingForm({...editingForm, submitButtonText: e.target.value})} />
                        </div>
                        
                        <div className="pt-4 border-t border-slate-800">
                             <div className="flex items-center gap-2">
                                 <input type="checkbox" id="clientCopy" checked={editingForm.sendClientEmail} onChange={e => setEditingForm({...editingForm, sendClientEmail: e.target.checked})} />
                                 <label htmlFor="clientCopy" className="text-xs font-bold text-slate-300">שלח עותק ללקוח</label>
                             </div>
                        </div>
                      </div>
                  </div>

                  {/* Main: Field Editor */}
                  <div className="flex-1 flex flex-col bg-slate-900">
                      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                          <h3 className="text-xl font-black">עריכת שדות הטופס</h3>
                          <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingForm(null)}>ביטול</Button>
                              <Button size="sm" onClick={() => {
                                  updateState({ forms: (state.forms || []).find(f => f.id === editingForm.id) ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...(state.forms || []), editingForm] });
                                  setEditingForm(null);
                              }}>שמור שינויים</Button>
                          </div>
                      </div>

                      <div className="p-4 bg-slate-950/50 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-800">
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'text', label: 'שדה טקסט', required: false }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] flex items-center gap-1"><Type size={14}/> טקסט</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'long_text', label: 'טקסט ארוך', required: false }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] flex items-center gap-1"><List size={14}/> ארוך</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'boolean', label: 'שאלת כן/לא', required: false }]})} className="whitespace-nowrap px-3 py-1.5 bg-[#2EB0D9]/30 text-[#2EB0D9] border border-[#2EB0D9]/50 rounded-lg text-xs hover:bg-[#2EB0D9] hover:text-white flex items-center gap-1 font-bold"><ToggleRight size={14}/> כן / לא</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'email', label: 'אימייל', required: true }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] flex items-center gap-1"><Mail size={14}/> אימייל</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'number', label: 'מספר', required: false }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] flex items-center gap-1"><Hash size={14}/> מספר</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'select', label: 'רשימה', required: false, options: ['אופציה 1', 'אופציה 2'] }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] flex items-center gap-1"><ChevronDown size={14}/> רשימה</button>
                          <div className="w-px bg-slate-800 mx-1 self-stretch"></div>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'composite_name_id', label: 'שם+ת"ז', required: true }]})} className="whitespace-nowrap px-3 py-1.5 bg-[#2EB0D9]/20 border border-[#2EB0D9]/30 rounded-lg text-xs hover:bg-[#2EB0D9]/40 flex items-center gap-1"><UserPlus size={14}/> שם+ת.ז</button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                          {(editingForm.fields || []).map((field, idx) => (
                              <div key={field.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-3 group">
                                  <div className="flex items-center gap-4">
                                      <div className="bg-slate-900 px-2 py-1 rounded text-[10px] font-black text-slate-500 uppercase min-w-[80px] text-center">{field.type}</div>
                                      <input className="flex-1 bg-transparent border-b border-slate-700 p-1 text-white font-bold outline-none focus:border-[#2EB0D9]" value={field.label} onChange={e => {
                                          const next = [...editingForm.fields];
                                          next[idx].label = e.target.value;
                                          setEditingForm({...editingForm, fields: next});
                                      }} />
                                      <div className="flex gap-1">
                                          <button onClick={() => { const n = [...editingForm.fields]; if(idx>0) [n[idx], n[idx-1]] = [n[idx-1], n[idx]]; setEditingForm({...editingForm, fields: n}); }} className="p-1 hover:text-[#2EB0D9]"><ArrowUp size={16}/></button>
                                          <button onClick={() => { const n = [...editingForm.fields]; if(idx<n.length-1) [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; setEditingForm({...editingForm, fields: n}); }} className="p-1 hover:text-[#2EB0D9]"><ArrowDown size={16}/></button>
                                          <button onClick={() => setEditingForm({...editingForm, fields: editingForm.fields.filter(f => f.id !== field.id)})} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash size={16}/></button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Article Editor Modal */}
      {editingArticle && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8" dir="rtl">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-full flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-800 flex justify-between bg-slate-950">
                      <h3 className="font-bold text-white">עריכת מאמר</h3>
                      <button onClick={() => setEditingArticle(null)} className="text-white"><X/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                      <input className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-xl font-bold text-white outline-none focus:border-[#2EB0D9]" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} placeholder="כותרת המאמר" />
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">תמונה ראשית (URL)</label>
                              <div className="flex gap-2">
                                  <input className="flex-1 bg-slate-800 border border-slate-700 p-2 rounded text-white text-xs" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                                  <button onClick={() => setImagePicker({ isOpen: true, query: editingArticle.title, onSelect: url => setEditingArticle({...editingArticle, imageUrl: url}) })} className="bg-slate-700 p-2 rounded hover:bg-slate-600 transition-colors text-white"><Sparkles size={16}/></button>
                              </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">סדר עדיפות</label>
                            <input type="number" className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white" value={editingArticle.order || 0} onChange={e => setEditingArticle({...editingArticle, order: parseInt(e.target.value)})} />
                          </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-slate-800">
                          <h4 className="font-bold text-[#2EB0D9]">תוכן המאמר (טאבים)</h4>
                          {(editingArticle.tabs || []).map((tab, idx) => (
                              <div key={idx} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                                  <input className="w-full bg-transparent border-b border-slate-800 pb-2 font-bold text-white outline-none focus:border-[#2EB0D9]" value={tab.title} onChange={e => {
                                      const next = [...editingArticle.tabs];
                                      next[idx].title = e.target.value;
                                      setEditingArticle({...editingArticle, tabs: next});
                                  }} />
                                  <textarea className="w-full bg-transparent h-40 text-sm opacity-80 text-white outline-none" value={tab.content} onChange={e => {
                                      const next = [...editingArticle.tabs];
                                      next[idx].content = e.target.value;
                                      setEditingArticle({...editingArticle, tabs: next});
                                  }} />
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setEditingArticle(null)}>ביטול</Button>
                      <Button onClick={() => {
                          updateState({ articles: state.articles.find(a => a.id === editingArticle.id) ? state.articles.map(a => a.id === editingArticle.id ? editingArticle : a) : [editingArticle, ...state.articles] });
                          setEditingArticle(null);
                      }}>שמור מאמר</Button>
                  </div>
              </div>
          </div>
      )}

      <ImagePickerModal 
        isOpen={imagePicker.isOpen} 
        onClose={() => setImagePicker({...imagePicker, isOpen: false})} 
        onSelect={imagePicker.onSelect} 
        initialQuery={imagePicker.query} 
        unsplashAccessKey={state.config.integrations.unsplashAccessKey}
      />
    </div>
  );
};
