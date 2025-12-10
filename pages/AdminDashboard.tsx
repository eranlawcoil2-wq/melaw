import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; 
import { ImageUploadButton } from '../components/ImageUploadButton.tsx'; 
import { emailService, cloudService } from '../services/api.ts'; 
import { dbService } from '../services/supabase.ts';
import { Settings, Layout, FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Link as LinkIcon, Copy, Users, Check, Monitor, Sun, Moon, Database, Type, Menu, Download, Upload, AlertTriangle, CloudUpload, CloudOff, Search, Save, Cloud, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
  version?: string;
}

// --- UPDATED GOOGLE SCRIPT FOR FORMS & PDF WORKFLOW ---
const GOOGLE_SCRIPT_TEMPLATE = `
// --- MeLaw Backend Script ---
// הדבק את כל הקוד הזה ב-Google Apps Script
// וודא שביצעת Deploy כ-Web App עם הרשאות "Anyone"

function doGet(e) {
  return ContentService.createTextOutput("MeLaw Server Active");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); 

  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var action = data.action;

    // --- טיפול בשליחת טפסים (צוואות/צור קשר) ---
    // הנתונים יישמרו בגיליון בשם "DATA" כדי לאפשר יצירת PDF
    if (action == 'submitForm') {
       var doc = SpreadsheetApp.getActiveSpreadsheet();
       // מחפש גיליון DATA, אם אין - יוצר חדש
       var sheet = doc.getSheetByName("DATA");
       if (!sheet) sheet = doc.insertSheet("DATA");

       // כותרות (Headers)
       var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
       var isNewSheet = sheet.getLastColumn() === 0 || (headers.length === 1 && headers[0] === "");
       
       if (isNewSheet) {
         headers = ["Timestamp", "FormName"];
         // הוסף את כל המפתחות מהאובייקט ככותרות
         for (var key in data) {
           if (key !== "action" && key !== "formName" && key !== "submittedAt") headers.push(key);
         }
         sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
       }

       // יצירת השורה החדשה
       var newRow = [];
       var timestamp = new Date();
       
       for (var i = 0; i < headers.length; i++) {
         var header = headers[i];
         if (header === "Timestamp") newRow.push(timestamp);
         else if (header === "FormName") newRow.push(data.formName || "General");
         else {
           var val = data[header];
           // המרת מערכים (כמו שמות ילדים) למחרוזת
           newRow.push(typeof val === 'object' ? JSON.stringify(val) : (val || ""));
         }
       }
       
       sheet.appendRow(newRow);
       return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- תמיכה לאחור: העלאת תמונות (אם לא משתמשים ב-Supabase) ---
    if (action == 'uploadImage') {
       var folderName = "MeLaw_Images";
       var folders = DriveApp.getFoldersByName(folderName);
       var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
       folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       var decoded = Utilities.base64Decode(data.data.imageData);
       var blob = Utilities.newBlob(decoded, data.data.mimeType, data.data.fileName);
       var file = folder.createFile(blob);
       file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       return ContentService.createTextOutput(JSON.stringify({ "status": "success", "url": "https://lh3.googleusercontent.com/d/" + file.getId() })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- תמיכה לאחור: שמירת הגדרות אתר ---
    if (action == 'saveState') {
       var sheet = getOrCreateSheet("SiteData");
       var jsonString = JSON.stringify({ status: 'success', timestamp: new Date(), data: data.data });
       sheet.appendRow([jsonString]);
       return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Unknown action" })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet(name) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(name);
  if (!sheet) sheet = doc.insertSheet(name);
  return sheet;
}
`;

// --- SUPABASE SETUP INSTRUCTIONS ---
const SUPABASE_SQL_INSTRUCTIONS = `
-- צעד 1: צור טבלה להגדרות
create table site_config (
  id bigint primary key generated always as identity,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- צעד 2: צור רשומה ראשונית ריקה
insert into site_config (data) values ('{}');

-- צעד 3: אפשר גישה לכולם
alter table site_config enable row level security;
create policy "Enable access to all users" on site_config for all using (true) with check (true);
`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout, version }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'integrations' | 'articles' | 'timelines' | 'forms' | 'team'>('articles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isSavingToCloud, setIsSavingToCloud] = useState(false); 
  const [timelineSubTab, setTimelineSubTab] = useState<'slider' | 'cards'>('slider');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerContext, setImagePickerContext] = useState<{ type: 'article' | 'slide' | 'team' | 'timeline', initialQuery: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newArticleTopic, setNewArticleTopic] = useState('');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingSlide, setEditingSlide] = useState<SliderSlide | null>(null);
  const [editingTimelineItem, setEditingTimelineItem] = useState<TimelineItem | null>(null);
  
  // Instruction Toggles
  const [showSupabaseHelp, setShowSupabaseHelp] = useState(false);
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);

  const isSupabaseConfigured = state.config.integrations.supabaseUrl && state.config.integrations.supabaseKey;
  const isGoogleSheetsConfigured = state.config.integrations.googleSheetsUrl && state.config.integrations.googleSheetsUrl.includes("script.google.com");
  const isCloudConnected = isSupabaseConfigured || isGoogleSheetsConfigured;

  // Supabase Config Object for Upload Button
  const supabaseConfig = { url: state.config.integrations.supabaseUrl, key: state.config.integrations.supabaseKey };

  const handleSaveToCloud = async () => {
      if (!isCloudConnected) {
          alert("שגיאה: לא הוגדר חיבור.\nאנא עבור ללשונית 'חיבורים' והגדר את החיבור.");
          setActiveTab('integrations');
          return;
      }
      setIsSavingToCloud(true);
      try {
          if (isSupabaseConfigured) {
              const success = await dbService.saveState(state.config.integrations.supabaseUrl, state.config.integrations.supabaseKey, state);
              alert(success ? "נשמר בהצלחה ב-Supabase!" : "שגיאה בשמירה ל-Supabase.");
          } else if (isGoogleSheetsConfigured) {
              const success = await cloudService.saveStateToCloud(state.config.integrations.googleSheetsUrl, state);
              alert(success ? "נשמר בהצלחה בגוגל!" : "שגיאה בשמירה לגוגל.");
          }
      } catch (e) { alert("שגיאת תקשורת."); } finally { setIsSavingToCloud(false); }
  };

  // --- Handlers ---
  const handleExportData = () => { const dataStr = JSON.stringify(state); const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', 'melaw_data.json'); linkElement.click(); };
  const handleImportData = (e: any) => { const file = e.target.files?.[0]; if(!file)return; const reader = new FileReader(); reader.onload = (ev) => { try { const p = JSON.parse(ev.target?.result as string); updateState({...p, isAdminLoggedIn:true}); alert("נטען!"); } catch { alert("שגיאה"); }}; reader.readAsText(file); };
  const handleGenerateArticle = async () => { if (!newArticleTopic) return; setIsGenerating(true); try { const generated = await generateArticleContent(newArticleTopic, selectedCategory, state.config.integrations.geminiApiKey); const newArticle: Article = { id: Date.now().toString(), categories: selectedCategory === 'ALL' ? [Category.HOME] : [selectedCategory], title: generated.title || newArticleTopic, abstract: generated.abstract || '', imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`, quote: generated.quote, tabs: generated.tabs || [] }; updateState({ articles: [newArticle, ...state.articles] }); setNewArticleTopic(''); alert("נוצר!"); } catch (e: any) { alert("שגיאה: " + e.message); } finally { setIsGenerating(false); } };
  const handleUpdateArticle = () => { if(editingArticle) { updateState({ articles: state.articles.map(a => a.id === editingArticle.id ? editingArticle : a) }); setEditingArticle(null); }};
  const handleImageSelect = (url: string) => {
      if (!imagePickerContext) return;
      if (imagePickerContext.type === 'article' && editingArticle) setEditingArticle({ ...editingArticle, imageUrl: url });
      else if (imagePickerContext.type === 'slide' && editingSlide) setEditingSlide({ ...editingSlide, imageUrl: url });
      else if (imagePickerContext.type === 'team' && editingMember) setEditingMember({ ...editingMember, imageUrl: url });
      else if (imagePickerContext.type === 'timeline' && editingTimelineItem) setEditingTimelineItem({ ...editingTimelineItem, imageUrl: url });
      setShowImagePicker(false);
  };
  const openImagePicker = (type: any, initialQuery: string) => { setImagePickerContext({ type, initialQuery }); setShowImagePicker(true); };
  const handleSaveForm = () => { if(editingForm && editingForm.title) { const exists = state.forms.find(f => f.id === editingForm.id); updateState({ forms: exists ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] }); setEditingForm(null); }};
  const addFieldToForm = (type: FieldType) => { if(editingForm) setEditingForm({ ...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type, label: 'שדה חדש', required: false, options: type === 'select' ? ['אפשרות 1'] : undefined }] }); };
  const updateFormField = (index: number, updates: Partial<FormField>) => { if(editingForm) { const f = [...editingForm.fields]; f[index] = { ...f[index], ...updates }; setEditingForm({ ...editingForm, fields: f }); }};
  const removeFormField = (index: number) => { if(editingForm) setEditingForm({ ...editingForm, fields: editingForm.fields.filter((_, i) => i !== index) }); };
  const handleSaveMember = () => { if(editingMember) { const exists = state.teamMembers.find(m => m.id === editingMember.id); updateState({ teamMembers: exists ? state.teamMembers.map(m => m.id === editingMember.id ? editingMember : m) : [...state.teamMembers, editingMember] }); setEditingMember(null); }};
  const handleSaveSlide = () => { if(editingSlide) { const exists = state.slides.find(s => s.id === editingSlide.id); updateState({ slides: exists ? state.slides.map(s => s.id === editingSlide.id ? editingSlide : s) : [...state.slides, editingSlide] }); setEditingSlide(null); }};
  const handleSaveTimelineItem = () => { if(editingTimelineItem) { const exists = state.timelines.find(t => t.id === editingTimelineItem.id); updateState({ timelines: exists ? state.timelines.map(t => t.id === editingTimelineItem.id ? editingTimelineItem : t) : [...state.timelines, editingTimelineItem] }); setEditingTimelineItem(null); }};
  const updateIntegration = (key: keyof typeof state.config.integrations, value: string) => { updateState({ config: { ...state.config, integrations: { ...state.config.integrations, [key]: value } } }); };
  const handleFontUpload = (e: any) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => updateState({ config: { ...state.config, customFontData: ev.target?.result as string }}); r.readAsDataURL(f); }};
  const handleResetFont = () => updateState({ config: { ...state.config, customFontData: undefined }});

  const filteredArticles = state.articles.filter(a => selectedCategory === 'ALL' || a.categories.includes(selectedCategory));
  const filteredTimelines = state.timelines.filter(t => selectedCategory === 'ALL' || t.category.includes(selectedCategory));

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 overflow-hidden relative">
      {/* Sidebar ... (Same as before) */}
      <aside className={`fixed h-full right-0 z-50 w-64 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div><h2 className="text-2xl font-bold text-white"><span className="text-[#2EB0D9]">Me</span>Law Admin</h2>{version && <span className="text-[10px] text-slate-500 font-mono bg-black/30 px-1 rounded">{version}</span>}</div>
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}><X/></button>
        </div>
        <div className="p-4 border-b border-slate-800">
             <div className="text-center mb-2">
                 {isCloudConnected ? <span className="text-xs text-green-500 flex items-center justify-center gap-1 font-bold"><CloudUpload size={12}/> מחובר לענן</span> : <span className="text-xs text-red-500 flex items-center justify-center gap-1 font-bold animate-pulse"><CloudOff size={12}/> ענן לא מחובר</span>}
             </div>
             <Button onClick={handleSaveToCloud} className={`w-full flex items-center justify-center gap-2 font-bold shine-effect ${isSavingToCloud ? 'opacity-70 cursor-wait' : ''}`} variant={isCloudConnected ? "secondary" : "outline"} disabled={isSavingToCloud}>
                 {isSavingToCloud ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} {isSavingToCloud ? 'שומר...' : 'שמור לענן'}
             </Button>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <button onClick={() => { setActiveTab('articles'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'articles' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><FileText size={20} /> מאמרים</button>
          <button onClick={() => { setActiveTab('timelines'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'timelines' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Layout size={20} /> טיים-ליין</button>
          <button onClick={() => { setActiveTab('forms'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><ClipboardList size={20} /> טפסים</button>
          <button onClick={() => { setActiveTab('team'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'team' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Users size={20} /> צוות</button>
          <div className="border-t border-slate-800 my-2"></div>
          <button onClick={() => { setActiveTab('integrations'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><LinkIcon size={20} /> חיבורים</button>
          <button onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Monitor size={20} /> הגדרות</button>
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={onLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors p-2"><LogOut size={18}/> יציאה</button></div>
      </aside>

      <main className="flex-1 md:mr-64 p-4 md:p-8 overflow-y-auto min-h-screen">
        <div className="md:hidden flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800 sticky top-0 z-30 shadow-lg"><h3 className="font-bold text-white">תפריט ניהול</h3><button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-slate-800 rounded text-[#2EB0D9] border border-slate-700"><Menu size={24} /></button></div>

        {/* --- INTEGRATIONS TAB --- */}
        {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-4xl animate-fade-in">
                {/* SUPABASE */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#2EB0D9]"></div>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Database className="text-[#2EB0D9]"/> Supabase (מומלץ)</h3>
                        <button onClick={() => setShowSupabaseHelp(!showSupabaseHelp)} className="text-xs flex items-center gap-1 text-[#2EB0D9] hover:underline bg-slate-950 p-2 rounded border border-slate-700">
                             {showSupabaseHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} 
                             {showSupabaseHelp ? 'הסתר הוראות' : 'הצג הוראות התקנה'}
                        </button>
                    </div>
                    
                    {showSupabaseHelp && (
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-300 text-sm mb-4 space-y-4">
                            <div>
                                <strong className="text-white block mb-1">שלב 1: פתיחת פרויקט</strong>
                                1. היכנס לאתר <a href="https://supabase.com" target="_blank" className="text-[#2EB0D9] underline">supabase.com</a> וצור פרויקט חדש.<br/>
                                2. לאחר שהפרויקט מוכן, לך ל-Settings (גלגל שיניים למטה) -> API.<br/>
                                3. העתק את ה-URL ואת ה-<code>anon</code> key והדבק אותם בשדות למטה.
                            </div>
                            <div>
                                <strong className="text-white block mb-1">שלב 2: יצירת מסד נתונים (SQL)</strong>
                                1. בחר ב-SQL Editor בתפריט השמאלי.<br/>
                                2. הדבק את הקוד הבא ולחץ Run:
                                <pre className="bg-black p-2 rounded text-xs text-green-400 mt-1 select-all font-mono whitespace-pre-wrap">{SUPABASE_SQL_INSTRUCTIONS}</pre>
                            </div>
                            <div>
                                <strong className="text-white block mb-1">שלב 3: הגדרת אחסון תמונות (Storage)</strong>
                                1. בחר ב-Storage (אייקון דלי/תיקיה) בתפריט השמאלי.<br/>
                                2. לחץ על <b>New Bucket</b>.<br/>
                                3. שם ה-Bucket חייב להיות: <code>images</code> (באותיות קטנות).<br/>
                                4. <b>חשוב מאוד:</b> סמן את המתג <b>Public Bucket</b>.<br/>
                                5. לחץ Save.
                            </div>
                        </div>
                    )}

                    <p className="text-slate-400 mb-4 text-sm">מאפשר עדכון האתר בזמן אמת והעלאת תמונות.</p>
                    <div className="space-y-4 bg-slate-950 p-4 rounded border border-slate-800">
                        <div><label className="block text-xs font-bold text-slate-300 mb-1">Project URL</label><input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white focus:border-[#2EB0D9] outline-none" value={state.config.integrations.supabaseUrl} onChange={e => updateIntegration('supabaseUrl', e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-300 mb-1">API Key (anon / public)</label><input type="password" className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white focus:border-[#2EB0D9] outline-none" value={state.config.integrations.supabaseKey} onChange={e => updateIntegration('supabaseKey', e.target.value)} /></div>
                    </div>
                </div>

                {/* GOOGLE LEGACY + SCRIPT DISPLAY */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 opacity-90">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Cloud/> Google Script (עבור טפסים ו-PDF)</h3>
                        <button onClick={() => setShowGoogleHelp(!showGoogleHelp)} className="text-xs flex items-center gap-1 text-[#2EB0D9] hover:underline bg-slate-950 p-2 rounded border border-slate-700">
                             {showGoogleHelp ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} 
                             {showGoogleHelp ? 'הסתר הוראות' : 'הצג הוראות התקנה'}
                        </button>
                    </div>

                    {showGoogleHelp && (
                         <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-300 text-sm mb-4 space-y-4">
                            <div>
                                1. פתח גיליון Google Sheet חדש.<br/>
                                2. בתפריט העליון, בחר <b>Extensions</b> -> <b>Apps Script</b>.<br/>
                                3. מחק את כל הקוד שיש שם, והדבק את הקוד שמופיע בתיבה השחורה למטה.<br/>
                                4. לחץ על כפתור <b>Deploy</b> (כחול למעלה) -> <b>New deployment</b>.<br/>
                                5. בחר סוג: <b>Web App</b>.<br/>
                                6. <b>חשוב מאוד:</b> בשדה <i>Who has access</i> בחר <b>Anyone</b>.<br/>
                                7. לחץ Deploy, אשר הרשאות, והעתק את ה-URL שקיבלת (Web App URL).<br/>
                                8. הדבק את ה-URL בשדה למטה.
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 bg-slate-950 p-4 rounded border border-slate-800 mb-4">
                        <label className="block text-sm font-bold text-slate-300">Web App URL</label>
                        <input type="text" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-900 text-white placeholder-slate-600 focus:border-[#2EB0D9] outline-none" placeholder="https://script.google.com/..." value={state.config.integrations.googleSheetsUrl} onChange={e => updateIntegration('googleSheetsUrl', e.target.value)} />
                    </div>
                    
                    {/* SCRIPT DISPLAY */}
                    <div className="relative">
                        <div className="text-xs text-slate-500 mb-1">סקריפט מעודכן - שומר לגיליון בשם <b>DATA</b>:</div>
                        <pre className="bg-black p-4 rounded-lg text-xs text-green-400 overflow-x-auto border border-slate-800 h-48 font-mono select-all">{GOOGLE_SCRIPT_TEMPLATE}</pre>
                        <button onClick={() => { navigator.clipboard.writeText(GOOGLE_SCRIPT_TEMPLATE); alert("הועתק!"); }} className="absolute top-6 left-2 bg-slate-800 text-white p-2 rounded hover:bg-slate-700 text-xs flex items-center gap-1"><Copy size={14}/> העתק</button>
                    </div>
                </div>

                {/* AI */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Sparkles/> Gemini AI</h3>
                    <input type="password" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:border-[#2EB0D9] outline-none" placeholder="AIzaSy..." value={state.config.integrations.geminiApiKey} onChange={e => updateIntegration('geminiApiKey', e.target.value)} />
                </div>
            </div>
        )}

        {/* Global Category Selector */}
        {(activeTab === 'articles' || activeTab === 'forms') && (
            <div className="bg-slate-900 p-4 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row md:items-center justify-between sticky top-20 md:top-0 z-20 border border-slate-800 gap-4">
                <div className="flex items-center gap-4"><span className="font-bold text-slate-300 text-sm md:text-lg">עריכה:</span><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as Category | 'ALL')} className="p-2 border border-slate-700 rounded-lg text-[#2EB0D9] font-bold bg-slate-800 font-sans flex-1"><option value="ALL">הכל</option>{Object.values(Category).map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
            </div>
        )}

        {/* --- ARTICLES TAB --- */}
        {activeTab === 'articles' && (
            <div className="space-y-8 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl"><div className="flex flex-col md:flex-row gap-4"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9]" placeholder="נושא למאמר..." value={newArticleTopic} onChange={(e) => setNewArticleTopic(e.target.value)} /><Button onClick={handleGenerateArticle} disabled={isGenerating} className="min-w-[150px]">{isGenerating ? <Loader2 className="animate-spin ml-2"/> : 'צור (AI)'}</Button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredArticles.map(article => (<div key={article.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group"><div className="h-40 relative"><img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div><div className="p-4"><h4 className="font-bold mb-2 line-clamp-1 text-white">{article.title}</h4><div className="flex justify-end gap-2"><button onClick={() => setEditingArticle(article)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white"><Edit size={16}/></button><button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== article.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white"><Trash size={16}/></button></div></div></div>))}</div>
            </div>
        )}

        {/* --- TIMELINES TAB --- */}
        {activeTab === 'timelines' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex gap-4 border-b border-slate-800 pb-4"><button onClick={() => setTimelineSubTab('slider')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'slider' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>סליידר</button><button onClick={() => setTimelineSubTab('cards')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'cards' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>כרטיסים</button></div>
                {timelineSubTab === 'slider' && <div className="space-y-4">{state.slides.map(slide => (<div key={slide.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between items-center"><div className="flex gap-4"><img src={slide.imageUrl} className="w-16 h-10 object-cover rounded"/><span className="text-white">{slide.title}</span></div><button onClick={() => setEditingSlide(slide)}><Edit size={16} className="text-white"/></button></div>))}</div>}
                {timelineSubTab === 'cards' && <div className="space-y-4"><Button onClick={() => setEditingTimelineItem({ id: Date.now().toString(), title: '', description: '', imageUrl: 'https://picsum.photos/400/300', category: [Category.HOME] })}><Plus size={16}/></Button><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredTimelines.map(t => (<div key={t.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between"><div className="text-white font-bold">{t.title}</div><button onClick={() => setEditingTimelineItem(t)}><Edit size={16}/></button></div>))}</div></div>}
            </div>
        )}

        {/* --- CONFIG TAB --- */}
        {activeTab === 'config' && (
             <div className="space-y-6 animate-fade-in">
                
                {/* --- WARNING BANNER --- */}
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3">
                    <CloudUpload className="text-[#2EB0D9] flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-[#2EB0D9]">סנכרון ענן</h4>
                        <p className="text-sm text-slate-400 mt-1">
                            מומלץ לבצע גיבוי ידני מדי פעם גם אם הענן מחובר.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6"><Monitor/> הגדרות כלליות</h3>
                    
                    {/* EXPORT / IMPORT SECTION */}
                    <div className="grid md:grid-cols-2 gap-4 mb-8 pb-8 border-b border-slate-800">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                            <h5 className="font-bold text-[#2EB0D9] mb-2 flex items-center gap-2"><Download size={16}/> גיבוי/ייצוא נתונים</h5>
                            <p className="text-xs text-slate-500 mb-3">הורד קובץ עם כל המידע (מאמרים, הגדרות) כדי לשמור או להעביר למכשיר אחר.</p>
                            <Button onClick={handleExportData} className="w-full" variant="outline">הורד קובץ נתונים</Button>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                            <h5 className="font-bold text-green-400 mb-2 flex items-center gap-2"><Upload size={16}/> טעינת נתונים</h5>
                            <p className="text-xs text-slate-500 mb-3">טען קובץ נתונים ממכשיר אחר. זהירות: זה ימחק את המידע הקיים!</p>
                            <div className="relative">
                                <Button className="w-full bg-green-600 hover:bg-green-700 pointer-events-none">בחר קובץ לטעינה</Button>
                                <input 
                                    type="file" 
                                    accept=".json" 
                                    onChange={handleImportData}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Custom Font */}
                        <div className="border-b border-slate-800 pb-6 mb-6">
                            <h4 className="font-bold text-lg mb-4 text-[#2EB0D9] flex items-center gap-2">
                                <Type size={18}/> פונט לוגו מותאם אישית
                            </h4>
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                                <input type="file" accept=".ttf,.otf" className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#2EB0D9] file:text-white file:cursor-pointer hover:file:bg-[#259cc0]" onChange={handleFontUpload} />
                                {state.config.customFontData && <button onClick={handleResetFont} className="text-red-400 hover:text-red-300 text-xs mt-2">מחק פונט</button>}
                            </div>
                        </div>
                        
                        {/* Theme */}
                        <div className="border-b border-slate-800 pb-6 mb-6">
                            <label className="block text-sm font-bold mb-3 text-slate-400">ערכת נושא</label>
                            <div className="flex gap-4">
                                <button onClick={() => updateState({ config: { ...state.config, theme: 'dark' }})} className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${state.config.theme === 'dark' ? 'border-[#2EB0D9] bg-slate-800' : 'border-slate-700'}`}><Moon size={24}/> <span className="text-xs">כהה</span></button>
                                <button onClick={() => updateState({ config: { ...state.config, theme: 'light' }})} className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${state.config.theme === 'light' ? 'border-[#2EB0D9] bg-white text-black' : 'border-slate-700'}`}><Sun size={24}/> <span className="text-xs">בהיר</span></button>
                            </div>
                        </div>

                        {/* General Fields */}
                        <input type="text" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white mb-2" value={state.config.officeName} onChange={e => updateState({ config: { ...state.config, officeName: e.target.value }})} placeholder="שם המשרד" />
                        
                        {/* UPDATED LOGO URL WITH UPLOAD BUTTON */}
                        <div className="flex gap-2 mb-2">
                            <input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" value={state.config.logoUrl} onChange={e => updateState({ config: { ...state.config, logoUrl: e.target.value }})} placeholder="קישור ללוגו (URL)" />
                            <ImageUploadButton onImageSelected={(url) => updateState({ config: { ...state.config, logoUrl: url }})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} />
                        </div>
                        
                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={() => {
                                    if(confirm("איפוס מלא?")) {
                                        localStorage.removeItem('melaw_site_data_v1');
                                        localStorage.removeItem('melaw_site_data_v2');
                                        window.location.reload();
                                    }
                                }}
                                className="text-red-400 text-xs border border-red-900 px-3 py-1 rounded"
                            >
                                איפוס מלא
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- FORMS TAB --- */}
        {activeTab === 'forms' && (
             <div className="space-y-6 animate-fade-in">
                 <div className="flex justify-end"><Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', category: Category.POA, fields: [], submitEmail: '' })}><Plus size={16}/> טופס חדש</Button></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {state.forms.map(f => (<div key={f.id} className="bg-slate-900 p-4 rounded border border-slate-800 relative">
                         <h4 className="font-bold text-white">{f.title}</h4>
                         {/* Copy ID Button for Forms */}
                         <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                             <span>ID: form-{f.id}</span>
                             <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`form-${f.id}`);
                                    alert("מזהה הטופס הועתק! הדבק אותו בשדה הקישור בטיים-ליין.");
                                }}
                                title="העתק מזהה לקישור בטיים-ליין"
                                className="text-[#2EB0D9] hover:text-white"
                             >
                                 <Copy size={12}/>
                             </button>
                         </div>
                         <button onClick={() => setEditingForm(f)} className="absolute top-4 left-10 p-2"><Edit size={16}/></button>
                         <button onClick={() => updateState({ forms: state.forms.filter(x => x.id !== f.id) })} className="absolute top-4 left-2 p-2 text-red-400"><Trash size={16}/></button>
                     </div>))}
                 </div>
                 {editingForm && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-2xl h-[80vh] flex flex-col"><h3 className="font-bold text-white mb-4">עריכת טופס</h3><div className="flex-1 overflow-y-auto space-y-4"><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingForm.title} onChange={e=>setEditingForm({...editingForm, title: e.target.value})}/><div className="flex gap-2"><button onClick={()=>addFieldToForm('text')} className="p-2 bg-slate-800 border rounded text-xs">טקסט</button><button onClick={()=>addFieldToForm('select')} className="p-2 bg-slate-800 border rounded text-xs">בחירה</button></div>{editingForm.fields.map((field,i)=>(<div key={i} className="flex gap-2 items-center"><input value={field.label} onChange={e=>updateFormField(i,{label:e.target.value})} className="bg-slate-800 text-white p-1 rounded flex-1"/><button onClick={()=>removeFormField(i)} className="text-red-400"><Trash size={14}/></button></div>))}</div><div className="flex gap-2 mt-4"><Button onClick={handleSaveForm}>שמור</Button><Button variant="outline" onClick={()=>setEditingForm(null)}>ביטול</Button></div></div></div>}
             </div>
        )}

        {/* --- TEAM TAB --- */}
        {activeTab === 'team' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingMember({ id: Date.now().toString(), fullName: '', role: '', specialization: '', email: '', phone: '', bio: '', imageUrl: 'https://picsum.photos/400/400' })}><Plus size={16}/> איש צוות</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{state.teamMembers.map(m => (<div key={m.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex gap-4"><img src={m.imageUrl} className="w-16 h-16 rounded-full"/><div className="flex-1"><div className="font-bold text-white">{m.fullName}</div><div className="text-xs text-slate-400">{m.role}</div></div><button onClick={()=>setEditingMember(m)}><Edit size={16}/></button><button onClick={()=>updateState({teamMembers: state.teamMembers.filter(x=>x.id!==m.id)})} className="text-red-400"><Trash size={16}/></button></div>))}</div>
                {editingMember && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-lg space-y-4"><h3 className="font-bold text-white">עריכת צוות</h3><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingMember.fullName} onChange={e=>setEditingMember({...editingMember, fullName: e.target.value})}/><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}/><div className="flex gap-2">
                    <input className="flex-1 p-2 bg-slate-800 text-white rounded" value={editingMember.imageUrl} onChange={e=>setEditingMember({...editingMember, imageUrl: e.target.value})} placeholder="URL תמונה"/>
                    <ImageUploadButton onImageSelected={(url) => setEditingMember({...editingMember, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} />
                </div><div className="flex gap-2"><Button onClick={handleSaveMember}>שמור</Button><Button variant="outline" onClick={()=>setEditingMember(null)}>ביטול</Button></div></div></div>}
            </div>
        )}

      </main>

      <ImagePickerModal isOpen={showImagePicker} onClose={() => setShowImagePicker(false)} onSelect={handleImageSelect} initialQuery={imagePickerContext?.initialQuery} unsplashAccessKey={state.config.integrations.unsplashAccessKey} />
      
      {/* Slide Editor Modal */}
      {editingSlide && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-md space-y-4">
                <h3 className="font-bold text-white">עריכת סליידר</h3>
                <input className="w-full p-2 bg-slate-800 text-white rounded" value={editingSlide.title} onChange={e=>setEditingSlide({...editingSlide, title: e.target.value})}/>
                <div className="flex gap-2">
                    <input className="flex-1 p-2 bg-slate-800 text-white rounded" value={editingSlide.imageUrl} onChange={e=>setEditingSlide({...editingSlide, imageUrl: e.target.value})}/>
                    <ImageUploadButton onImageSelected={(url) => setEditingSlide({...editingSlide, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} />
                </div>
                <div className="flex gap-2"><Button onClick={handleSaveSlide}>שמור</Button><Button variant="outline" onClick={()=>setEditingSlide(null)}>ביטול</Button></div>
            </div>
        </div>
      )}

      {/* Article Editor Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">עריכת מאמר</h3><button onClick={() => setEditingArticle(null)}><X className="text-slate-400"/></button></div>
                <div className="space-y-4">
                    <input className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} placeholder="כותרת"/>
                    <textarea className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white h-24" value={editingArticle.abstract} onChange={e => setEditingArticle({...editingArticle, abstract: e.target.value})} placeholder="תקציר"/>
                    <div className="flex gap-2">
                        <input className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} placeholder="URL תמונה"/>
                        <ImageUploadButton onImageSelected={(url) => setEditingArticle({...editingArticle, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} />
                        <Button onClick={()=>openImagePicker('article', editingArticle.title)}><Search size={16}/></Button>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-slate-800">{editingArticle.tabs.map((tab, idx) => (<div key={idx}><input className="w-full bg-transparent font-bold mb-1 border-b border-slate-800 text-white" value={tab.title} onChange={(e) => {const t = [...editingArticle.tabs]; t[idx].title = e.target.value; setEditingArticle({...editingArticle, tabs: t});}}/><textarea className="w-full bg-slate-950 p-2 rounded text-slate-300 text-sm h-24 border border-slate-800" value={tab.content} onChange={(e) => {const t = [...editingArticle.tabs]; t[idx].content = e.target.value; setEditingArticle({...editingArticle, tabs: t});}}/></div>))}</div>
                    <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setEditingArticle(null)}>ביטול</Button><Button onClick={handleUpdateArticle}>שמור</Button></div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};