import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { Settings, Layout, FileText, Plus, Save, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, CheckSquare, List, Link as LinkIcon, Copy, Users, Image as ImageIcon, Check, HelpCircle, Monitor, Sun, Moon, Database, Key, CreditCard, Mail, Code } from 'lucide-react';

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
    
    // 3. אופציונלי: שליחת אימייל אישור ללקוח (אם יש שדה אימייל בטופס)
    /*
    if (data.email || data.contactEmail) {
         MailApp.sendEmail({
            to: data.email || data.contactEmail,
            subject: "תודה על פנייתך",
            body: "קיבלנו את פרטיך וניצור קשר בהקדם."
        });
    }
    */

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

  // Helper to update integration config
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