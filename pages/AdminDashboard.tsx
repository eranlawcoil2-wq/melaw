import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { Settings, Layout, FileText, Plus, Save, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, CheckSquare, List, Link as LinkIcon, Copy, Users, Image as ImageIcon, Check, HelpCircle, Monitor, Sun, Moon, Database, Key, CreditCard, Mail, Code, ArrowRight } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
}

// --- GOOGLE APPS SCRIPT TEMPLATE (UPDATED FOR EMAIL) ---
const GOOGLE_SCRIPT_TEMPLATE = `
// העתק את כל הקוד הזה והדבק אותו ב-Google Apps Script
// (Extensions > Apps Script)

// הגדרות אימייל
const NOTIFICATION_EMAIL = "your-email@example.com"; // <-- שנה לאימייל שלך כדי לקבל התראות!

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheets()[0];

    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    // 1. שמירה בגיליון
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    if (sheet.getLastColumn() === 0 || (headers.length === 1 && headers[0] === "")) {
      headers = ["Timestamp"];
      for (var key in data) {
        if (key !== "Timestamp") headers.push(key);
      }
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    var newRow = [];
    var timestamp = new Date();

    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (header === "Timestamp") {
        newRow.push(timestamp);
      } else {
        var val = data[header];
        if (typeof val === 'object' && val !== null) {
          newRow.push(JSON.stringify(val));
        } else {
          newRow.push(val || "");
        }
      }
    }
    sheet.appendRow(newRow);

    // 2. שליחת אימייל התראה (לבעל האתר)
    if (NOTIFICATION_EMAIL && NOTIFICATION_EMAIL !== "your-email@example.com") {
        var subject = "התקבל טופס חדש באתר MeLaw";
        var body = "התקבלו נתונים חדשים:\n\n";
        for (var key in data) {
            body += key + ": " + data[key] + "\n";
        }
        MailApp.sendEmail({
            to: NOTIFICATION_EMAIL,
            subject: subject,
            body: body
        });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'integrations' | 'articles' | 'timelines' | 'forms' | 'team'>('articles');
  
  // Timeline/Slider Sub-tab
  const [timelineSubTab, setTimelineSubTab] = useState<'slider' | 'cards'>('slider');

  // Global Admin State
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [showScript, setShowScript] = useState(false);

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
    
    // Check if API key exists
    if (!state.config.integrations.geminiApiKey) {
        alert("שגיאה: חסר מפתח API של Gemini. נא להגדיר אותו בלשונית 'חיבורים ואינטגרציות'.");
        return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateArticleContent(newArticleTopic, selectedCategory, state.config.integrations.geminiApiKey);
      
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

  const toggleTimelineCategory = (item: TimelineItem, category: Category) => {
      let newCategories;
      if (item.category.includes(category)) {
          newCategories = item.category.filter(c => c !== category);
      } else {
          newCategories = [...item.category, category];
      }
      return newCategories;
  };

  const updateIntegration = (key: keyof typeof state.config.integrations, value: string) => {
      updateState({
          config: {
              ...state.config,
              integrations: {
                  ...state.config.integrations,
                  [key]: value
              }
          }
      });
  };

  // Filter helpers
  const filteredArticles = state.articles.filter(a => selectedCategory === 'ALL' || a.category === selectedCategory);
  const filteredTimelines = state.timelines.filter(t => selectedCategory === 'ALL' || t.category.includes(selectedCategory));

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
          <div className="border-t border-slate-800 my-2"></div>
          <button onClick={() => setActiveTab('integrations')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LinkIcon size={20} /> חיבורים ואינטגרציות
          </button>
          <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Settings size={20} /> הגדרות אתר
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button onClick={onLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors p-2"><LogOut size={18}/> יציאה</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 mr-64 p-8 overflow-y-auto min-h-screen">
        
        {/* Global Category Selector Header */}
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

        {/* --- ARTICLES TAB --- */}
        {activeTab === 'articles' && (
            <div className="animate-fade-in space-y-8">
                {/* Generator Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                        <Sparkles className="text-[#2EB0D9]" /> מחולל מאמרים (AI)
                    </h3>
                    <div className="flex gap-4">
                        <input 
                            type="text" 
                            className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-[#2EB0D9]" 
                            placeholder="על איזה נושא תרצה לכתוב מאמר? (למשל: ירושה ללא צוואה)" 
                            value={newArticleTopic}
                            onChange={(e) => setNewArticleTopic(e.target.value)}
                        />
                        <Button onClick={handleGenerateArticle} disabled={isGenerating} className="min-w-[150px]">
                            {isGenerating ? <><Loader2 className="animate-spin ml-2" size={18}/> חושב...</> : 'צור מאמר'}
                        </Button>
                    </div>
                </div>

                {/* Articles List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map(article => (
                        <div key={article.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-[#2EB0D9] transition-all group">
                            <div className="h-40 overflow-hidden relative">
                                <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white">{CATEGORY_LABELS[article.category]}</div>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-lg mb-2 line-clamp-1">{article.title}</h4>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{article.abstract}</p>
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => setEditingArticle(article)}
                                        className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg transition-colors text-white"
                                        title="ערוך"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button 
                                        onClick={() => updateState({ articles: state.articles.filter(a => a.id !== article.id) })}
                                        className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg transition-colors text-white"
                                        title="מחק"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit Modal */}
                {editingArticle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                                <h3 className="text-xl font-bold">עריכת מאמר</h3>
                                <button onClick={() => setEditingArticle(null)}><X className="text-slate-400 hover:text-white" /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-400 mb-1">כותרת</label>
                                        <input type="text" className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-400 mb-1">קטגוריה</label>
                                        <select className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.category} onChange={e => setEditingArticle({...editingArticle, category: e.target.value as Category})}>
                                            {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-400 mb-1">תקציר</label>
                                        <textarea className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white h-20" value={editingArticle.abstract} onChange={e => setEditingArticle({...editingArticle, abstract: e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-400 mb-1">תמונה ראשית (URL)</label>
                                        <div className="flex gap-4">
                                            <input type="text" className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                                            <img src={editingArticle.imageUrl} className="h-12 w-20 object-cover rounded border border-slate-700" alt="Preview" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="font-bold text-[#2EB0D9] border-b border-slate-800 pb-2">תוכן המאמר (טאבים)</h4>
                                    {editingArticle.tabs.map((tab, idx) => (
                                        <div key={idx} className="bg-slate-950 p-4 rounded border border-slate-800">
                                            <input 
                                                className="w-full bg-transparent font-bold mb-2 border-b border-slate-800 focus:border-[#2EB0D9] outline-none text-white" 
                                                value={tab.title} 
                                                onChange={(e) => {
                                                    const newTabs = [...editingArticle.tabs];
                                                    newTabs[idx].title = e.target.value;
                                                    setEditingArticle({...editingArticle, tabs: newTabs});
                                                }}
                                            />
                                            <textarea 
                                                className="w-full bg-slate-900 p-2 rounded text-slate-300 text-sm h-32 border border-slate-800 focus:border-[#2EB0D9] outline-none"
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
                            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-slate-900">
                                <Button variant="outline" onClick={() => setEditingArticle(null)}>ביטול</Button>
                                <Button onClick={handleUpdateArticle}>שמור שינויים</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TIMELINES & SLIDER TAB --- */}
        {activeTab === 'timelines' && (
            <div className="space-y-6">
                <div className="flex gap-4 border-b border-slate-800 pb-4">
                    <button onClick={() => setTimelineSubTab('slider')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'slider' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>סליידר ראשי (Hero)</button>
                    <button onClick={() => setTimelineSubTab('cards')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'cards' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>כרטיסי מידע (News)</button>
                </div>

                {timelineSubTab === 'slider' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 gap-4">
                            {state.slides.map(slide => (
                                <div key={slide.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex gap-6 items-center">
                                    <img src={slide.imageUrl} className="w-32 h-20 object-cover rounded-lg" alt=""/>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white text-lg">{slide.title}</h4>
                                        <p className="text-slate-400">{slide.subtitle}</p>
                                    </div>
                                    <button onClick={() => setEditingSlide(slide)} className="p-2 hover:bg-slate-800 rounded-full text-[#2EB0D9]"><Edit size={20}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {timelineSubTab === 'cards' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-end">
                            <Button onClick={() => setEditingTimelineItem({
                                id: Date.now().toString(),
                                title: '', description: '', imageUrl: 'https://picsum.photos/400/300', category: [Category.HOME]
                            })}><Plus size={18} className="ml-2"/> הוסף כרטיס חדש</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredTimelines.map(item => (
                                <div key={item.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white mb-1">{item.title}</h4>
                                        <p className="text-slate-400 text-sm line-clamp-2">{item.description}</p>
                                        <div className="flex gap-2 mt-2">
                                            {item.category.map(c => <span key={c} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{CATEGORY_LABELS[c]}</span>)}
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between">
                                        <button onClick={() => setEditingTimelineItem(item)} className="p-2 hover:bg-slate-800 rounded text-[#2EB0D9]"><Edit size={18}/></button>
                                        <button onClick={() => updateState({ timelines: state.timelines.filter(t => t.id !== item.id) })} className="p-2 hover:bg-slate-800 rounded text-red-400"><Trash size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Edit Slide Modal */}
                {editingSlide && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-900 rounded-xl w-full max-w-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
                            <h3 className="text-xl font-bold mb-4">עריכת שקופית</h3>
                            <div>
                                <label className="block text-sm text-slate-400">כותרת ראשית</label>
                                <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingSlide.title} onChange={e => setEditingSlide({...editingSlide, title: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400">כותרת משנה</label>
                                <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingSlide.subtitle} onChange={e => setEditingSlide({...editingSlide, subtitle: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400">URL תמונה</label>
                                <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingSlide.imageUrl} onChange={e => setEditingSlide({...editingSlide, imageUrl: e.target.value})}/>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="outline" onClick={() => setEditingSlide(null)}>ביטול</Button>
                                <Button onClick={handleSaveSlide}>שמור</Button>
                            </div>
                        </div>
                     </div>
                )}

                {/* Edit Timeline Modal */}
                {editingTimelineItem && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-900 rounded-xl w-full max-w-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
                            <h3 className="text-xl font-bold mb-4">עריכת כרטיס חדשות/מידע</h3>
                            <div>
                                <label className="block text-sm text-slate-400">כותרת</label>
                                <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingTimelineItem.title} onChange={e => setEditingTimelineItem({...editingTimelineItem, title: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400">תיאור</label>
                                <textarea className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white h-24" value={editingTimelineItem.description} onChange={e => setEditingTimelineItem({...editingTimelineItem, description: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400">לינק פנימי (אופציונלי)</label>
                                <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" placeholder="form-id או wills-generator" value={editingTimelineItem.linkTo || ''} onChange={e => setEditingTimelineItem({...editingTimelineItem, linkTo: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">מופיע בקטגוריות:</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(Category).map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={() => {
                                                 const newCats = toggleTimelineCategory(editingTimelineItem, cat);
                                                 setEditingTimelineItem({...editingTimelineItem, category: newCats});
                                            }}
                                            className={`px-3 py-1 rounded-full text-xs border ${editingTimelineItem.category.includes(cat) ? 'bg-[#2EB0D9] border-[#2EB0D9] text-white' : 'bg-transparent border-slate-600 text-slate-400'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="outline" onClick={() => setEditingTimelineItem(null)}>ביטול</Button>
                                <Button onClick={handleSaveTimelineItem}>שמור</Button>
                            </div>
                        </div>
                     </div>
                )}
            </div>
        )}

        {/* --- FORMS TAB --- */}
        {activeTab === 'forms' && (
            <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800">
                     <div>
                         <h3 className="text-xl font-bold text-white">טפסים דינמיים</h3>
                         <p className="text-slate-400 text-sm">יצירה ועריכה של שאלונים ללקוחות</p>
                     </div>
                     <Button onClick={() => setEditingForm({
                         id: `form-${Date.now()}`,
                         title: 'טופס חדש',
                         category: Category.HOME,
                         fields: [],
                         submitEmail: 'office@melaw.co.il'
                     })}><Plus size={18} className="ml-2"/> צור טופס חדש</Button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {state.forms.map(form => (
                         <div key={form.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-[#2EB0D9] transition-all group">
                             <div className="flex justify-between items-start mb-4">
                                 <div className="p-3 bg-slate-800 rounded-lg text-[#2EB0D9] group-hover:bg-[#2EB0D9] group-hover:text-white transition-colors">
                                     <ClipboardList size={24}/>
                                 </div>
                                 <div className="flex gap-2">
                                     <button onClick={() => setEditingForm(form)} className="p-2 hover:bg-slate-800 rounded text-white"><Edit size={16}/></button>
                                     <button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-2 hover:bg-slate-800 rounded text-red-400"><Trash size={16}/></button>
                                 </div>
                             </div>
                             <h4 className="font-bold text-lg text-white mb-1">{form.title}</h4>
                             <p className="text-slate-500 text-xs mb-4">ID: {form.id}</p>
                             <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-950 p-2 rounded">
                                 <Mail size={14}/> {form.submitEmail}
                             </div>
                         </div>
                     ))}
                 </div>

                 {/* Edit Form Modal */}
                 {editingForm && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                         <div className="bg-slate-900 rounded-xl w-full max-w-5xl h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
                             <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                 <h3 className="text-xl font-bold">עורך טפסים</h3>
                                 <button onClick={() => setEditingForm(null)}><X className="text-slate-400 hover:text-white"/></button>
                             </div>
                             
                             <div className="flex-1 overflow-hidden flex">
                                 {/* Form Settings Sidebar */}
                                 <div className="w-1/3 border-l border-slate-800 p-6 overflow-y-auto bg-slate-950">
                                     <h4 className="font-bold text-[#2EB0D9] mb-4">הגדרות כלליות</h4>
                                     <div className="space-y-4">
                                         <div>
                                             <label className="block text-sm text-slate-400 mb-1">שם הטופס</label>
                                             <input className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})}/>
                                         </div>
                                         <div>
                                             <label className="block text-sm text-slate-400 mb-1">אימייל לקבלת תשובות</label>
                                             <input className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})}/>
                                         </div>
                                         <div>
                                             <label className="block text-sm text-slate-400 mb-1">קטגוריה</label>
                                             <select className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white" value={editingForm.category} onChange={e => setEditingForm({...editingForm, category: e.target.value as Category})}>
                                                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                             </select>
                                         </div>
                                         <div className="pt-6 border-t border-slate-800">
                                             <h4 className="font-bold text-[#2EB0D9] mb-4">הוסף שדה</h4>
                                             <div className="grid grid-cols-2 gap-2">
                                                 <button onClick={() => addFieldToForm('text')} className="p-2 bg-slate-900 border border-slate-700 hover:border-[#2EB0D9] rounded text-sm text-slate-300">טקסט</button>
                                                 <button onClick={() => addFieldToForm('select')} className="p-2 bg-slate-900 border border-slate-700 hover:border-[#2EB0D9] rounded text-sm text-slate-300">בחירה</button>
                                                 <button onClick={() => addFieldToForm('boolean')} className="p-2 bg-slate-900 border border-slate-700 hover:border-[#2EB0D9] rounded text-sm text-slate-300">כן/לא</button>
                                                 <button onClick={() => addFieldToForm('repeater')} className="p-2 bg-slate-900 border border-slate-700 hover:border-[#2EB0D9] rounded text-sm text-slate-300">רשימה</button>
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Fields Preview Area */}
                                 <div className="flex-1 p-6 overflow-y-auto bg-slate-900">
                                     <div className="space-y-4 max-w-2xl mx-auto">
                                         {editingForm.fields.map((field, idx) => (
                                             <div key={field.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 relative group hover:border-[#2EB0D9] transition-colors">
                                                 <button onClick={() => removeFormField(idx)} className="absolute top-2 left-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={16}/></button>
                                                 
                                                 <div className="flex gap-4 mb-2">
                                                     <div className="flex-1">
                                                         <label className="text-xs text-slate-500 block mb-1">תווית השדה</label>
                                                         <input className="w-full bg-transparent border-b border-slate-800 focus:border-[#2EB0D9] outline-none text-white font-bold" value={field.label} onChange={e => updateFormField(idx, { label: e.target.value })}/>
                                                     </div>
                                                     <div className="w-32">
                                                         <label className="text-xs text-slate-500 block mb-1">סוג</label>
                                                         <div className="text-sm text-slate-300 bg-slate-900 px-2 py-1 rounded">{field.type}</div>
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="flex items-center gap-4 mt-3">
                                                     <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                                         <input type="checkbox" checked={field.required} onChange={e => updateFormField(idx, { required: e.target.checked })} className="rounded bg-slate-900 border-slate-700"/> שדה חובה
                                                     </label>
                                                 </div>

                                                 {/* Options for Select */}
                                                 {field.type === 'select' && (
                                                     <div className="mt-3 bg-slate-900 p-3 rounded">
                                                         <label className="text-xs text-slate-500 block mb-1">אפשרויות (מופרדות בפסיק)</label>
                                                         <input 
                                                            className="w-full bg-transparent border-b border-slate-800 text-sm text-white" 
                                                            value={field.options?.join(',') || ''} 
                                                            onChange={e => updateFormField(idx, { options: e.target.value.split(',') })}
                                                         />
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                         {editingForm.fields.length === 0 && (
                                             <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                                                 אין שדות בטופס. הוסף שדות מהתפריט הצדדי.
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             </div>

                             <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900">
                                 <Button variant="outline" onClick={() => setEditingForm(null)}>ביטול</Button>
                                 <Button onClick={handleSaveForm}>שמור טופס</Button>
                             </div>
                         </div>
                     </div>
                 )}
            </div>
        )}

        {/* --- TEAM TAB --- */}
        {activeTab === 'team' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800">
                     <div>
                         <h3 className="text-xl font-bold text-white">חברי הצוות</h3>
                         <p className="text-slate-400 text-sm">ניהול עורכי הדין והצוות המקצועי</p>
                     </div>
                     <Button onClick={() => setEditingMember({
                         id: Date.now().toString(),
                         fullName: '', role: '', specialization: '', email: '', phone: '', bio: '', imageUrl: 'https://picsum.photos/400/400'
                     })}><Plus size={18} className="ml-2"/> הוסף איש צוות</Button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {state.teamMembers.map(member => (
                         <div key={member.id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group hover:border-[#2EB0D9] transition-all">
                             <div className="h-64 overflow-hidden relative">
                                 <img src={member.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={member.fullName}/>
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                                     <h4 className="text-white font-bold text-lg">{member.fullName}</h4>
                                     <p className="text-[#2EB0D9] text-sm">{member.role}</p>
                                 </div>
                             </div>
                             <div className="p-4 flex justify-between items-center bg-slate-950">
                                 <span className="text-xs text-slate-500 truncate max-w-[120px]">{member.email}</span>
                                 <div className="flex gap-2">
                                     <button onClick={() => setEditingMember(member)} className="text-slate-400 hover:text-white"><Edit size={16}/></button>
                                     <button onClick={() => updateState({ teamMembers: state.teamMembers.filter(m => m.id !== member.id) })} className="text-slate-400 hover:text-red-400"><Trash size={16}/></button>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>

                 {/* Edit Team Member Modal */}
                 {editingMember && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-900 rounded-xl w-full max-w-2xl p-6 border border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">עריכת איש צוות</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">שם מלא</label>
                                    <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingMember.fullName} onChange={e => setEditingMember({...editingMember, fullName: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">תפקיד</label>
                                    <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">התמחות</label>
                                    <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingMember.specialization} onChange={e => setEditingMember({...editingMember, specialization: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">אימייל</label>
                                    <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingMember.email} onChange={e => setEditingMember({...editingMember, email: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">טלפון</label>
                                    <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingMember.phone} onChange={e => setEditingMember({...editingMember, phone: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">תמונה (URL)</label>
                                    <input className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white" value={editingMember.imageUrl} onChange={e => setEditingMember({...editingMember, imageUrl: e.target.value})}/>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm text-slate-400 mb-1">אודות (Bio)</label>
                                    <textarea className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white h-24" value={editingMember.bio} onChange={e => setEditingMember({...editingMember, bio: e.target.value})}/>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="outline" onClick={() => setEditingMember(null)}>ביטול</Button>
                                <Button onClick={handleSaveMember}>שמור</Button>
                            </div>
                        </div>
                     </div>
                 )}
            </div>
        )}
        
        {/* --- Integrations Tab (NEW) --- */}
        {activeTab === 'integrations' && (
            <div className="max-w-4xl space-y-8 animate-fade-in-up">
                
                {/* 1. AI Generator */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-[#2EB0D9]/5">
                        <div className="p-2 bg-[#2EB0D9]/20 rounded-lg text-[#2EB0D9]"><Sparkles size={24}/></div>
                        <div>
                            <h3 className="text-xl font-bold text-white">AI Generator (Gemini)</h3>
                            <p className="text-slate-400 text-sm">הגדרות ליצירת מאמרים אוטומטית באמצעות בינה מלאכותית</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Gemini API Key</label>
                            <input 
                                type="password" 
                                className="w-full p-3 border border-slate-700 rounded bg-slate-800 text-white font-mono placeholder-slate-600"
                                placeholder="AIzaSy..."
                                value={state.config.integrations.geminiApiKey}
                                onChange={(e) => updateIntegration('geminiApiKey', e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                נדרש כדי להשתמש במחולל המאמרים. 
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[#2EB0D9] hover:underline mx-1">לחץ כאן לקבלת מפתח בחינם</a> 
                                מ-Google AI Studio.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Google Sheets Database & Email */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-green-500/5">
                         <div className="p-2 bg-green-500/20 rounded-lg text-green-500"><Database size={24}/></div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Google Sheets & Email Automation</h3>
                            <p className="text-slate-400 text-sm">שמירת נתונים בגיליון + שליחת אימיילים (ללא צורך בשירות חיצוני!)</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Google Apps Script Web App URL</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-700 rounded bg-slate-800 text-white font-mono placeholder-slate-600"
                                placeholder="https://script.google.com/macros/s/..."
                                value={state.config.integrations.googleSheetsUrl}
                                onChange={(e) => updateIntegration('googleSheetsUrl', e.target.value)}
                            />
                        </div>
                        
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                             <button 
                                onClick={() => setShowScript(!showScript)}
                                className="flex items-center gap-2 text-[#2EB0D9] font-bold text-sm hover:underline"
                             >
                                 <Code size={16}/> {showScript ? 'הסתר סקריפט להתקנה' : 'הצג סקריפט משודרג להתקנה (כולל אימייל)'}
                             </button>

                             {showScript && (
                                 <div className="mt-4 animate-fade-in">
                                     <p className="text-green-400 text-sm font-bold mb-2">חדש! הסקריפט הזה גם שומר את הנתונים בשיטס וגם שולח לך אימייל התראה.</p>
                                     <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2 mb-4">
                                         <li>פתח גיליון גוגל שיטס חדש.</li>
                                         <li>לך ל-Extensions (תוספים) &gt; Apps Script.</li>
                                         <li>הדבק את הקוד הבא (ושנה את האימייל בשורה הראשונה לכתובת שלך!):</li>
                                     </ol>
                                     <div className="relative">
                                         <pre className="bg-slate-900 p-4 rounded border border-slate-800 text-xs font-mono text-green-400 overflow-x-auto select-all" dir="ltr">
                                             {GOOGLE_SCRIPT_TEMPLATE}
                                         </pre>
                                         <button 
                                            onClick={() => { navigator.clipboard.writeText(GOOGLE_SCRIPT_TEMPLATE); alert('הקוד הועתק ללוח!'); }}
                                            className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded hover:bg-slate-700 border border-slate-600"
                                            title="העתק קוד"
                                         >
                                             <Copy size={14}/>
                                         </button>
                                     </div>
                                     <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2 mt-4" start={4}>
                                         <li>לחץ על <strong>Deploy</strong> &gt; <strong>New Deployment</strong>.</li>
                                         <li>בחר <strong>Web App</strong>.</li>
                                         <li>בשדה <strong>Who has access</strong> בחר: <strong>Anyone</strong>.</li>
                                         <li>העתק את ה-URL והדבק למעלה.</li>
                                     </ol>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* 3. Payment Links */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-purple-500/5">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500"><CreditCard size={24}/></div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Stripe Payment Links</h3>
                            <p className="text-slate-400 text-sm">קישורים לתשלום עבור מוצרים בחנות המשפטית</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">קישור לתשלום - חבילת צוואה</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-700 rounded bg-slate-800 text-white font-mono"
                                placeholder="https://buy.stripe.com/..."
                                value={state.config.integrations.stripeWillsLink}
                                onChange={(e) => updateIntegration('stripeWillsLink', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">קישור לתשלום - בדיקת חוזה</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-700 rounded bg-slate-800 text-white font-mono"
                                value={state.config.integrations.stripeRealEstateLink}
                                onChange={(e) => updateIntegration('stripeRealEstateLink', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">קישור לתשלום - פגישת ייעוץ</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-700 rounded bg-slate-800 text-white font-mono"
                                value={state.config.integrations.stripeConsultationLink}
                                onChange={(e) => updateIntegration('stripeConsultationLink', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

            </div>
        )}

        {/* --- Config Tab --- */}
        {activeTab === 'config' && (
             <div className="space-y-6">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-2xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Monitor/> הגדרות כלליות לאתר</h3>
                    
                    <div className="space-y-6">
                        
                        {/* --- Password Config --- */}
                        <div className="border-b border-slate-800 pb-6 mb-6">
                            <h4 className="font-bold text-lg mb-4 text-[#2EB0D9] flex items-center gap-2"><Key size={18}/> גישה למערכת הניהול</h4>
                            <label className="block text-sm font-bold mb-2 text-slate-400">סיסמת מנהל (לכניסה לממשק זה)</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white font-mono"
                                value={state.config.adminPassword || 'admin'}
                                onChange={e => updateState({ config: { ...state.config, adminPassword: e.target.value }})}
                            />
                            <p className="text-xs text-slate-500 mt-2">סיסמה זו נשמרת מקומית בלבד. וודא שאתה זוכר אותה.</p>
                        </div>


                         {/* --- THEME SELECTOR --- */}
                        <div className="border-b border-slate-800 pb-6 mb-6">
                            <label className="block text-sm font-bold mb-3 text-slate-400">ערכת נושא (עיצוב)</label>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => updateState({ config: { ...state.config, theme: 'dark' }})}
                                    className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${state.config.theme === 'dark' ? 'border-[#2EB0D9] bg-slate-800' : 'border-slate-700 hover:bg-slate-800'}`}
                                >
                                    <Moon size={24} className={state.config.theme === 'dark' ? 'text-[#2EB0D9]' : 'text-slate-400'} />
                                    <span className={state.config.theme === 'dark' ? 'text-white font-bold' : 'text-slate-400'}>עיצוב כהה (ברירת מחדל)</span>
                                </button>
                                <button 
                                    onClick={() => updateState({ config: { ...state.config, theme: 'light' }})}
                                    className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${state.config.theme === 'light' ? 'border-[#2EB0D9] bg-white text-slate-900' : 'border-slate-700 hover:bg-slate-800'}`}
                                >
                                    <Sun size={24} className={state.config.theme === 'light' ? 'text-orange-500' : 'text-slate-400'} />
                                    <span className={state.config.theme === 'light' ? 'text-slate-900 font-bold' : 'text-slate-400'}>עיצוב בהיר</span>
                                </button>
                            </div>
                        </div>

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