
import React, { useState } from 'react';
import { AppState, Article, Category, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS, TimelineItem, CalculatorDefinition, Product, MenuItem } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx';
import { ImageUploadButton } from '../components/ImageUploadButton.tsx';
import { dbService } from '../services/supabase.ts';
import { FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Monitor, Database, Users, Save, ArrowUp, ArrowDown, UserPlus, Type, List, Hash, AtSign, ToggleRight, Layout, Image as ImageIcon, Settings, ShoppingCart, Calculator, Calendar } from 'lucide-react';

export const AdminDashboard: React.FC<{ state: AppState, updateState: (s: Partial<AppState>) => void, onLogout: () => void }> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'sliders' | 'timelines' | 'team' | 'forms' | 'calculators' | 'products' | 'integrations' | 'settings'>('articles');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  
  // Modals / Editors
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingSlide, setEditingSlide] = useState<SliderSlide | null>(null);
  const [editingTimeline, setEditingTimeline] = useState<TimelineItem | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
              order: 0
          };
          updateState({ articles: [article, ...state.articles] });
          setEditingArticle(article);
          setNewTopic('');
      } catch (e) {
          alert('שגיאה ביצירת מאמר AI');
      } finally {
          setIsGenerating(false);
      }
  };

  const toggleCategory = (current: Category[], cat: Category) => current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200" dir="rtl">
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-2 overflow-y-auto">
          <h2 className="text-2xl font-black text-[#2EB0D9] mb-8">ניהול MeLaw</h2>
          
          <button onClick={() => setActiveTab('articles')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'articles' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><FileText size={18}/> מאמרים</button>
          <button onClick={() => setActiveTab('sliders')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'sliders' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Layout size={18}/> סליידרים</button>
          <button onClick={() => setActiveTab('timelines')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'timelines' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Calendar size={18}/> עדכונים</button>
          <button onClick={() => setActiveTab('team')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'team' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Users size={18}/> צוות</button>
          <button onClick={() => setActiveTab('forms')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'forms' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><ClipboardList size={18}/> טפסים</button>
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'products' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><ShoppingCart size={18}/> חנות</button>
          <button onClick={() => setActiveTab('calculators')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'calculators' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Calculator size={18}/> מחשבונים</button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${activeTab === 'settings' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}><Settings size={18}/> הגדרות</button>
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
                      {state.articles.sort((a,b)=>(a.order||0)-(b.order||0)).map(art => (
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
                                  <div className="text-[10px] text-slate-500 mt-2">{art.categories.map(c => CATEGORY_LABELS[c]).join(', ')}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'forms' && (
              <div className="space-y-8">
                  <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-black">ניהול טפסים</h3>
                      <Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.HOME], fields: [], submitEmail: state.config.contactEmail })}>טופס חדש</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      {state.forms.map(form => (
                          <div key={form.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex justify-between">
                              <div><h4 className="font-bold">{form.title}</h4></div>
                              <div className="flex gap-2">
                                  <button onClick={() => setEditingForm(form)} className="p-2 bg-slate-800 rounded"><Edit size={16}/></button>
                                  <button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-2 bg-red-900 rounded"><Trash size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-6">
                  <h3 className="text-3xl font-black">הגדרות המשרד</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">שם המשרד</label>
                          <input className="w-full bg-slate-900 border border-slate-800 p-3 rounded text-white" value={state.config.officeName} onChange={e => updateState({ config: {...state.config, officeName: e.target.value} })} />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">לוגו (URL)</label>
                          <div className="flex gap-2">
                              <input className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded text-white" value={state.config.logoUrl} onChange={e => updateState({ config: {...state.config, logoUrl: e.target.value} })} />
                              <ImageUploadButton onImageSelected={url => updateState({ config: {...state.config, logoUrl: url} })} />
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </main>

      {/* Form Editor Modal - Updated with List, Number, Long Text */}
      {editingForm && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-full flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-800 flex justify-between bg-slate-950">
                      <h3 className="font-bold">עריכת טופס: {editingForm.title}</h3>
                      <button onClick={() => setEditingForm(null)}><X/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs text-slate-500">שם הטופס</label>
                              <input className="w-full bg-slate-800 p-3 rounded" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs text-slate-500">אימייל ליעד</label>
                              <input className="w-full bg-slate-800 p-3 rounded" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})} />
                          </div>
                      </div>

                      <div className="flex gap-2 p-2 bg-black/30 rounded-lg overflow-x-auto no-scrollbar">
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'text', label: 'שדה טקסט', required: false }]})} className="px-3 py-1 bg-slate-800 rounded text-xs hover:bg-[#2EB0D9]">טקסט קצר</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'long_text', label: 'טקסט ארוך', required: false }]})} className="px-3 py-1 bg-slate-800 rounded text-xs hover:bg-[#2EB0D9]">טקסט ארוך</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'number', label: 'מספר', required: false }]})} className="px-3 py-1 bg-slate-800 rounded text-xs hover:bg-[#2EB0D9]">מספר</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'select', label: 'רשימה', required: false, options: ['בחירה 1', 'בחירה 2'] }]})} className="px-3 py-1 bg-slate-800 rounded text-xs hover:bg-[#2EB0D9]">רשימה/בחירה</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'composite_name_id', label: 'פרטי זיהוי (שם+ת"ז)', required: true }]})} className="px-3 py-1 bg-[#2EB0D9]/20 rounded text-xs border border-[#2EB0D9]/40 hover:bg-[#2EB0D9]/40">שם+ת.ז</button>
                          <button onClick={() => setEditingForm({...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type: 'children_list', label: 'רשימת ילדים', required: true }]})} className="px-3 py-1 bg-[#2EB0D9]/40 rounded text-xs border border-[#2EB0D9] hover:bg-[#2EB0D9]">פקד ילדים</button>
                      </div>

                      <div className="space-y-3">
                          {editingForm.fields.map((field, idx) => (
                              <div key={field.id} className="bg-slate-800 p-4 rounded-lg flex flex-col gap-4 border border-slate-700 group">
                                  <div className="flex items-center gap-4">
                                      <span className="text-[10px] text-slate-500 font-black uppercase w-20">{field.type}</span>
                                      <input className="flex-1 bg-transparent border-b border-slate-700 text-white font-bold" value={field.label} onChange={e => {
                                          const next = [...editingForm.fields];
                                          next[idx].label = e.target.value;
                                          setEditingForm({...editingForm, fields: next});
                                      }} />
                                      <div className="flex gap-2">
                                          <button onClick={() => { const next = [...editingForm.fields]; if(idx > 0) [next[idx], next[idx-1]] = [next[idx-1], next[idx]]; setEditingForm({...editingForm, fields: next}); }}><ArrowUp size={14}/></button>
                                          <button onClick={() => { const next = [...editingForm.fields]; if(idx < next.length-1) [next[idx], next[idx+1]] = [next[idx+1], next[idx]]; setEditingForm({...editingForm, fields: next}); }}><ArrowDown size={14}/></button>
                                          <button onClick={() => setEditingForm({...editingForm, fields: editingForm.fields.filter(f => f.id !== field.id)})} className="text-red-500 ml-2"><Trash size={14}/></button>
                                      </div>
                                  </div>
                                  {field.type === 'select' && (
                                      <div className="pl-24 space-y-2">
                                          <label className="text-[10px] text-slate-500">אפשרויות (מופרדות בפסיק):</label>
                                          <input 
                                            className="w-full bg-slate-900 p-2 rounded text-xs border border-slate-700" 
                                            value={field.options?.join(', ') || ''} 
                                            onChange={e => {
                                                const next = [...editingForm.fields];
                                                next[idx].options = e.target.value.split(',').map(s => s.trim());
                                                setEditingForm({...editingForm, fields: next});
                                            }}
                                            placeholder="בחירה 1, בחירה 2, בחירה 3..."
                                          />
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setEditingForm(null)}>ביטול</Button>
                      <Button onClick={() => {
                          updateState({ forms: state.forms.find(f => f.id === editingForm.id) ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] });
                          setEditingForm(null);
                      }}>שמור טופס</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Article Editor Modal - Full Restore */}
      {editingArticle && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-full flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-800 flex justify-between bg-slate-950">
                      <h3 className="font-bold">עריכת מאמר</h3>
                      <button onClick={() => setEditingArticle(null)}><X/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                      <input className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-xl font-bold" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} placeholder="כותרת המאמר" />
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">תמונה (URL)</label>
                              <div className="flex gap-2">
                                  <input className="flex-1 bg-slate-800 border border-slate-700 p-2 rounded" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                                  <button onClick={() => setImagePicker({ isOpen: true, query: editingArticle.title, onSelect: url => setEditingArticle({...editingArticle, imageUrl: url}) })} className="bg-slate-700 p-2 rounded"><Sparkles size={16}/></button>
                              </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">עדיפות הופעה</label>
                            <input type="number" className="w-full bg-slate-800 border border-slate-700 p-2 rounded" value={editingArticle.order} onChange={e => setEditingArticle({...editingArticle, order: parseInt(e.target.value)})} />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">קטגוריות</label>
                          <div className="flex gap-2">
                              {Object.values(Category).map(cat => (
                                  <button key={cat} onClick={() => setEditingArticle({...editingArticle, categories: toggleCategory(editingArticle.categories, cat)})} className={`px-3 py-1 rounded-full text-xs font-bold ${editingArticle.categories.includes(cat) ? 'bg-[#2EB0D9]' : 'bg-slate-800'}`}>{CATEGORY_LABELS[cat]}</button>
                              ))}
                          </div>
                      </div>
                      <div className="space-y-4">
                          <h4 className="font-bold">טאבים (תוכן המאמר)</h4>
                          {editingArticle.tabs.map((tab, idx) => (
                              <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                  <input className="w-full bg-transparent border-b border-slate-800 pb-2 font-bold" value={tab.title} onChange={e => {
                                      const next = [...editingArticle.tabs];
                                      next[idx].title = e.target.value;
                                      setEditingArticle({...editingArticle, tabs: next});
                                  }} />
                                  <textarea className="w-full bg-transparent h-32 text-sm opacity-80" value={tab.content} onChange={e => {
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
