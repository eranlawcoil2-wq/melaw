import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { Settings, Layout, FileText, Plus, Save, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, CheckSquare, List, Link as LinkIcon, Copy, Users, Image as ImageIcon, Check, HelpCircle } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'articles' | 'timelines' | 'forms' | 'team'>('articles');
  
  // Timeline/Slider Sub-tab
  const [timelineSubTab, setTimelineSubTab] = useState<'slider' | 'cards'>('slider');

  // Global Admin State
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.WILLS);

  // Articles State
  const [isGenerating, setIsGenerating] = useState(false);
  const [newArticleTopic, setNewArticleTopic] = useState('');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Forms State
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);

  // Team State
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Slider State
  const [editingSlide, setEditingSlide] = useState<SliderSlide | null>(null);

  // Generate Article (AI)
  const handleGenerateArticle = async () => {
    if (!newArticleTopic) return;
    setIsGenerating(true);
    try {
      const generated = await generateArticleContent(newArticleTopic, selectedCategory);
      
      const newArticle: Article = {
        id: Date.now().toString(),
        category: selectedCategory,
        title: generated.title || newArticleTopic,
        abstract: generated.abstract || '',
        imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`, // Placeholder
        quote: generated.quote,
        tabs: generated.tabs || []
      };

      updateState({ articles: [newArticle, ...state.articles] });
      setNewArticleTopic('');
      alert("מאמר נוצר בהצלחה באמצעות AI!");
    } catch (e) {
      alert("שגיאה ביצירת מאמר");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateArticle = () => {
      if(!editingArticle) return;
      const updatedArticles = state.articles.map(a => a.id === editingArticle.id ? editingArticle : a);
      updateState({ articles: updatedArticles });
      setEditingArticle(null);
  };

  const handleSaveForm = () => {
      if (!editingForm) return;
      // Update or Create
      const exists = state.forms.find(f => f.id === editingForm.id);
      let newForms;
      if (exists) {
          newForms = state.forms.map(f => f.id === editingForm.id ? editingForm : f);
      } else {
          newForms = [...state.forms, editingForm];
      }
      updateState({ forms: newForms });
      setEditingForm(null);
  };

  const addFieldToForm = (type: FieldType) => {
      if (!editingForm) return;
      const newField: FormField = {
          id: Date.now().toString(),
          type,
          label: 'שדה חדש',
          required: false,
          options: type === 'select' ? ['אפשרות 1', 'אפשרות 2'] : undefined
      };
      setEditingForm({
          ...editingForm,
          fields: [...editingForm.fields, newField]
      });
  };

  const updateFormField = (index: number, updates: Partial<FormField>) => {
      if (!editingForm) return;
      const newFields = [...editingForm.fields];
      newFields[index] = { ...newFields[index], ...updates };
      setEditingForm({ ...editingForm, fields: newFields });
  };

  const removeFormField = (index: number) => {
      if (!editingForm) return;
      const newFields = editingForm.fields.filter((_, i) => i !== index);
      setEditingForm({ ...editingForm, fields: newFields });
  };

  const handleSaveMember = () => {
      if (!editingMember) return;
      const exists = state.teamMembers.find(m => m.id === editingMember.id);
      let newMembers;
      if (exists) {
          newMembers = state.teamMembers.map(m => m.id === editingMember.id ? editingMember : m);
      } else {
          newMembers = [...state.teamMembers, editingMember];
      }
      updateState({ teamMembers: newMembers });
      setEditingMember(null);
  };

  const handleSaveSlide = () => {
      if (!editingSlide) return;
      const exists = state.slides.find(s => s.id === editingSlide.id);
      let newSlides;
      if (exists) {
          newSlides = state.slides.map(s => s.id === editingSlide.id ? editingSlide : s);
      } else {
          newSlides = [...state.slides, editingSlide];
      }
      updateState({ slides: newSlides });
      setEditingSlide(null);
  };

  // Helper to toggle category in timeline item
  const toggleTimelineCategory = (itemId: string, category: Category) => {
      const item = state.timelines.find(t => t.id === itemId);
      if (!item) return;

      let newCategories;
      if (item.category.includes(category)) {
          newCategories = item.category.filter(c => c !== category);
      } else {
          newCategories = [...item.category, category];
      }
      
      const newTimelines = state.timelines.map(t => t.id === itemId ? { ...t, category: newCategories } : t);
      updateState({ timelines: newTimelines });
  };

  // Filter for display in "Timelines" tab (Cards view)
  const filteredTimelines = state.timelines; 

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full right-0 z-50">
        <div className="p-6">
          <h2 className="text-2xl font-bold"><span className="text-[#2EB0D9]">Me</span>Law Admin</h2>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <button onClick={() => setActiveTab('articles')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'articles' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}>
            <FileText size={20} /> ניהול מאמרים
          </button>
          <button onClick={() => setActiveTab('timelines')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'timelines' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}>
            <Layout size={20} /> טיים-ליין וקרוסלות
          </button>
          <button onClick={() => setActiveTab('forms')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'forms' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}>
            <ClipboardList size={20} /> ניהול טפסים
          </button>
          <button onClick={() => setActiveTab('team')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'team' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}>
            <Users size={20} /> ניהול צוות
          </button>
          <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${activeTab === 'config' ? 'bg-[#2EB0D9]' : 'hover:bg-slate-800'}`}>
            <Settings size={20} /> הגדרות אתר ותפריט
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button onClick={onLogout} className="w-full flex items-center gap-2 text-slate-400 hover:text-white"><LogOut size={18}/> יציאה</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 mr-64 p-8 overflow-y-auto min-h-screen">
        
        {/* Global Category Selector Header (Only for Articles/Forms where filtering is primary) */}
        {activeTab === 'articles' || activeTab === 'forms' ? (
            <div className="bg-white p-4 rounded-xl shadow-sm mb-8 flex items-center justify-between sticky top-0 z-20 border border-slate-200">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-700 text-lg">אזור עריכה:</span>
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as Category)}
                        className="p-2 border-2 border-[#2EB0D9]/20 rounded-lg text-[#2EB0D9] font-bold focus:outline-none focus:border-[#2EB0D9] bg-slate-50 font-sans"
                    >
                        {Object.values(Category).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="text-slate-400 text-sm">
                    מציג תכנים עבור: <b>{selectedCategory}</b>
                </div>
            </div>
        ) : null}
        
        {/* --- Articles Tab --- */}
        {activeTab === 'articles' && (
          <div className="space-y-6 animate-fade-in">
             {/* ... Articles Content ... */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                {editingArticle ? (
                   /* Edit Mode */
                   <div>
                       <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-[#2EB0D9]"><Edit size={20}/> עריכת מאמר</h3>
                            <button onClick={() => setEditingArticle(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                       </div>
                       
                       <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">כותרת המאמר</label>
                                    <input type="text" className="w-full p-2 border rounded font-sans text-lg font-bold" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">תקציר</label>
                                    <textarea rows={4} className="w-full p-2 border rounded font-sans" value={editingArticle.abstract} onChange={e => setEditingArticle({...editingArticle, abstract: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">קישור לתמונה (URL)</label>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-full p-2 border rounded font-sans" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                                        <div className="w-10 h-10 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                                            <img src={editingArticle.imageUrl} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">ציטוט</label>
                                    <input type="text" className="w-full p-2 border rounded font-sans" value={editingArticle.quote || ''} onChange={e => setEditingArticle({...editingArticle, quote: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-slate-700">תוכן הטאבים (פסקאות)</label>
                                {editingArticle.tabs.map((tab, idx) => (
                                    <div key={idx} className="border p-3 rounded bg-slate-50">
                                        <input 
                                            type="text" 
                                            className="w-full p-1 border-b mb-2 bg-transparent font-bold text-base text-[#2EB0D9]" 
                                            value={tab.title} 
                                            onChange={(e) => {
                                                const newTabs = [...editingArticle.tabs];
                                                newTabs[idx].title = e.target.value;
                                                setEditingArticle({...editingArticle, tabs: newTabs});
                                            }}
                                        />
                                        <textarea 
                                            rows={12} 
                                            className="w-full p-3 border bg-white rounded text-base font-sans leading-relaxed" 
                                            value={tab.content}
                                            onChange={(e) => {
                                                const newTabs = [...editingArticle.tabs];
                                                newTabs[idx].content = e.target.value;
                                                setEditingArticle({...editingArticle, tabs: newTabs});
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                       </div>
                       <div className="mt-6 flex justify-end gap-2">
                           <Button variant="outline" onClick={() => setEditingArticle(null)}>ביטול</Button>
                           <Button onClick={handleUpdateArticle}>שמור שינויים</Button>
                       </div>
                   </div>
                ) : (
                   /* Create Mode (AI) */
                   <div>
                       <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800"><Sparkles className="text-[#2EB0D9]"/> יצירת מאמר חדש עם AI GENERATOR</h3>
                       <div className="flex flex-col md:flex-row gap-4 items-stretch">
                           <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-700 mb-1">נושא המאמר (ייווצר בקטגוריה: {selectedCategory})</label>
                                <input 
                                    type="text" 
                                    value={newArticleTopic}
                                    onChange={(e) => setNewArticleTopic(e.target.value)}
                                    placeholder="לדוגמא: 5 טיפים חשובים לפני חתימה על חוזה לרכישת דירה" 
                                    className="w-full p-4 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2EB0D9] focus:border-[#2EB0D9] outline-none text-xl font-bold text-slate-800 placeholder-slate-300"
                                />
                           </div>
                           <Button size="lg" onClick={handleGenerateArticle} disabled={isGenerating || !newArticleTopic} className="md:w-64 flex-shrink-0 self-end h-[60px] text-lg">
                                {isGenerating ? <><Loader2 className="animate-spin mr-2"/> מייצר תוכן...</> : <><Sparkles className="mr-2" size={20}/> צור מאמר אוטומטי</>}
                           </Button>
                       </div>
                   </div>
                )}
             </div>

             <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-4 border-b bg-slate-50 font-bold text-slate-700">מאמרים קיימים ({selectedCategory})</div>
                <table className="w-full text-right">
                   <thead className="bg-slate-50 border-b text-sm text-slate-500">
                      <tr>
                         <th className="p-4 w-20">תמונה</th>
                         <th className="p-4">כותרת</th>
                         <th className="p-4">תקציר</th>
                         <th className="p-4 w-48">פעולות</th>
                      </tr>
                   </thead>
                   <tbody>
                      {state.articles.filter(a => a.category === selectedCategory).map(article => (
                         <tr key={article.id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                                <img src={article.imageUrl} alt="" className="w-12 h-12 rounded object-cover border" />
                            </td>
                            <td className="p-4 font-bold text-slate-800">{article.title}</td>
                            <td className="p-4 text-sm text-slate-500 max-w-xs truncate">{article.abstract}</td>
                            <td className="p-4">
                               <div className="flex gap-2">
                                   <button 
                                     onClick={() => {
                                        navigator.clipboard.writeText(article.id);
                                        alert('מזהה הועתק: ' + article.id);
                                     }}
                                     className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded flex items-center gap-1 text-xs"
                                     title="העתק מזהה לקישור בטפסים"
                                   >
                                     <Copy size={14} /> העתק מזהה
                                   </button>
                                   <button 
                                     onClick={() => setEditingArticle(article)}
                                     className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                     title="ערוך"
                                   >
                                     <Edit size={16} />
                                   </button>
                                   <button 
                                     onClick={() => {
                                         if(confirm('למחוק את המאמר?')) {
                                             updateState({ articles: state.articles.filter(a => a.id !== article.id) })
                                         }
                                     }}
                                     className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                     title="מחק"
                                   >
                                     <Trash size={16} />
                                   </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                      {state.articles.filter(a => a.category === selectedCategory).length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-slate-400">אין מאמרים בקטגוריה זו עדיין.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- Forms Management Tab --- */}
        {activeTab === 'forms' && (
           // ... Forms Content ... 
            <div className="space-y-8 animate-fade-in">
                {editingForm ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-[#2EB0D9]"><ClipboardList size={20}/> {editingForm.title ? 'עריכת טופס' : 'יצירת טופס חדש'}</h3>
                            <button onClick={() => setEditingForm(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                       </div>
                       
                       <div className="grid md:grid-cols-3 gap-6 mb-8">
                           <div className="md:col-span-2">
                               <label className="block text-sm font-medium mb-1">שם הטופס</label>
                               <input type="text" className="w-full p-2 border rounded" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} placeholder="לדוגמא: שאלון פרטים לצוואה"/>
                           </div>
                           <div>
                               <label className="block text-sm font-medium mb-1">קטגוריה</label>
                               <select className="w-full p-2 border rounded" value={editingForm.category} onChange={e => setEditingForm({...editingForm, category: e.target.value as Category})}>
                                    {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                               </select>
                           </div>
                           <div className="md:col-span-3">
                               <label className="block text-sm font-medium mb-1">אימייל לקבלת תשובות</label>
                               <input type="email" className="w-full p-2 border rounded" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})} />
                           </div>
                       </div>

                       <div className="mb-6">
                           <h4 className="font-bold border-b pb-2 mb-4">שדות הטופס</h4>
                           <div className="space-y-4">
                               {editingForm.fields.map((field, idx) => (
                                   <div key={field.id} className="border p-4 rounded-lg bg-slate-50 flex gap-4 items-start">
                                       <span className="font-mono text-slate-400 pt-2">{idx + 1}</span>
                                       <div className="flex-1 grid md:grid-cols-2 gap-4">
                                           <div>
                                               <label className="text-xs text-slate-500">תווית השדה</label>
                                               <input type="text" className="w-full p-2 border rounded" value={field.label} onChange={e => updateFormField(idx, { label: e.target.value })} />
                                           </div>
                                           <div>
                                               <label className="text-xs text-slate-500">סוג שדה</label>
                                               <div className="p-2 bg-slate-100 rounded text-sm text-slate-700 border">
                                                   {field.type === 'text' && 'טקסט חופשי'}
                                                   {field.type === 'boolean' && 'כן / לא'}
                                                   {field.type === 'select' && 'בחירה מרשימה'}
                                                   {field.type === 'repeater' && 'רשימה (ילדים/נכסים)'}
                                               </div>
                                           </div>
                                           
                                           {field.type === 'select' && (
                                               <div className="md:col-span-2">
                                                   <label className="text-xs text-slate-500">אפשרויות (מופרדות בפסיק)</label>
                                                   <input type="text" className="w-full p-2 border rounded" value={field.options?.join(', ')} onChange={e => updateFormField(idx, { options: e.target.value.split(',').map(s => s.trim()) })} />
                                               </div>
                                           )}
                                            
                                           <div className="md:col-span-2">
                                               <label className="text-xs text-slate-500 flex items-center gap-1"><HelpCircle size={10}/> מזהה מאמר להסבר (אופציונלי)</label>
                                               <input 
                                                  type="text" 
                                                  className="w-full p-2 border rounded font-mono text-sm" 
                                                  value={field.helpArticleId || ''} 
                                                  onChange={e => updateFormField(idx, { helpArticleId: e.target.value })}
                                                  placeholder="הדבק כאן מזהה מאמר"
                                               />
                                           </div>

                                           <div className="flex items-center gap-2">
                                               <input type="checkbox" checked={field.required} onChange={e => updateFormField(idx, { required: e.target.checked })} />
                                               <label className="text-sm">שדה חובה</label>
                                           </div>
                                       </div>
                                       <button onClick={() => removeFormField(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash size={18}/></button>
                                   </div>
                               ))}
                           </div>

                           <div className="mt-4 flex flex-wrap gap-2">
                               <span className="text-sm text-slate-500 w-full mb-1">הוסף שדה:</span>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('text')}>+ טקסט</Button>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('boolean')}>+ כן/לא</Button>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('select')}>+ רשימת בחירה</Button>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('repeater')}>+ רשימת פריטים</Button>
                           </div>
                       </div>

                       <div className="flex justify-end gap-2 border-t pt-4">
                           <Button variant="outline" onClick={() => setEditingForm(null)}>ביטול</Button>
                           <Button onClick={handleSaveForm}>שמור טופס</Button>
                       </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">ניהול טפסים ({state.forms.filter(f => f.category === selectedCategory).length})</h3>
                            <Button onClick={() => setEditingForm({
                                id: Date.now().toString(),
                                title: '',
                                category: selectedCategory,
                                submitEmail: state.config.contactEmail,
                                fields: []
                            })}>
                                <Plus size={18} className="ml-2"/> טופס חדש
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.forms.filter(f => f.category === selectedCategory).map(form => (
                                <div key={form.id} className="bg-white border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-lg mb-2">{form.title}</h4>
                                    <p className="text-sm text-slate-500 mb-4">{form.fields.length} שדות | נשלח ל: {form.submitEmail}</p>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <div className="bg-slate-100 rounded p-2 text-xs font-mono flex-1 overflow-hidden text-ellipsis whitespace-nowrap" title={`form-${form.id}`}>
                                            form-{form.id}
                                        </div>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(`form-${form.id}`)}
                                            className="text-[#2EB0D9] hover:bg-slate-50 p-2 rounded"
                                            title="העתק מזהה לשימוש בטיים-ליין"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>

                                    <div className="flex gap-2 border-t pt-4">
                                        <button onClick={() => setEditingForm(form)} className="flex-1 py-2 text-blue-600 hover:bg-blue-50 rounded font-medium text-sm flex items-center justify-center gap-2">
                                            <Edit size={16}/> ערוך
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if(confirm('למחוק טופס זה?')) {
                                                    updateState({ forms: state.forms.filter(f => f.id !== form.id) });
                                                }
                                            }}
                                            className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded font-medium text-sm flex items-center justify-center gap-2">
                                            <Trash size={16}/> מחק
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {state.forms.filter(f => f.category === selectedCategory).length === 0 && (
                                <div className="col-span-3 text-center py-12 text-slate-400 bg-white border border-dashed rounded-xl">
                                    לא נמצאו טפסים בקטגוריה {selectedCategory}. צור טופס חדש.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- Team Management Tab --- */}
        {activeTab === 'team' && (
             // ... Team Content (No Change) ...
             <div className="space-y-8 animate-fade-in">
                 {editingMember ? (
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-[#2EB0D9]"><Users size={20}/> {editingMember.fullName ? 'עריכת איש צוות' : 'הוספת איש צוות'}</h3>
                            <button onClick={() => setEditingMember(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                         </div>
                         <div className="grid md:grid-cols-2 gap-6">
                             <div>
                                 <label className="block text-sm font-medium mb-1">שם מלא</label>
                                 <input type="text" className="w-full p-2 border rounded" value={editingMember.fullName} onChange={e => setEditingMember({...editingMember, fullName: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">תפקיד</label>
                                 <input type="text" className="w-full p-2 border rounded" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">התמחות</label>
                                 <input type="text" className="w-full p-2 border rounded" value={editingMember.specialization} onChange={e => setEditingMember({...editingMember, specialization: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">טלפון</label>
                                 <input type="text" className="w-full p-2 border rounded" value={editingMember.phone} onChange={e => setEditingMember({...editingMember, phone: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">אימייל</label>
                                 <input type="text" className="w-full p-2 border rounded" value={editingMember.email} onChange={e => setEditingMember({...editingMember, email: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">קישור לתמונה</label>
                                 <div className="flex gap-2">
                                    <input type="text" className="w-full p-2 border rounded" value={editingMember.imageUrl} onChange={e => setEditingMember({...editingMember, imageUrl: e.target.value})} />
                                    <img src={editingMember.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover border" />
                                 </div>
                             </div>
                             <div className="md:col-span-2">
                                 <label className="block text-sm font-medium mb-1">ביוגרפיה (יוצג בחלונית קופצת)</label>
                                 <textarea rows={4} className="w-full p-2 border rounded" value={editingMember.bio} onChange={e => setEditingMember({...editingMember, bio: e.target.value})} />
                             </div>
                         </div>
                         <div className="mt-6 flex justify-end gap-2">
                             <Button variant="outline" onClick={() => setEditingMember(null)}>ביטול</Button>
                             <Button onClick={handleSaveMember}>שמור שינויים</Button>
                         </div>
                     </div>
                 ) : (
                     <div>
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">צוות המשרד</h3>
                            <Button onClick={() => setEditingMember({
                                id: Date.now().toString(),
                                fullName: '', role: '', specialization: '', email: '', phone: '', imageUrl: 'https://picsum.photos/400/400', bio: ''
                            })}>
                                <Plus size={18} className="ml-2"/> הוסף איש צוות
                            </Button>
                         </div>
                         <div className="grid md:grid-cols-2 gap-4">
                             {state.teamMembers.map(member => (
                                 <div key={member.id} className="bg-white p-4 rounded-xl border flex gap-4 items-center">
                                     <img src={member.imageUrl} alt={member.fullName} className="w-16 h-16 rounded-full object-cover" />
                                     <div className="flex-1">
                                         <h4 className="font-bold">{member.fullName}</h4>
                                         <p className="text-sm text-slate-500">{member.role}</p>
                                     </div>
                                     <div className="flex gap-2">
                                         <button onClick={() => setEditingMember(member)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={18}/></button>
                                         <button onClick={() => {
                                             if(confirm('למחוק איש צוות זה?')) {
                                                 updateState({ teamMembers: state.teamMembers.filter(m => m.id !== member.id) });
                                             }
                                         }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash size={18}/></button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
        )}
      </main>
    </div>
  );
};