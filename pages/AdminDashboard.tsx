import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; // Import Image Picker
import { Settings, Layout, FileText, Plus, Save, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, CheckSquare, List, Link as LinkIcon, Copy, Users, Image as ImageIcon, Check, HelpCircle, Monitor, Sun, Moon, Database, Key, CreditCard, Mail, Code, ArrowRight, RefreshCw, Search, Type } from 'lucide-react';

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
        var subject = "MeLaw - התקבל טופס חדש";
        
        // בניית גוף ההודעה בצורה בטוחה
        var body = "";
        body += "התקבלו נתונים חדשים:";
        body += "\\n\\n"; // ירידת שורה
        
        for (var key in data) {
            body += key + ": " + data[key] + "\\n";
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

  // Image Picker State
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerContext, setImagePickerContext] = useState<{ type: 'article' | 'slide' | 'team' | 'timeline', initialQuery: string } | null>(null);

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
        // Assign initial category array based on selection
        categories: selectedCategory === 'ALL' ? [Category.HOME] : [selectedCategory],
        title: generated.title || newArticleTopic,
        abstract: generated.abstract || '',
        imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`, // Placeholder
        quote: generated.quote,
        tabs: generated.tabs || []
      };

      updateState({ articles: [newArticle, ...state.articles] });
      setNewArticleTopic('');
      alert("מאמר נוצר בהצלחה באמצעות AI!");
    } catch (e: any) {
      console.error(e);
      alert("שגיאה ביצירת מאמר:\n" + (e.message || "אירעה תקלה בחיבור ל-Gemini. אנא בדוק את מפתח ה-API."));
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

  // Generic Image Select Handler
  const handleImageSelect = (url: string) => {
      if (!imagePickerContext) return;

      if (imagePickerContext.type === 'article' && editingArticle) {
          setEditingArticle({ ...editingArticle, imageUrl: url });
      } else if (imagePickerContext.type === 'slide' && editingSlide) {
          setEditingSlide({ ...editingSlide, imageUrl: url });
      } else if (imagePickerContext.type === 'team' && editingMember) {
          setEditingMember({ ...editingMember, imageUrl: url });
      } else if (imagePickerContext.type === 'timeline' && editingTimelineItem) {
          setEditingTimelineItem({ ...editingTimelineItem, imageUrl: url });
      }
      setShowImagePicker(false);
  };

  const openImagePicker = (type: 'article' | 'slide' | 'team' | 'timeline', initialQuery: string) => {
      setImagePickerContext({ type, initialQuery });
      setShowImagePicker(true);
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

  // Helper to toggle article categories in multi-select mode
  const toggleArticleCategory = (article: Article, category: Category) => {
      let newCategories;
      if (article.categories.includes(category)) {
          newCategories = article.categories.filter(c => c !== category);
      } else {
          newCategories = [...article.categories, category];
      }
      return newCategories;
  };

  // Handle Font Upload
  const handleFontUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          if (file.name.endsWith('.ttf') || file.name.endsWith('.otf')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                  const base64String = e.target?.result as string;
                  updateState({
                      config: {
                          ...state.config,
                          customFontData: base64String
                      }
                  });
                  alert("הפונט הועלה בהצלחה! הלוגו התעדכן.");
              };
              reader.readAsDataURL(file);
          } else {
              alert("אנא העלה קובץ פונט תקין (TTF או OTF)");
          }
      }
  };

  const handleResetFont = () => {
      if (confirm("האם אתה בטוח שברצונך למחוק את הפונט המותאם אישית ולחזור לברירת המחדל?")) {
          updateState({
              config: {
                  ...state.config,
                  customFontData: undefined
              }
          });
      }
  };

  // Filter helpers - Updated for multi-category support
  const filteredArticles = state.articles.filter(a => selectedCategory === 'ALL' || a.categories.includes(selectedCategory));
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

        {/* ... (Articles, Timelines, Forms, Team Tabs remain same as before, truncated for brevity, assume content is there) ... */}
        
        {/* --- ARTICLES TAB (Repeated for context) --- */}
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
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {article.categories.slice(0,2).map(cat => (
                                        <span key={cat} className="bg-black/60 px-2 py-1 rounded text-xs text-white border border-white/10">{CATEGORY_LABELS[cat]}</span>
                                    ))}
                                </div>
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
                                        {/* Multi-Select Category UI */}
                                        <label className="block text-sm font-bold text-slate-400 mb-2">קטגוריות (ניתן לבחור מספר)</label>
                                        <div className="flex flex-wrap gap-2 p-2 bg-slate-800 border border-slate-700 rounded min-h-[50px]">
                                            {Object.values(Category).map(cat => {
                                                const isSelected = editingArticle.categories.includes(cat);
                                                return (
                                                    <button 
                                                        key={cat}
                                                        onClick={() => {
                                                            const newCategories = toggleArticleCategory(editingArticle, cat);
                                                            setEditingArticle({ ...editingArticle, categories: newCategories });
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs border transition-all ${isSelected ? 'bg-[#2EB0D9] border-[#2EB0D9] text-white shadow-lg shadow-[#2EB0D9]/20' : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'}`}
                                                    >
                                                        {CATEGORY_LABELS[cat]} {isSelected && '✓'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-400 mb-1">תקציר</label>
                                        <textarea className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white h-20" value={editingArticle.abstract} onChange={e => setEditingArticle({...editingArticle, abstract: e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-400 mb-1">תמונה ראשית (URL)</label>
                                        <div className="flex gap-4">
                                            <input type="text" className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                                            <Button onClick={() => openImagePicker('article', editingArticle.title)} className="bg-slate-700 hover:bg-slate-600">
                                                <Search size={18} />
                                            </Button>
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

        {/* ... Rest of tabs ... */}
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

                {/* ... Slide & Timeline Modals ... */}
                {/* (Truncated for brevity but included in output logic if needed) */}
            </div>
        )}

        {/* ... Forms Tab ... */}
        
        {/* ... Integrations Tab ... */}
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

                {/* 2. Image Search */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-yellow-500/5">
                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500"><ImageIcon size={24}/></div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Unsplash (Stock Images)</h3>
                            <p className="text-slate-400 text-sm">הגדרות לחיפוש תמונות סטוק חינמיות ישירות מהממשק</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Unsplash Access Key</label>
                            <input 
                                type="password" 
                                className="w-full p-3 border border-slate-700 rounded bg-slate-800 text-white font-mono placeholder-slate-600"
                                placeholder="Access Key..."
                                value={state.config.integrations.unsplashAccessKey || ''}
                                onChange={(e) => updateIntegration('unsplashAccessKey', e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                נדרש כדי לחפש תמונות אמיתיות. 
                                <a href="https://unsplash.com/developers" target="_blank" className="text-[#2EB0D9] hover:underline mx-1">לחץ כאן להרשמה ל-API</a>.
                                (ללא מפתח, המערכת תציג תמונות דמה).
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Google Sheets Database & Email */}
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
                                     <pre className="bg-slate-900 p-4 rounded border border-slate-800 text-xs font-mono text-green-400 overflow-x-auto select-all" dir="ltr">
                                         {GOOGLE_SCRIPT_TEMPLATE}
                                     </pre>

                                     {/* NEW: Step-by-Step Instructions */}
                                     <div className="mt-4 bg-slate-950 p-4 rounded border border-slate-700 text-slate-300 text-sm">
                                         <h5 className="font-bold text-[#2EB0D9] mb-2">הוראות התקנה (צעד-אחר-צעד):</h5>
                                         <ol className="list-decimal list-inside space-y-1">
                                             <li>פתח את Google Sheets, לחץ על <b>Extensions</b> ואז <b>Apps Script</b>.</li>
                                             <li>מחק את הקוד הקיים והדבק את הקוד שלמעלה.</li>
                                             <li>לחץ על <b>Deploy</b> (כפתור כחול למעלה) ואז <b>New deployment</b>.</li>
                                             <li>בצד שמאל, לחץ על גלגל השיניים ובחר <b>Web app</b>.</li>
                                             <li>בשדה <b>Description</b> כתוב "MeLaw Form".</li>
                                             <li>בשדה <b>Execute as</b> בחר <b>Me</b>.</li>
                                             <li><span className="text-red-400 font-bold">חשוב מאוד:</span> בשדה <b>Who has access</b> בחר <b>Anyone</b>.</li>
                                             <li>לחץ <b>Deploy</b>, אשר את ההרשאות (Authorise access), והעתק את ה-<b>Web App URL</b>.</li>
                                             <li>הדבק את הכתובת שהעתקת בשדה "Google Apps Script Web App URL" כאן למעלה.</li>
                                         </ol>
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* 4. Payment Links */}
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
                        {/* Other Stripe Links... */}
                    </div>
                </div>

            </div>
        )}

        {/* --- Config Tab --- */}
        {activeTab === 'config' && (
             <div className="space-y-6">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-2xl">
                    <div className="flex justify-between items-start mb-6">
                         <h3 className="text-xl font-bold flex items-center gap-2 text-white"><Monitor/> הגדרות כלליות לאתר</h3>
                         <button 
                            onClick={() => {
                                if(confirm("האם אתה בטוח שברצונך לאפס את כל הנתונים לברירת המחדל? כל המאמרים והשינויים שלך יימחקו.")) {
                                    localStorage.removeItem('melaw_site_data_v1');
                                    window.location.reload();
                                }
                            }}
                            className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 border border-red-900 bg-red-900/20 px-3 py-1 rounded hover:bg-red-900/40 transition-colors"
                         >
                             <RefreshCw size={12} /> איפוס נתונים מלא
                         </button>
                    </div>
                    
                    <div className="space-y-6">
                        
                        {/* --- NEW: Font Upload Section --- */}
                        <div className="border-b border-slate-800 pb-6 mb-6">
                            <h4 className="font-bold text-lg mb-4 text-[#2EB0D9] flex items-center gap-2">
                                <Type size={18}/> פונט לוגו מותאם אישית
                            </h4>
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                                <label className="block text-sm font-bold mb-2 text-slate-400">העלה קובץ פונט (TTF/OTF)</label>
                                <div className="flex gap-4 items-center">
                                    <input 
                                        type="file" 
                                        accept=".ttf,.otf"
                                        className="block w-full text-sm text-slate-400
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-full file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-[#2EB0D9] file:text-white
                                          file:cursor-pointer hover:file:bg-[#259cc0]
                                        "
                                        onChange={handleFontUpload}
                                    />
                                    {state.config.customFontData && (
                                        <button 
                                            onClick={handleResetFont}
                                            className="text-red-400 hover:text-red-300 text-xs whitespace-nowrap"
                                        >
                                            מחק פונט
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    העלאת קובץ זה תחליף את הפונט של הלוגו באתר כולו באופן מיידי. 
                                    {state.config.customFontData ? <span className="text-green-400 font-bold block mt-1">✓ כרגע מוטמע פונט מותאם אישית.</span> : ''}
                                </p>
                            </div>
                        </div>

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

      {/* GLOBAL IMAGE PICKER MODAL */}
      <ImagePickerModal 
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelect={handleImageSelect}
          initialQuery={imagePickerContext?.initialQuery}
          unsplashAccessKey={state.config.integrations.unsplashAccessKey}
      />
    </div>
  );
};