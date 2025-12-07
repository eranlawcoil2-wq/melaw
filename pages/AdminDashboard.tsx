import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { Settings, Layout, FileText, Plus, Save, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, CheckSquare, List, Link as LinkIcon, Copy, Users, Image as ImageIcon, Check, HelpCircle, Monitor } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'articles' | 'timelines' | 'forms' | 'team'>('articles');
  
  // Timeline/Slider Sub-tab
  const [timelineSubTab, setTimelineSubTab] = useState<'slider' | 'cards'>('slider');

  // Global Admin State - Added 'ALL' type
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');

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

  // Timeline Item State
  const [editingTimelineItem, setEditingTimelineItem] = useState<TimelineItem | null>(null);

  // Generate Article (AI)
  const handleGenerateArticle = async () => {
    if (!newArticleTopic) return;
    setIsGenerating(true);
    try {
      const generated = await generateArticleContent(newArticleTopic, selectedCategory);
      
      const newArticle: Article = {
        id: Date.now().toString(),
        category: selectedCategory === 'ALL' ? Category.HOME : selectedCategory,
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

  const handleSaveTimelineItem = () => {
      if (!editingTimelineItem) return;
      const exists = state.timelines.find(t => t.id === editingTimelineItem.id);
      let newTimelines;
      if (exists) {
          newTimelines = state.timelines.map(t => t.id === editingTimelineItem.id ? editingTimelineItem : t);
      } else {
          newTimelines = [...state.timelines, editingTimelineItem];
      }
      updateState({ timelines: newTimelines });
      setEditingTimelineItem(null);
  };

  // Helper to toggle category in timeline item
  const toggleTimelineCategory = (item: TimelineItem, category: Category) => {
      let newCategories;
      if (item.category.includes(category)) {
          newCategories = item.category.filter(c => c !== category);
      } else {
          newCategories = [...item.category, category];
      }
      return newCategories;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-l border-slate-800 flex flex-col fixed h-full right-0 z-50">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white"><span className="text-[#2EB0D9]">Me</span>Law Admin</h2>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <button onClick={() => setActiveTab('articles')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'articles' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <FileText size={20} /> ניהול מאמרים
          </button>
          <button onClick={() => setActiveTab('timelines')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'timelines' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Layout size={20} /> טיים-ליין וקרוסלות
          </button>
          <button onClick={() => setActiveTab('forms')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ClipboardList size={20} /> ניהול טפסים
          </button>
          <button onClick={() => setActiveTab('team')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'team' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Users size={20} /> ניהול צוות
          </button>
          <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Settings size={20} /> הגדרות אתר ותפריט
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button onClick={onLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors p-2"><LogOut size={18}/> יציאה</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 mr-64 p-8 overflow-y-auto min-h-screen">
        
        {/* Global Category Selector Header (Only for Articles/Forms where filtering is primary) */}
        {activeTab === 'articles' || activeTab === 'forms' ? (
            <div className="bg-slate-900 p-4 rounded-xl shadow-lg mb-8 flex items-center justify-between sticky top-0 z-20 border border-slate-800">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-300 text-lg">אזור עריכה:</span>
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as Category | 'ALL')}
                        className="p-2 border border-slate-700 rounded-lg text-[#2EB0D9] font-bold focus:outline-none focus:border-[#2EB0D9] bg-slate-800 font-sans"
                    >
                        <option value="ALL">הכל (ללא סינון)</option>
                        {Object.values(Category).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="text-slate-500 text-sm">
                    מציג תכנים עבור: <b className="text-slate-300">{selectedCategory === 'ALL' ? 'כל הקטגוריות' : selectedCategory}</b>
                </div>
            </div>
        ) : null}
        
        {/* --- Articles Tab --- */}
        {activeTab === 'articles' && (
          <div className="space-y-6">
             <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
                {editingArticle ? (
                   /* Edit Mode */
                   <div>
                       <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-[#2EB0D9]"><Edit size={20}/> עריכת מאמר</h3>
                            <button onClick={() => setEditingArticle(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
                       </div>
                       
                       <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">כותרת המאמר</label>
                                    <input type="text" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white font-sans text-lg font-bold" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">תקציר</label>
                                    <textarea rows={4} className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white font-sans" value={editingArticle.abstract} onChange={e => setEditingArticle({...editingArticle, abstract: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">קטגוריה</label>
                                    <select className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" value={editingArticle.category} onChange={e => setEditingArticle({...editingArticle, category: e.target.value as Category})}>
                                        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">קישור לתמונה (URL)</label>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white font-sans" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                                        <div className="w-12 h-12 bg-slate-800 rounded overflow-hidden flex-shrink-0 border border-slate-700">
                                            <img src={editingArticle.imageUrl} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">ציטוט</label>
                                    <input type="text" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white font-sans" value={editingArticle.quote || ''} onChange={e => setEditingArticle({...editingArticle, quote: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-slate-400">תוכן הטאבים (פסקאות)</label>
                                {editingArticle.tabs.map((tab, idx) => (
                                    <div key={idx} className="border border-slate-700 p-3 rounded bg-slate-800/50 relative group">
                                        <button 
                                            onClick={() => {
                                                if(confirm('למחוק טאב זה?')) {
                                                    const newTabs = editingArticle.tabs.filter((_, i) => i !== idx);
                                                    setEditingArticle({...editingArticle, tabs: newTabs});
                                                }
                                            }}
                                            className="absolute top-2 left-2 p-1.5 text-red-500 hover:bg-red-500/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                                            title="מחק טאב"
                                        >
                                            <Trash size={16} />
                                        </button>
                                        <input 
                                            type="text" 
                                            className="w-full p-1 border-b border-slate-700 mb-2 bg-transparent font-bold text-base text-[#2EB0D9] placeholder-slate-600" 
                                            value={tab.title} 
                                            onChange={(e) => {
                                                const newTabs = [...editingArticle.tabs];
                                                newTabs[idx].title = e.target.value;
                                                setEditingArticle({...editingArticle, tabs: newTabs});
                                            }}
                                            placeholder="כותרת הטאב"
                                        />
                                        <textarea 
                                            rows={8} 
                                            className="w-full p-3 border border-slate-700 bg-slate-900 rounded text-base font-sans leading-relaxed text-slate-300 placeholder-slate-600" 
                                            value={tab.content}
                                            onChange={(e) => {
                                                const newTabs = [...editingArticle.tabs];
                                                newTabs[idx].content = e.target.value;
                                                setEditingArticle({...editingArticle, tabs: newTabs});
                                            }}
                                            placeholder="תוכן הטאב..."
                                        />
                                    </div>
                                ))}
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setEditingArticle({
                                        ...editingArticle,
                                        tabs: [...editingArticle.tabs, { title: 'טאב חדש', content: '' }]
                                    })}
                                    className="w-full border-dashed border-2 border-slate-700 text-slate-400 hover:bg-slate-800"
                                >
                                    <Plus size={16} className="ml-2" /> הוסף טאב
                                </Button>
                            </div>
                       </div>
                       <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                           <Button variant="outline" onClick={() => setEditingArticle(null)} className="border-slate-600 text-slate-400 hover:bg-slate-800">ביטול</Button>
                           <Button onClick={handleUpdateArticle}>שמור שינויים</Button>
                       </div>
                   </div>
                ) : (
                   /* Create Mode (AI) */
                   <div>
                       <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Sparkles className="text-[#2EB0D9]"/> יצירת מאמר חדש עם AI GENERATOR</h3>
                       <div className="flex flex-col md:flex-row gap-4 items-stretch">
                           <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-400 mb-1">נושא המאמר (ייווצר בקטגוריה: {selectedCategory === 'ALL' ? Category.HOME : selectedCategory})</label>
                                <input 
                                    type="text" 
                                    value={newArticleTopic}
                                    onChange={(e) => setNewArticleTopic(e.target.value)}
                                    placeholder="לדוגמא: 5 טיפים חשובים לפני חתימה על חוזה לרכישת דירה" 
                                    className="w-full p-4 border-2 border-slate-700 rounded-lg bg-slate-800 focus:ring-2 focus:ring-[#2EB0D9] focus:border-[#2EB0D9] outline-none text-xl font-bold text-white placeholder-slate-500"
                                />
                           </div>
                           <Button size="lg" onClick={handleGenerateArticle} disabled={isGenerating || !newArticleTopic} className="md:w-64 flex-shrink-0 self-end h-[60px] text-lg shadow-lg shadow-[#2EB0D9]/20">
                                {isGenerating ? <><Loader2 className="animate-spin mr-2"/> מייצר תוכן...</> : <><Sparkles className="mr-2" size={20}/> צור מאמר אוטומטי</>}
                           </Button>
                       </div>
                   </div>
                )}
             </div>

             <div className="bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-slate-800">
                <div className="p-4 border-b border-slate-800 bg-slate-900 font-bold text-slate-300">מאמרים קיימים ({selectedCategory === 'ALL' ? 'כל המאמרים' : selectedCategory})</div>
                <table className="w-full text-right">
                   <thead className="bg-slate-800 border-b border-slate-700 text-sm text-slate-400">
                      <tr>
                         <th className="p-4 w-20">תמונה</th>
                         <th className="p-4">כותרת</th>
                         <th className="p-4">קטגוריה</th>
                         <th className="p-4">תקציר</th>
                         <th className="p-4 w-48">פעולות</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                      {state.articles.filter(a => selectedCategory === 'ALL' || a.category === selectedCategory).map(article => (
                         <tr key={article.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-4">
                                <img src={article.imageUrl} alt="" className="w-12 h-12 rounded object-cover border border-slate-700" />
                            </td>
                            <td className="p-4 font-bold text-white">{article.title}</td>
                            <td className="p-4"><span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded">{article.category}</span></td>
                            <td className="p-4 text-sm text-slate-400 max-w-xs truncate">{article.abstract}</td>
                            <td className="p-4">
                               <div className="flex gap-2">
                                   <button 
                                     onClick={() => {
                                        navigator.clipboard.writeText(article.id);
                                        alert('מזהה הועתק: ' + article.id);
                                     }}
                                     className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded flex items-center gap-1 text-xs border border-slate-700"
                                     title="העתק מזהה לקישור בטפסים"
                                   >
                                     <Copy size={14} /> העתק מזהה
                                   </button>
                                   <button 
                                     onClick={() => setEditingArticle(article)}
                                     className="p-1.5 text-[#2EB0D9] hover:bg-slate-800 rounded"
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
                                     className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                                     title="מחק"
                                   >
                                     <Trash size={16} />
                                   </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                      {state.articles.filter(a => selectedCategory === 'ALL' || a.category === selectedCategory).length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-500">אין מאמרים להצגה.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- Forms Management Tab --- */}
        {activeTab === 'forms' && (
           // ... Forms Content ... 
            <div className="space-y-8">
                {editingForm ? (
                    <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
                         <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-[#2EB0D9]"><ClipboardList size={20}/> {editingForm.title ? 'עריכת טופס' : 'יצירת טופס חדש'}</h3>
                            <button onClick={() => setEditingForm(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
                       </div>
                       
                       <div className="grid md:grid-cols-3 gap-6 mb-8">
                           <div className="md:col-span-2">
                               <label className="block text-sm font-medium mb-1 text-slate-400">שם הטופס</label>
                               <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} placeholder="לדוגמא: שאלון פרטים לצוואה"/>
                           </div>
                           <div>
                               <label className="block text-sm font-medium mb-1 text-slate-400">קטגוריה</label>
                               <select className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingForm.category} onChange={e => setEditingForm({...editingForm, category: e.target.value as Category})}>
                                    {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                               </select>
                           </div>
                           <div className="md:col-span-3">
                               <label className="block text-sm font-medium mb-1 text-slate-400">אימייל לקבלת תשובות</label>
                               <input type="email" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})} />
                           </div>
                       </div>

                       <div className="mb-6">
                           <h4 className="font-bold border-b border-slate-800 pb-2 mb-4 text-white">שדות הטופס</h4>
                           <div className="space-y-4">
                               {editingForm.fields.map((field, idx) => (
                                   <div key={field.id} className="border border-slate-700 p-4 rounded-lg bg-slate-800/50 flex gap-4 items-start">
                                       <span className="font-mono text-slate-500 pt-2">{idx + 1}</span>
                                       <div className="flex-1 grid md:grid-cols-2 gap-4">
                                           <div>
                                               <label className="text-xs text-slate-500">תווית השדה</label>
                                               <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white" value={field.label} onChange={e => updateFormField(idx, { label: e.target.value })} />
                                           </div>
                                           <div>
                                               <label className="text-xs text-slate-500">סוג שדה</label>
                                               <div className="p-2 bg-slate-900 rounded text-sm text-slate-300 border border-slate-700">
                                                   {field.type === 'text' && 'טקסט חופשי'}
                                                   {field.type === 'boolean' && 'כן / לא'}
                                                   {field.type === 'select' && 'בחירה מרשימה'}
                                                   {field.type === 'repeater' && 'רשימה (ילדים/נכסים)'}
                                               </div>
                                           </div>
                                           
                                           {field.type === 'select' && (
                                               <div className="md:col-span-2">
                                                   <label className="text-xs text-slate-500">אפשרויות (מופרדות בפסיק)</label>
                                                   <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white" value={field.options?.join(', ')} onChange={e => updateFormField(idx, { options: e.target.value.split(',').map(s => s.trim()) })} />
                                               </div>
                                           )}
                                            
                                           <div className="md:col-span-2">
                                               <label className="text-xs text-slate-500 flex items-center gap-1"><HelpCircle size={10}/> מזהה מאמר להסבר (אופציונלי)</label>
                                               <input 
                                                  type="text" 
                                                  className="w-full p-2 border border-slate-700 rounded font-mono text-sm bg-slate-900 text-white placeholder-slate-600" 
                                                  value={field.helpArticleId || ''} 
                                                  onChange={e => updateFormField(idx, { helpArticleId: e.target.value })}
                                                  placeholder="הדבק כאן מזהה מאמר"
                                               />
                                           </div>

                                           <div className="flex items-center gap-2">
                                               <input type="checkbox" checked={field.required} onChange={e => updateFormField(idx, { required: e.target.checked })} className="rounded bg-slate-700 border-slate-600" />
                                               <label className="text-sm text-slate-400">שדה חובה</label>
                                           </div>
                                       </div>
                                       <button onClick={() => removeFormField(idx)} className="text-red-500 hover:bg-red-500/10 p-2 rounded"><Trash size={18}/></button>
                                   </div>
                               ))}
                           </div>

                           <div className="mt-4 flex flex-wrap gap-2">
                               <span className="text-sm text-slate-500 w-full mb-1">הוסף שדה:</span>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('text')} className="border-slate-700 text-slate-300 hover:bg-slate-800">+ טקסט</Button>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('boolean')} className="border-slate-700 text-slate-300 hover:bg-slate-800">+ כן/לא</Button>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('select')} className="border-slate-700 text-slate-300 hover:bg-slate-800">+ רשימת בחירה</Button>
                               <Button size="sm" variant="outline" onClick={() => addFieldToForm('repeater')} className="border-slate-700 text-slate-300 hover:bg-slate-800">+ רשימת פריטים</Button>
                           </div>
                       </div>

                       <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                           <Button variant="outline" onClick={() => setEditingForm(null)} className="border-slate-600 text-slate-400 hover:bg-slate-800">ביטול</Button>
                           <Button onClick={handleSaveForm}>שמור טופס</Button>
                       </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">ניהול טפסים ({selectedCategory === 'ALL' ? state.forms.length : state.forms.filter(f => f.category === selectedCategory).length})</h3>
                            <Button onClick={() => setEditingForm({
                                id: Date.now().toString(),
                                title: '',
                                category: selectedCategory === 'ALL' ? Category.HOME : selectedCategory,
                                submitEmail: state.config.contactEmail,
                                fields: []
                            })}>
                                <Plus size={18} className="ml-2"/> טופס חדש
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {state.forms.filter(f => selectedCategory === 'ALL' || f.category === selectedCategory).map(form => (
                                <div key={form.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm hover:border-[#2EB0D9]/50 transition-colors">
                                    <h4 className="font-bold text-lg mb-2 text-white">{form.title}</h4>
                                    <p className="text-sm text-slate-400 mb-4">{form.fields.length} שדות | נשלח ל: {form.submitEmail}</p>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <div className="bg-slate-800 rounded p-2 text-xs font-mono flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-slate-400" title={`form-${form.id}`}>
                                            form-{form.id}
                                        </div>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(`form-${form.id}`)}
                                            className="text-[#2EB0D9] hover:bg-slate-800 p-2 rounded"
                                            title="העתק מזהה לשימוש בטיים-ליין"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>

                                    <div className="flex gap-2 border-t border-slate-800 pt-4">
                                        <button onClick={() => setEditingForm(form)} className="flex-1 py-2 text-[#2EB0D9] hover:bg-slate-800 rounded font-medium text-sm flex items-center justify-center gap-2">
                                            <Edit size={16}/> ערוך
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if(confirm('למחוק טופס זה?')) {
                                                    updateState({ forms: state.forms.filter(f => f.id !== form.id) });
                                                }
                                            }}
                                            className="flex-1 py-2 text-red-500 hover:bg-red-500/10 rounded font-medium text-sm flex items-center justify-center gap-2">
                                            <Trash size={16}/> מחק
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {state.forms.filter(f => selectedCategory === 'ALL' || f.category === selectedCategory).length === 0 && (
                                <div className="col-span-3 text-center py-12 text-slate-500 bg-slate-900 border border-dashed border-slate-700 rounded-xl">
                                    לא נמצאו טפסים להצגה. צור טופס חדש.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- Timelines & Sliders Tab (NEW) --- */}
        {activeTab === 'timelines' && (
            <div className="space-y-6">
                <div className="flex gap-4 mb-6 border-b border-slate-800">
                    <button 
                        onClick={() => setTimelineSubTab('slider')}
                        className={`pb-2 px-4 font-bold transition-colors ${timelineSubTab === 'slider' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        שקפים ראשיים (Hero)
                    </button>
                    <button 
                        onClick={() => setTimelineSubTab('cards')}
                        className={`pb-2 px-4 font-bold transition-colors ${timelineSubTab === 'cards' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        כרטיסי חדשות ומידע (Timeline)
                    </button>
                </div>

                {/* Sub Tab: SLIDER */}
                {timelineSubTab === 'slider' && (
                    <div className="space-y-8">
                        {editingSlide ? (
                            <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
                                <h3 className="text-xl font-bold mb-6 text-white">עריכת שקף</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-slate-400">כותרת ראשית</label>
                                        <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingSlide.title} onChange={e => setEditingSlide({...editingSlide, title: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-slate-400">תת כותרת</label>
                                        <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingSlide.subtitle} onChange={e => setEditingSlide({...editingSlide, subtitle: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-slate-400">תמונה (URL)</label>
                                        <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingSlide.imageUrl} onChange={e => setEditingSlide({...editingSlide, imageUrl: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-slate-400">קטגוריה מקושרת</label>
                                        <select className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingSlide.category} onChange={e => setEditingSlide({...editingSlide, category: e.target.value as Category})}>
                                            {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                                    <Button variant="outline" onClick={() => setEditingSlide(null)} className="border-slate-600 text-slate-400 hover:bg-slate-800">ביטול</Button>
                                    <Button onClick={handleSaveSlide}>שמור שקף</Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-end mb-4">
                                     <Button onClick={() => setEditingSlide({
                                         id: Date.now().toString(),
                                         title: 'כותרת חדשה',
                                         subtitle: 'תיאור השקף',
                                         imageUrl: 'https://picsum.photos/1920/1080',
                                         category: Category.HOME
                                     })}><Plus size={16} className="ml-2"/> הוסף שקף</Button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {state.slides.map(slide => (
                                        <div key={slide.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex gap-4 items-center hover:border-[#2EB0D9]/30 transition-colors">
                                            <img src={slide.imageUrl} className="w-32 h-20 object-cover rounded border border-slate-700" alt=""/>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-lg text-white">{slide.title}</h4>
                                                <p className="text-sm text-slate-400">{slide.subtitle}</p>
                                                <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded mt-1 inline-block">{slide.category}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingSlide(slide)} className="p-2 text-[#2EB0D9] hover:bg-slate-800 rounded"><Edit size={18}/></button>
                                                <button onClick={() => {
                                                    if(confirm('למחוק שקף זה?')) updateState({ slides: state.slides.filter(s => s.id !== slide.id) });
                                                }} className="p-2 text-red-500 hover:bg-red-500/10 rounded"><Trash size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Sub Tab: CARDS (Timeline) */}
                {timelineSubTab === 'cards' && (
                     <div className="space-y-8">
                        {editingTimelineItem ? (
                             <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
                                <h3 className="text-xl font-bold mb-6 text-white">עריכת כרטיס מידע</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold mb-1 text-slate-400">כותרת</label>
                                        <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingTimelineItem.title} onChange={e => setEditingTimelineItem({...editingTimelineItem, title: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold mb-1 text-slate-400">תיאור</label>
                                        <textarea rows={2} className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingTimelineItem.description} onChange={e => setEditingTimelineItem({...editingTimelineItem, description: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-slate-400">תמונה (URL)</label>
                                        <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingTimelineItem.imageUrl} onChange={e => setEditingTimelineItem({...editingTimelineItem, imageUrl: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-slate-400">קישור פנימי/חיצוני (אופציונלי)</label>
                                        <input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-800 text-white" value={editingTimelineItem.linkTo || ''} onChange={e => setEditingTimelineItem({...editingTimelineItem, linkTo: e.target.value})} placeholder="לדוגמא: form-123 או wills-generator" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold mb-2 text-slate-400">מוצג בקטגוריות:</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.values(Category).map(cat => (
                                                <button 
                                                    key={cat}
                                                    onClick={() => setEditingTimelineItem({
                                                        ...editingTimelineItem, 
                                                        category: toggleTimelineCategory(editingTimelineItem, cat)
                                                    })}
                                                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${editingTimelineItem.category.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                                >
                                                    {cat} {editingTimelineItem.category.includes(cat) && <Check size={12} className="inline ml-1"/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                                    <Button variant="outline" onClick={() => setEditingTimelineItem(null)} className="border-slate-600 text-slate-400 hover:bg-slate-800">ביטול</Button>
                                    <Button onClick={handleSaveTimelineItem}>שמור כרטיס</Button>
                                </div>
                             </div>
                        ) : (
                            <div>
                                <div className="flex justify-end mb-4">
                                     <Button onClick={() => setEditingTimelineItem({
                                         id: Date.now().toString(),
                                         title: 'חדשה חדשה',
                                         description: 'תיאור קצר...',
                                         imageUrl: 'https://picsum.photos/400/300',
                                         category: [Category.HOME]
                                     })}><Plus size={16} className="ml-2"/> הוסף כרטיס</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {state.timelines.map(item => (
                                        <div key={item.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm hover:border-[#2EB0D9]/30 transition-colors">
                                            <img src={item.imageUrl} className="w-full h-32 object-cover opacity-80" alt=""/>
                                            <div className="p-4">
                                                <h4 className="font-bold mb-1 text-white">{item.title}</h4>
                                                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.description}</p>
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {item.category.map(c => <span key={c} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{c}</span>)}
                                                </div>
                                                <div className="flex gap-2 border-t border-slate-800 pt-3">
                                                    <button onClick={() => setEditingTimelineItem(item)} className="flex-1 py-1 text-[#2EB0D9] hover:bg-slate-800 rounded text-sm"><Edit size={16} className="mx-auto"/></button>
                                                    <button onClick={() => {
                                                        if(confirm('למחוק כרטיס זה?')) updateState({ timelines: state.timelines.filter(t => t.id !== item.id) });
                                                    }} className="flex-1 py-1 text-red-500 hover:bg-red-500/10 rounded text-sm"><Trash size={16} className="mx-auto"/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>
                )}
            </div>
        )}

        {/* --- Config Tab (NEW) --- */}
        {activeTab === 'config' && (
            <div className="space-y-6">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-2xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Monitor/> הגדרות כלליות לאתר</h3>
                    
                    <div className="space-y-6">
                        <div>
                             <label className="block text-sm font-bold mb-2 text-slate-400">שם המשרד (יופיע בלוגו)</label>
                             <input 
                                type="text" 
                                className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" 
                                value={state.config.officeName} 
                                onChange={e => updateState({ config: { ...state.config, officeName: e.target.value }})}
                             />
                        </div>
                        <div>
                             <label className="block text-sm font-bold mb-2 text-slate-400">קישור ללוגו (URL)</label>
                             <div className="flex gap-4 items-center">
                                 <input 
                                    type="text" 
                                    className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" 
                                    value={state.config.logoUrl} 
                                    onChange={e => updateState({ config: { ...state.config, logoUrl: e.target.value }})}
                                 />
                                 <div className="w-20 h-10 bg-slate-800 rounded flex items-center justify-center p-1 border border-slate-700">
                                     <img src={state.config.logoUrl} className="max-h-full max-w-full" alt="Preview"/>
                                 </div>
                             </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-400">טלפון ראשי</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" 
                                    value={state.config.phone} 
                                    onChange={e => updateState({ config: { ...state.config, phone: e.target.value }})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-400">כתובת המשרד</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" 
                                    value={state.config.address} 
                                    onChange={e => updateState({ config: { ...state.config, address: e.target.value }})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-400">אימייל ראשי</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" 
                                    value={state.config.contactEmail} 
                                    onChange={e => updateState({ config: { ...state.config, contactEmail: e.target.value }})}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};