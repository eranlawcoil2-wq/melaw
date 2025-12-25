
import React, { useState } from 'react';
import { AppState, Article, Category, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS, MenuItem } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx';
import { ImageUploadButton } from '../components/ImageUploadButton.tsx';
import { dbService } from '../services/supabase.ts';
import { 
  FileText, Plus, Edit, Trash, X, ClipboardList, Monitor, Users, Save, 
  Type, List, ToggleRight, Settings, ChevronDown, HelpCircle, 
  Loader2, Sparkles, UserPlus, Mail, Phone, MapPin, Hash, Image as ImageIcon,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC<{ 
  state: AppState, 
  updateState: (s: Partial<AppState>) => void, 
  onLogout: () => void 
}> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'sliders' | 'team' | 'forms' | 'settings'>('articles');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  
  // Modals / Editors
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingSlide, setEditingSlide] = useState<SliderSlide | null>(null);
  const [imagePicker, setImagePicker] = useState<{ isOpen: boolean, onSelect: (url: string) => void, query: string }>({ 
    isOpen: false, onSelect: () => {}, query: '' 
  });

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    const success = await dbService.saveState(state.config.integrations.supabaseUrl, state.config.integrations.supabaseKey, state);
    setIsSaving(false);
    if (success) alert('הנתונים נשמרו בהצלחה!');
    else alert('שגיאה בשמירה ל-Supabase. בדוק את ההגדרות.');
  };

  const handleAIArticle = async () => {
    if (!newTopic) return;
    setIsGenerating(true);
    try {
      const art = await generateArticleContent(newTopic, Category.HOME, '');
      const fullArt: Article = {
        id: Date.now().toString(),
        title: art.title || newTopic,
        abstract: art.abstract || '',
        imageUrl: art.imageUrl || 'https://picsum.photos/800/600?legal',
        categories: [Category.HOME],
        tabs: art.tabs || [],
        order: (state.articles?.length || 0) + 1
      };
      updateState({ articles: [...(state.articles || []), fullArt] });
      setNewTopic('');
      alert('המאמר נוצר בהצלחה!');
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
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-1 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-xl font-black text-[#2EB0D9]">MeLaw Management</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Digital Law Office v4.7</p>
        </div>
        
        <button onClick={() => setActiveTab('articles')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${activeTab === 'articles' ? 'bg-[#2EB0D9] text-white shadow-lg' : 'hover:bg-slate-800'}`}><FileText size={18}/> מאמרים</button>
        <button onClick={() => setActiveTab('forms')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${activeTab === 'forms' ? 'bg-[#2EB0D9] text-white shadow-lg' : 'hover:bg-slate-800'}`}><ClipboardList size={18}/> טפסים</button>
        <button onClick={() => setActiveTab('team')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${activeTab === 'team' ? 'bg-[#2EB0D9] text-white shadow-lg' : 'hover:bg-slate-800'}`}><Users size={18}/> צוות המשרד</button>
        <button onClick={() => setActiveTab('sliders')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${activeTab === 'sliders' ? 'bg-[#2EB0D9] text-white shadow-lg' : 'hover:bg-slate-800'}`}><Monitor size={18}/> סליידרים</button>
        <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${activeTab === 'settings' ? 'bg-[#2EB0D9] text-white shadow-lg' : 'hover:bg-slate-800'}`}><Settings size={18}/> הגדרות כלליות</button>
        
        <div className="mt-auto pt-6 space-y-3">
          <Button onClick={handleSaveToCloud} disabled={isSaving} className="w-full h-12 gap-2 shadow-xl"><Save size={18}/> {isSaving ? 'שומר...' : 'שמור לענן'}</Button>
          <button onClick={onLogout} className="w-full text-slate-500 text-xs hover:text-white transition-colors">התנתק מהמערכת</button>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        {activeTab === 'articles' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-black mb-2">מאמרים ומדריכים</h3>
                <p className="text-slate-500 text-sm">נהל את הידע המקצועי באתר</p>
              </div>
              <div className="flex gap-2">
                <input 
                  placeholder="נושא למאמר AI..." 
                  className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-sm w-64"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                />
                <Button onClick={handleAIArticle} disabled={isGenerating} className="gap-2 bg-purple-600 hover:bg-purple-700">
                  {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                  צור עם AI
                </Button>
                <Button onClick={() => setEditingArticle({ id: Date.now().toString(), title: '', abstract: '', imageUrl: '', categories: [Category.HOME], tabs: [], order: 0 })}>
                  <Plus size={18}/> מאמר ידני
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(state.articles || []).sort((a,b) => (a.order||0)-(b.order||0)).map(art => (
                <div key={art.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group hover:border-[#2EB0D9]/50 transition-all">
                  <div className="h-32 bg-slate-800 relative">
                    <img src={art.imageUrl} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="p-5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm truncate w-40">{art.title}</h4>
                      <p className="text-[10px] text-slate-500">סדר: {art.order}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingArticle(art)} className="p-2 hover:bg-[#2EB0D9]/20 hover:text-[#2EB0D9] rounded-lg transition-colors"><Edit size={16}/></button>
                      <button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== art.id) })} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors"><Trash size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'forms' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-black mb-2">טפסים ושירותים</h3>
                <p className="text-slate-500 text-sm">הגדר מחוללי צוואות, שאלוני נדל"ן וטפסי קשר</p>
              </div>
              <Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.HOME], fields: [], submitEmail: state.config.contactEmail, submitButtonText: 'שלח טופס' })}>
                <Plus size={18}/> טופס חדש
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(state.forms || []).map(form => (
                <div key={form.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                  <div>
                    <h4 className="font-bold text-lg">{form.title}</h4>
                    <p className="text-xs text-[#2EB0D9] font-medium">{form.fields?.length || 0} שדות מוגדרים</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingForm(form)} className="p-3 bg-slate-800 rounded-xl hover:bg-[#2EB0D9] transition-all"><Edit size={18}/></button>
                    <button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-3 bg-slate-800 rounded-xl hover:bg-red-600 transition-all"><Trash size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Article Editor Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-10 animate-fade-in" dir="rtl">
           <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-full flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-2xl font-black">עריכת מאמר</h3>
                <div className="flex gap-2">
                   <Button variant="outline" onClick={() => setEditingArticle(null)}>ביטול</Button>
                   <Button onClick={() => {
                     const next = state.articles.find(a => a.id === editingArticle.id) 
                       ? state.articles.map(a => a.id === editingArticle.id ? editingArticle : a)
                       : [...state.articles, editingArticle];
                     updateState({ articles: next });
                     setEditingArticle(null);
                   }}>שמור מאמר</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">כותרת המאמר</label>
                        <input className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 mt-1" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">תקציר</label>
                        <textarea className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 mt-1 h-32" value={editingArticle.abstract} onChange={e => setEditingArticle({...editingArticle, abstract: e.target.value})} />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">סדר הופעה</label>
                          <input type="number" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 mt-1" value={editingArticle.order} onChange={e => setEditingArticle({...editingArticle, order: parseInt(e.target.value)||0})} />
                        </div>
                        <div className="flex-1">
                           <label className="text-xs font-bold text-slate-500 uppercase">קטגוריות</label>
                           <div className="flex flex-wrap gap-1 mt-1">
                              {Object.values(Category).map(cat => (
                                <button key={cat} onClick={() => setEditingArticle({...editingArticle, categories: toggleCategory(editingArticle.categories, cat)})} className={`px-2 py-1 rounded text-[10px] font-bold ${editingArticle.categories.includes(cat) ? 'bg-[#2EB0D9] text-white' : 'bg-slate-800 text-slate-500'}`}>{CATEGORY_LABELS[cat]}</button>
                              ))}
                           </div>
                        </div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">תמונה</label>
                        <div className="flex gap-2 mt-1">
                          <input className="flex-1 bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                          <Button size="sm" onClick={() => setImagePicker({ isOpen: true, query: editingArticle.title, onSelect: (url) => setEditingArticle({...editingArticle, imageUrl: url}) })}><ImageIcon size={14}/></Button>
                          {/* Fix: Manually map IntegrationsConfig properties (supabaseUrl, supabaseKey) to correctly pass as url and key to ImageUploadButton */}
                          <ImageUploadButton onImageSelected={(url) => setEditingArticle({...editingArticle, imageUrl: url})} supabaseConfig={{ url: state.config.integrations.supabaseUrl, key: state.config.integrations.supabaseKey }} />
                        </div>
                        {editingArticle.imageUrl && <img src={editingArticle.imageUrl} className="mt-2 w-full h-40 object-cover rounded-xl border border-slate-700" />}
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Form Editor Modal - FULLY IMPLEMENTED */}
      {editingForm && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-10 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl h-full flex flex-col md:flex-row overflow-hidden shadow-2xl">
            
            {/* Left Sidebar: Form Globals */}
            <div className="w-full md:w-80 bg-slate-950 border-l border-slate-800 p-8 overflow-y-auto space-y-6">
              <h4 className="font-black text-[#2EB0D9] uppercase text-sm tracking-widest">הגדרות טופס</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">שם הטופס (למשתמש)</label>
                  <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm text-white" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">אימייל לקבלת נתונים</label>
                  <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm text-white" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">טקסט כפתור שליחה</label>
                  <input className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-sm text-white" value={editingForm.submitButtonText || 'שלח טופס'} onChange={e => setEditingForm({...editingForm, submitButtonText: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">קטגוריות תצוגה</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.values(Category).map(cat => (
                      <button key={cat} onClick={() => setEditingForm({...editingForm, categories: toggleCategory(editingForm.categories, cat)})} className={`px-2 py-1 rounded text-[10px] font-bold ${(editingForm.categories || []).includes(cat) ? 'bg-[#2EB0D9] text-white' : 'bg-slate-800 text-slate-500'}`}>{CATEGORY_LABELS[cat]}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                   <span className="text-[10px] font-bold">שלח עותק ללקוח?</span>
                   <button onClick={() => setEditingForm({...editingForm, sendClientEmail: !editingForm.sendClientEmail})} className={`w-10 h-5 rounded-full transition-colors flex items-center px-1 ${editingForm.sendClientEmail ? 'bg-[#2EB0D9]' : 'bg-slate-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${editingForm.sendClientEmail ? 'translate-x-5' : 'translate-x-0'}`} />
                   </button>
                </div>
              </div>
            </div>

            {/* Main Content Area: Fields Editor */}
            <div className="flex-1 flex flex-col bg-slate-900">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="text-xl font-black">מבנה השדות</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingForm(null)}>ביטול</Button>
                  <Button size="sm" onClick={() => {
                    updateState({ forms: state.forms.find(f => f.id === editingForm.id) ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] });
                    setEditingForm(null);
                  }}>שמור הכל</Button>
                </div>
              </div>

              {/* Quick Add Bar */}
              <div className="p-4 bg-slate-950/50 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-800 shadow-inner">
                <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'text', label: 'שדה טקסט חדש', required: false }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] transition-colors flex items-center gap-1"><Type size={14}/> טקסט</button>
                <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'email', label: 'אימייל', required: true }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] transition-colors flex items-center gap-1"><Mail size={14}/> אימייל</button>
                <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'composite_name_id', label: 'שם מלא ות"ז', required: true }]})} className="whitespace-nowrap px-3 py-1.5 bg-[#2EB0D9]/20 text-[#2EB0D9] border border-[#2EB0D9]/30 rounded-lg text-xs hover:bg-[#2EB0D9] hover:text-white transition-all flex items-center gap-1 font-bold"><UserPlus size={14}/> שם + ת"ז</button>
                <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'boolean', label: 'אישור / הצהרה', required: false }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] transition-colors flex items-center gap-1"><ToggleRight size={14}/> כן/לא</button>
                <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'select', label: 'בחירה מרשימה', options: ['אופציה א', 'אופציה ב'], required: false }]})} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-[#2EB0D9] transition-colors flex items-center gap-1"><ChevronDown size={14}/> רשימה</button>
                <button onClick={() => setEditingForm({...editingForm, fields: [...(editingForm.fields || []), { id: Date.now().toString(), type: 'children_list', label: 'רשימת ילדים (חכם)', required: true }]})} className="whitespace-nowrap px-3 py-1.5 bg-cyan-900/50 rounded-lg text-xs hover:bg-[#2EB0D9] transition-colors flex items-center gap-1"><Users size={14}/> ילדים</button>
              </div>

              {/* Fields List */}
              <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-900/30">
                {(editingForm.fields || []).map((field, idx) => (
                  <div key={field.id} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-4 group hover:border-[#2EB0D9]/30 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">{idx + 1}</div>
                       <div className="flex-1 flex flex-col">
                          <input className="bg-transparent border-b border-slate-700 p-1 text-white font-bold outline-none focus:border-[#2EB0D9] transition-colors" value={field.label} onChange={e => {
                            const next = [...editingForm.fields];
                            next[idx].label = e.target.value;
                            setEditingForm({...editingForm, fields: next});
                          }} />
                          <span className="text-[10px] text-slate-500 uppercase mt-1 font-bold">{field.type}</span>
                       </div>
                       
                       <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                             <label className="text-[8px] uppercase text-slate-500 mb-1">קישור עזרה</label>
                             <select className="bg-slate-900 text-[10px] p-1.5 rounded-lg border border-slate-700 w-28" value={field.helpArticleId || ''} onChange={e => {
                               const next = [...editingForm.fields];
                               next[idx].helpArticleId = e.target.value;
                               setEditingForm({...editingForm, fields: next});
                             }}>
                               <option value="">ללא עזרה</option>
                               {state.articles?.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                             </select>
                          </div>
                          <button onClick={() => setEditingForm({...editingForm, fields: editingForm.fields.filter(f => f.id !== field.id)})} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><Trash size={18}/></button>
                       </div>
                    </div>

                    {/* Specific Config for Select Field */}
                    {field.type === 'select' && (
                      <div className="bg-slate-950/50 p-4 rounded-xl space-y-2 border border-slate-800">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">אפשרויות לבחירה (הפרד בפסיקים):</label>
                        <input 
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-white" 
                          placeholder="לדוגמא: אופציה 1, אופציה 2, אופציה 3..."
                          value={field.options?.join(', ') || ''} 
                          onChange={e => {
                             const next = [...editingForm.fields];
                             next[idx].options = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                             setEditingForm({...editingForm, fields: next});
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {editingForm.fields?.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                     <ClipboardList size={48} className="mb-4 opacity-20" />
                     <p>הטופס ריק. הוסף שדה מהסרגל למעלה.</p>
                  </div>
                )}
              </div>
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
