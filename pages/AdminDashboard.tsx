
import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, Product, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; 
import { ImageUploadButton } from '../components/ImageUploadButton.tsx'; 
import { emailService, cloudService } from '../services/api.ts'; 
import { dbService } from '../services/supabase.ts';
import { Settings, Layout, FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Link as LinkIcon, Copy, Users, Check, Monitor, Sun, Moon, Database, Type, Menu, Download, Upload, AlertTriangle, CloudUpload, CloudOff, Search, Save, Cloud, HelpCircle, ChevronDown, ChevronUp, Lock, File, Shield, Key, ShoppingCart, Newspaper, Image as ImageIcon, ArrowUp } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
  version?: string;
}

const GOOGLE_SCRIPT_TEMPLATE = `
// --- MeLaw Backend Script ---
// הדבק את כל הקוד הזה ב-Google Apps Script
function doGet(e) { return ContentService.createTextOutput("MeLaw Server Active"); }
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); 
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var action = data.action;
    if (action == 'submitForm') {
       var doc = SpreadsheetApp.getActiveSpreadsheet();
       var sheet = doc.getSheetByName("DATA");
       if (!sheet) sheet = doc.insertSheet("DATA");
       var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
       var isNewSheet = sheet.getLastColumn() === 0 || (headers.length === 1 && headers[0] === "");
       if (isNewSheet) {
         headers = ["Timestamp", "FormName"];
         for (var key in data) { if (key !== "action" && key !== "formName" && key !== "submittedAt") headers.push(key); }
         sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
       }
       var newRow = [];
       var timestamp = new Date();
       for (var i = 0; i < headers.length; i++) {
         var header = headers[i];
         if (header === "Timestamp") newRow.push(timestamp);
         else if (header === "FormName") newRow.push(data.formName || "General");
         else { var val = data[header]; newRow.push(typeof val === 'object' ? JSON.stringify(val) : (val || "")); }
       }
       sheet.appendRow(newRow);
       return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }
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
    if (action == 'saveState') {
       var sheet = getOrCreateSheet("SiteData");
       var jsonString = JSON.stringify({ status: 'success', timestamp: new Date(), data: data.data });
       sheet.appendRow([jsonString]);
       return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}
function getOrCreateSheet(name) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(name);
  if (!sheet) sheet = doc.insertSheet(name);
  return sheet;
}
`;

const SUPABASE_SQL_INSTRUCTIONS = `
create table site_config (
  id bigint primary key generated always as identity,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
insert into site_config (data) values ('{}');
alter table site_config enable row level security;
create policy "Enable access to all users" on site_config for all using (true) with check (true);
`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout, version }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'integrations' | 'articles' | 'news' | 'forms' | 'team' | 'payments'>('articles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isSavingToCloud, setIsSavingToCloud] = useState(false); 
  const [isLoadingFromCloud, setIsLoadingFromCloud] = useState(false); 
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [showSupabaseHelp, setShowSupabaseHelp] = useState(false);
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);

  const isSupabaseConfigured = state.config.integrations.supabaseUrl && state.config.integrations.supabaseKey;
  const isGoogleSheetsConfigured = state.config.integrations.googleSheetsUrl && state.config.integrations.googleSheetsUrl.includes("script.google.com");
  const isCloudConnected = isSupabaseConfigured || isGoogleSheetsConfigured;

  const supabaseConfig = { url: state.config.integrations.supabaseUrl, key: state.config.integrations.supabaseKey };

  const handleSaveToCloud = async () => {
      if (!isCloudConnected) {
          alert("שגיאה: לא הוגדר חיבור.\nאנא עבור ללשונית 'חיבורים' והגדר את החיבור.");
          setActiveTab('integrations');
          return;
      }
      setIsSavingToCloud(true);
      
      const now = new Date().toLocaleString('he-IL');
      const stateToSave = { ...state, lastUpdated: now };
      updateState({ lastUpdated: now });

      try {
          if (isSupabaseConfigured) {
              const success = await dbService.saveState(state.config.integrations.supabaseUrl, state.config.integrations.supabaseKey, stateToSave);
              alert(success ? "נשמר בהצלחה ב-Supabase!" : "שגיאה בשמירה ל-Supabase.");
          } else if (isGoogleSheetsConfigured) {
              const success = await cloudService.saveStateToCloud(state.config.integrations.googleSheetsUrl, stateToSave);
              alert(success ? "נשמר בהצלחה בגוגל!" : "שגיאה בשמירה לגוגל.");
          }
      } catch (e) { alert("שגיאת תקשורת."); } finally { setIsSavingToCloud(false); }
  };

  const handleLoadFromCloud = async () => {
    if (!isCloudConnected) {
        alert("לא ניתן לטעון: אין חיבור מוגדר");
        return;
    }
    if (!confirm("פעולה זו תדרוס את המידע הנוכחי במכשיר זה ותטען את הגרסה האחרונה מהענן. להמשיך?")) return;

    setIsLoadingFromCloud(true);
    try {
        let newData = null;
        if (isSupabaseConfigured) {
            newData = await dbService.loadState(state.config.integrations.supabaseUrl, state.config.integrations.supabaseKey);
        } else if (isGoogleSheetsConfigured) {
            newData = await cloudService.loadStateFromCloud(state.config.integrations.googleSheetsUrl);
        }

        if (newData) {
             updateState({
                 ...newData,
                 config: {
                     ...state.config,
                     ...newData.config,
                     integrations: {
                         ...state.config.integrations,
                         ...(newData.config?.integrations || {})
                     }
                 }
             });
             alert("הנתונים נטענו בהצלחה מהענן!");
        } else {
            alert("לא נמצאו נתונים או שאירעה שגיאה בטעינה.");
        }
    } catch (e) {
        alert("שגיאה בטעינה מהענן.");
    } finally {
        setIsLoadingFromCloud(false);
    }
  };

  const handleExportData = () => { const dataStr = JSON.stringify(state); const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', 'melaw_data.json'); linkElement.click(); };
  const handleImportData = (e: any) => { const file = e.target.files?.[0]; if(!file)return; const reader = new FileReader(); reader.onload = (ev) => { try { const p = JSON.parse(ev.target?.result as string); updateState({...p, isAdminLoggedIn:true}); alert("נטען!"); } catch { alert("שגיאה"); }}; reader.readAsText(file); };
  const handleGenerateArticle = async () => { if (!newArticleTopic) return; setIsGenerating(true); try { const generated = await generateArticleContent(newArticleTopic, selectedCategory, state.config.integrations.geminiApiKey); const newArticle: Article = { id: Date.now().toString(), categories: selectedCategory === 'ALL' ? [Category.HOME] : [selectedCategory], title: generated.title || newArticleTopic, abstract: generated.abstract || '', imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`, quote: generated.quote, tabs: generated.tabs || [], order: 99 }; updateState({ articles: [newArticle, ...state.articles] }); setNewArticleTopic(''); alert("נוצר!"); } catch (e: any) { alert("שגיאה: " + e.message); } finally { setIsGenerating(false); } };
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
  const handleSaveProduct = () => { 
      if(editingProduct) { 
          const currentProducts = state.products || []; 
          const exists = currentProducts.find(p => p.id === editingProduct.id); 
          updateState({ products: exists ? currentProducts.map(p => p.id === editingProduct.id ? editingProduct : p) : [...currentProducts, editingProduct] }); 
          setEditingProduct(null); 
      }
  };
  const updateIntegration = (key: keyof typeof state.config.integrations, value: string) => { updateState({ config: { ...state.config, integrations: { ...state.config.integrations, [key]: value } } }); };
  const handleFontUpload = (e: any) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => updateState({ config: { ...state.config, customFontData: ev.target?.result as string }}); r.readAsDataURL(f); }};
  const handleResetFont = () => updateState({ config: { ...state.config, customFontData: undefined }});

  const toggleFormCategory = (cat: Category) => {
      if (!editingForm) return;
      const current = editingForm.categories || [];
      if (current.includes(cat)) {
          setEditingForm({ ...editingForm, categories: current.filter(c => c !== cat) });
      } else {
          setEditingForm({ ...editingForm, categories: [...current, cat] });
      }
  };

  const filteredArticles = state.articles.filter(a => selectedCategory === 'ALL' || a.categories.includes(selectedCategory)).sort((a,b) => (a.order || 99) - (b.order || 99));
  const filteredTimelines = state.timelines.filter(t => selectedCategory === 'ALL' || t.category.includes(selectedCategory)).sort((a,b) => (a.order || 99) - (b.order || 99));

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 overflow-hidden relative">
      <aside className={`fixed h-full right-0 z-50 w-64 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div><h2 className="text-2xl font-bold text-white"><span className="text-[#2EB0D9]">Me</span>Law Admin</h2>{version && <span className="text-[10px] text-slate-500 font-mono bg-black/30 px-1 rounded">{version}</span>}</div>
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}><X/></button>
        </div>
        <div className="p-4 border-b border-slate-800 space-y-2">
             <div className="text-center mb-2">
                 {isCloudConnected ? <span className="text-xs text-green-500 flex items-center justify-center gap-1 font-bold"><CloudUpload size={12}/> מחובר לענן</span> : <span className="text-xs text-red-500 flex items-center justify-center gap-1 font-bold animate-pulse"><CloudOff size={12}/> ענן לא מחובר</span>}
             </div>
             <Button onClick={handleSaveToCloud} className={`w-full flex items-center justify-center gap-2 font-bold shine-effect ${isSavingToCloud ? 'opacity-70 cursor-wait' : ''}`} variant={isCloudConnected ? "secondary" : "outline"} disabled={isSavingToCloud}>
                 {isSavingToCloud ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} {isSavingToCloud ? 'שומר...' : 'שמור לענן'}
             </Button>
             <Button onClick={handleLoadFromCloud} className={`w-full flex items-center justify-center gap-2 font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 ${isLoadingFromCloud ? 'opacity-70 cursor-wait' : ''}`} disabled={isLoadingFromCloud}>
                 {isLoadingFromCloud ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />} {isLoadingFromCloud ? 'טוען...' : 'טען מהענן'}
             </Button>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <button onClick={() => { setActiveTab('articles'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'articles' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><FileText size={20} /> מאמרים</button>
          <button onClick={() => { setActiveTab('news'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'news' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Newspaper size={20} /> חדשות ועדכונים</button>
          <button onClick={() => { setActiveTab('forms'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><ClipboardList size={20} /> טפסים</button>
          <button onClick={() => { setActiveTab('team'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'team' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Users size={20} /> צוות</button>
          <button onClick={() => { setActiveTab('payments'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'payments' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><ShoppingCart size={20} /> חנות ותשלומים</button>
          <div className="border-t border-slate-800 my-2"></div>
          <button onClick={() => { setActiveTab('integrations'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><LinkIcon size={20} /> חיבורים</button>
          <button onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Monitor size={20} /> הגדרות</button>
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={onLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors p-2"><LogOut size={18}/> יציאה</button></div>
      </aside>

      <main className="flex-1 md:mr-64 p-4 md:p-8 overflow-y-auto min-h-screen">
        <div className="md:hidden flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800 sticky top-0 z-30 shadow-lg"><h3 className="font-bold text-white">תפריט ניהול</h3><button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-slate-800 rounded text-[#2EB0D9] border border-slate-700"><Menu size={24} /></button></div>

        {/* ... (Integrations Tab skipped) ... */}
        {/* ... (Same as before) ... */}

        {/* --- ARTICLES TAB --- */}
        {activeTab === 'articles' && (
            <div className="space-y-8 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl"><div className="flex flex-col md:flex-row gap-4"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9]" placeholder="נושא למאמר..." value={newArticleTopic} onChange={(e) => setNewArticleTopic(e.target.value)} /><Button onClick={handleGenerateArticle} disabled={isGenerating} className="min-w-[150px]">{isGenerating ? <Loader2 className="animate-spin ml-2"/> : 'צור (AI)'}</Button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredArticles.map(article => (<div key={article.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group"><div className="h-40 relative"><img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div><div className="p-4"><div className="flex justify-between items-start mb-2"><h4 className="font-bold line-clamp-1 text-white flex-1">{article.title}</h4><span className="text-xs text-slate-500 border border-slate-700 px-1 rounded">#{article.order || 99}</span></div><div className="flex justify-end gap-2"><button onClick={() => setEditingArticle(article)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white"><Edit size={16}/></button><button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== article.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white"><Trash size={16}/></button></div></div></div>))}</div>
            </div>
        )}

        {/* --- NEWS & UPDATES TAB --- */}
        {activeTab === 'news' && (
            <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-white mb-4">ניהול חדשות ועדכונים (Timeline)</h3>
                <div className="flex gap-4 border-b border-slate-800 pb-4"><button onClick={() => setTimelineSubTab('slider')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'slider' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>סליידר ראשי</button><button onClick={() => setTimelineSubTab('cards')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'cards' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>עדכונים רצים</button></div>
                {timelineSubTab === 'slider' && <div className="space-y-4">{state.slides.sort((a,b)=>(a.order||99)-(b.order||99)).map(slide => (<div key={slide.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between items-center"><div className="flex gap-4"><img src={slide.imageUrl} className="w-16 h-10 object-cover rounded"/><div className="flex flex-col"><span className="text-white">{slide.title}</span><span className="text-xs text-slate-500">Order: {slide.order || 99}</span></div></div><button onClick={() => setEditingSlide(slide)}><Edit size={16} className="text-white"/></button></div>))}</div>}
                {timelineSubTab === 'cards' && <div className="space-y-4"><Button onClick={() => setEditingTimelineItem({ id: Date.now().toString(), title: '', description: '', imageUrl: 'https://picsum.photos/400/300', category: [Category.HOME], order: 99 })}><Plus size={16}/> עדכון חדש</Button><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredTimelines.map(t => (<div key={t.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between"><div className="flex-1"><div className="text-white font-bold">{t.title}</div><div className="text-xs text-slate-500">Order: {t.order || 99}</div></div><button onClick={() => setEditingTimelineItem(t)}><Edit size={16}/></button></div>))}</div></div>}
            </div>
        )}

        {/* --- PAYMENTS & STORE TAB --- */}
        {activeTab === 'payments' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShoppingCart className="text-[#2EB0D9]"/> חנות ומוצרים לתשלום</h3>
                    <Button onClick={() => setEditingProduct({ id: Date.now().toString(), title: 'מוצר חדש', price: 0, category: Category.STORE, paymentLink: '', order: 99 })}><Plus size={16}/> הוסף מוצר</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(state.products || []).sort((a,b)=>(a.order||99)-(b.order||99)).map(product => (
                        <div key={product.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative group hover:border-[#2EB0D9] transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs bg-[#2EB0D9]/20 text-[#2EB0D9] px-2 py-1 rounded">{CATEGORY_LABELS[product.category]}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingProduct(product)} className="text-slate-400 hover:text-white"><Edit size={16}/></button>
                                    <button onClick={() => updateState({ products: state.products.filter(p => p.id !== product.id) })} className="text-slate-400 hover:text-red-500"><Trash size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-white text-lg">{product.title}</h4>
                            <p className="text-slate-400 text-xs mb-2 line-clamp-2">{product.description}</p>
                            <div className="flex justify-between items-center mt-4">
                                <span className="font-black text-xl text-white">₪{product.price}</span>
                                <span className="text-xs text-slate-500 border border-slate-700 px-1 rounded">#{product.order || 99}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {editingProduct && (
                    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-lg space-y-4">
                            <h3 className="font-bold text-white mb-4">עריכת מוצר לתשלום</h3>
                            <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.title} onChange={e=>setEditingProduct({...editingProduct, title: e.target.value})} placeholder="שם המוצר/שירות"/>
                            <textarea className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.description} onChange={e=>setEditingProduct({...editingProduct, description: e.target.value})} placeholder="תיאור קצר"/>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500">מחיר (בש"ח)</label>
                                    <input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: Number(e.target.value)})}/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500">סדר תצוגה</label>
                                    <input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.order || 99} onChange={e=>setEditingProduct({...editingProduct, order: Number(e.target.value)})}/>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">קטגוריה (איפה יופיע?)</label>
                                <select className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.category} onChange={e=>setEditingProduct({...editingProduct, category: e.target.value as Category})}>
                                    {Object.values(Category).map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">קישור לתשלום (Stripe / PayPal)</label>
                                <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.paymentLink} onChange={e=>setEditingProduct({...editingProduct, paymentLink: e.target.value})} placeholder="https://buy.stripe.com/..."/>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                                <Button onClick={handleSaveProduct}>שמור</Button>
                                <Button variant="outline" onClick={()=>setEditingProduct(null)}>ביטול</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Forms Tab */}
        {activeTab === 'forms' && (
             <div className="space-y-6 animate-fade-in">
                 <div className="flex justify-end"><Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.POA], fields: [], submitEmail: '', pdfTemplate: 'NONE', order: 99 })}><Plus size={16}/> טופס חדש</Button></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {state.forms.sort((a,b)=>(a.order||99)-(b.order||99)).map(f => (<div key={f.id} className="bg-slate-900 p-4 rounded border border-slate-800 relative">
                         <div className="flex justify-between items-start"><h4 className="font-bold text-white">{f.title}</h4><span className="text-xs text-slate-500">#{f.order || 99}</span></div>
                         <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 mt-2 inline-block">PDF: {f.pdfTemplate || 'NONE'}</span>
                         <div className="flex flex-wrap gap-1 mt-2">
                             {f.categories && f.categories.map(cat => (
                                 <span key={cat} className="text-[10px] bg-[#2EB0D9]/20 text-[#2EB0D9] px-1 rounded border border-[#2EB0D9]/30">{CATEGORY_LABELS[cat]}</span>
                             ))}
                         </div>
                         <div className="text-xs text-slate-500 mt-2 flex items-center gap-2"><span>ID: form-{f.id}</span><button onClick={() => {navigator.clipboard.writeText(`form-${f.id}`); alert("הועתק!");}} className="text-[#2EB0D9] hover:text-white"><Copy size={12}/></button></div>
                         <button onClick={() => setEditingForm(f)} className="absolute top-4 left-10 p-2"><Edit size={16}/></button>
                         <button onClick={() => updateState({ forms: state.forms.filter(x => x.id !== f.id) })} className="absolute top-4 left-2 p-2 text-red-400"><Trash size={16}/></button>
                     </div>))}
                 </div>
                 {editingForm && (
                     <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                         <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-2xl h-[85vh] flex flex-col">
                             <h3 className="font-bold text-white mb-4">עריכת טופס</h3>
                             <div className="flex-1 overflow-y-auto space-y-4">
                                 <div className="flex gap-2">
                                     <div className="flex-1">
                                         <label className="block text-xs font-bold text-slate-400 mb-1">שם הטופס</label>
                                         <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.title} onChange={e=>setEditingForm({...editingForm, title: e.target.value})} placeholder="שם הטופס"/>
                                     </div>
                                     <div className="w-24">
                                         <label className="block text-xs font-bold text-slate-400 mb-1">סדר</label>
                                         <input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.order || 99} onChange={e=>setEditingForm({...editingForm, order: Number(e.target.value)})}/>
                                     </div>
                                 </div>
                                 
                                 <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                     <label className="block text-xs font-bold text-slate-400 mb-2">היכן יופיע הטופס?</label>
                                     <div className="flex flex-wrap gap-2">{Object.values(Category).map(cat => (<button key={cat} onClick={() => toggleFormCategory(cat)} className={`text-xs px-2 py-1 rounded border transition-colors ${editingForm.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>{CATEGORY_LABELS[cat]} {editingForm.categories?.includes(cat) && <Check size={10} className="inline ml-1"/>}</button>))}</div>
                                 </div>
                                 <div><label className="block text-xs font-bold text-slate-400 mb-1">סוג הדפסה (PDF Template)</label><select className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.pdfTemplate || 'NONE'} onChange={e => setEditingForm({...editingForm, pdfTemplate: e.target.value as any})}><option value="NONE">ללא (רק שליחה)</option><option value="WILL">צוואה (Will)</option><option value="POA">ייפוי כוח (POA)</option></select></div>
                                 <div className="border-t border-slate-800 pt-4"><div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-slate-400">שדות הטופס</label><div className="flex gap-2"><button onClick={()=>addFieldToForm('text')} className="p-1 px-2 bg-slate-800 border rounded text-xs text-white">+ טקסט</button><button onClick={()=>addFieldToForm('select')} className="p-1 px-2 bg-slate-800 border rounded text-xs text-white">+ בחירה</button></div></div><div className="space-y-2 max-h-40 overflow-y-auto pr-1">{editingForm.fields.map((field,i)=>(<div key={i} className="flex gap-2 items-center bg-slate-800 p-2 rounded border border-slate-700"><span className="text-xs text-slate-500 w-8">{field.type}</span><input value={field.label} onChange={e=>updateFormField(i,{label:e.target.value})} className="bg-slate-900 border border-slate-700 text-white p-1 rounded flex-1 text-xs"/><button onClick={()=>removeFormField(i)} className="text-red-400 hover:bg-slate-900 p-1 rounded"><Trash size={14}/></button></div>))}</div></div>
                             </div>
                             <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800"><Button onClick={handleSaveForm}>שמור</Button><Button variant="outline" onClick={()=>setEditingForm(null)}>ביטול</Button></div>
                         </div>
                     </div>
                 )}
             </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingMember({ id: Date.now().toString(), fullName: '', role: '', specialization: '', email: '', phone: '', bio: '', imageUrl: 'https://picsum.photos/400/400', order: 99 })}><Plus size={16}/> איש צוות</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{state.teamMembers.sort((a,b)=>(a.order||99)-(b.order||99)).map(m => (<div key={m.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex gap-4"><img src={m.imageUrl} className="w-16 h-16 rounded-full"/><div className="flex-1"><div className="flex justify-between"><div className="font-bold text-white">{m.fullName}</div><span className="text-xs text-slate-500">#{m.order || 99}</span></div><div className="text-xs text-slate-400">{m.role}</div></div><button onClick={()=>setEditingMember(m)}><Edit size={16}/></button><button onClick={()=>updateState({teamMembers: state.teamMembers.filter(x=>x.id!==m.id)})} className="text-red-400"><Trash size={16}/></button></div>))}</div>
                {editingMember && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"><h3 className="font-bold text-white mb-4">עריכת איש צוות</h3>
                <div className="flex gap-2">
                    <div className="flex-1"><label className="text-xs text-slate-500">שם מלא</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.fullName} onChange={e=>setEditingMember({...editingMember, fullName: e.target.value})}/></div>
                    <div className="w-24"><label className="text-xs text-slate-500">סדר</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.order || 99} onChange={e=>setEditingMember({...editingMember, order: Number(e.target.value)})}/></div>
                </div>
                <div className="flex gap-2"><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}/><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.specialization} onChange={e=>setEditingMember({...editingMember, specialization: e.target.value})}/></div><textarea className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.bio} onChange={e=>setEditingMember({...editingMember, bio: e.target.value})}/><div className="flex gap-2"><input className="flex-1 p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.imageUrl} onChange={e=>setEditingMember({...editingMember, imageUrl: e.target.value})} placeholder="URL תמונה"/><ImageUploadButton onImageSelected={(url) => setEditingMember({...editingMember, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} /><Button onClick={()=>openImagePicker('team', editingMember.fullName)}><Search size={16}/></Button></div><div className="flex gap-2"><Button onClick={handleSaveMember}>שמור</Button><Button variant="outline" onClick={()=>setEditingMember(null)}>ביטול</Button></div></div></div>}
            </div>
        )}

        {/* ... (Config tab - no major change needed) ... */}
        {activeTab === 'config' && (
             <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6"><Monitor/> הגדרות כלליות</h3>
                    <div className="space-y-6">
                        <div className="border-b border-slate-800 pb-6 mb-6"><h4 className="font-bold text-lg mb-4 text-[#2EB0D9] flex items-center gap-2"><Type size={18}/> פונט לוגו מותאם אישית</h4><div className="bg-slate-950 p-4 rounded-lg border border-slate-700"><input type="file" accept=".ttf,.otf" className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#2EB0D9] file:text-white file:cursor-pointer hover:file:bg-[#259cc0]" onChange={handleFontUpload} />{state.config.customFontData && <button onClick={handleResetFont} className="text-red-400 hover:text-red-300 text-xs mt-2">מחק פונט</button>}</div></div>
                        <div><label className="block text-sm font-bold mb-2 text-slate-400">קטגוריה ראשית בטעינה</label><select value={state.config.defaultCategory || Category.STORE} onChange={(e) => updateState({ config: { ...state.config, defaultCategory: e.target.value as Category }})} className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white">{Object.values(Category).map(cat => (<option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>))}</select></div>
                        <div className="border border-slate-800 bg-slate-950 p-4 rounded-lg space-y-4"><h4 className="font-bold text-[#2EB0D9] flex items-center gap-2"><Shield size={16}/> אבטחת ניהול</h4><div><label className="block text-xs font-bold mb-1 text-slate-400">סיסמת ניהול</label><input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white" value={state.config.adminPassword || 'admin'} onChange={e => updateState({ config: { ...state.config, adminPassword: e.target.value }})} /></div><div><label className="block text-xs font-bold mb-1 text-slate-400">רמז לסיסמה</label><input type="text" className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white" value={state.config.passwordHint || ''} onChange={e => updateState({ config: { ...state.config, passwordHint: e.target.value }})} placeholder="לדוגמה: ת.ז שלי" /></div></div>
                        <div className="flex gap-2 mb-2"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" value={state.config.logoUrl} onChange={e => updateState({ config: { ...state.config, logoUrl: e.target.value }})} placeholder="קישור ללוגו (URL)" /><ImageUploadButton onImageSelected={(url) => updateState({ config: { ...state.config, logoUrl: url }})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} /></div>
                    </div>
                </div>
            </div>
        )}

      </main>

      <ImagePickerModal isOpen={showImagePicker} onClose={() => setShowImagePicker(false)} onSelect={handleImageSelect} initialQuery={imagePickerContext?.initialQuery} unsplashAccessKey={state.config.integrations.unsplashAccessKey} />
      
      {/* Article Editor Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">עריכת מאמר</h3><button onClick={() => setEditingArticle(null)}><X className="text-slate-400"/></button></div>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} placeholder="כותרת"/>
                        <input type="number" className="w-24 p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.order || 99} onChange={e => setEditingArticle({...editingArticle, order: Number(e.target.value)})} placeholder="סדר"/>
                    </div>
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
      
      {/* Slide Editor Modal */}
      {editingSlide && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-md space-y-4">
                <h3 className="font-bold text-white">עריכת סליידר</h3>
                <input className="w-full p-2 bg-slate-800 text-white rounded" value={editingSlide.title} onChange={e=>setEditingSlide({...editingSlide, title: e.target.value})}/>
                <div className="flex gap-2">
                    <div className="flex-1"><label className="text-xs text-slate-500">כתובת תמונה</label><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingSlide.imageUrl} onChange={e=>setEditingSlide({...editingSlide, imageUrl: e.target.value})}/></div>
                    <div className="w-24"><label className="text-xs text-slate-500">סדר</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded" value={editingSlide.order || 99} onChange={e=>setEditingSlide({...editingSlide, order: Number(e.target.value)})}/></div>
                </div>
                <div className="flex gap-2">
                    <ImageUploadButton onImageSelected={(url) => setEditingSlide({...editingSlide, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} />
                    <Button onClick={()=>openImagePicker('slide', editingSlide.title)}><Search size={16}/></Button>
                </div>
                <div className="flex gap-2"><Button onClick={handleSaveSlide}>שמור</Button><Button variant="outline" onClick={()=>setEditingSlide(null)}>ביטול</Button></div>
            </div>
        </div>
      )}
      
      {/* Timeline Item Editor Modal */}
      {editingTimelineItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-md space-y-4">
                <h3 className="font-bold text-white">עריכת עדכון חדשות</h3>
                <input className="w-full p-2 bg-slate-800 text-white rounded" value={editingTimelineItem.title} onChange={e=>setEditingTimelineItem({...editingTimelineItem, title: e.target.value})} placeholder="כותרת"/>
                <textarea className="w-full p-2 bg-slate-800 text-white rounded h-24" value={editingTimelineItem.description} onChange={e=>setEditingTimelineItem({...editingTimelineItem, description: e.target.value})} placeholder="תוכן"/>
                <div className="flex gap-2">
                    <div className="flex-1"><label className="text-xs text-slate-500">תמונה (אופציונלי)</label><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingTimelineItem.imageUrl} onChange={e=>setEditingTimelineItem({...editingTimelineItem, imageUrl: e.target.value})}/></div>
                    <div className="w-24"><label className="text-xs text-slate-500">סדר</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded" value={editingTimelineItem.order || 99} onChange={e=>setEditingTimelineItem({...editingTimelineItem, order: Number(e.target.value)})}/></div>
                </div>
                <div className="flex gap-2">
                    <ImageUploadButton onImageSelected={(url) => setEditingTimelineItem({...editingTimelineItem, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} />
                    <Button onClick={()=>openImagePicker('timeline', editingTimelineItem.title)}><Search size={16}/></Button>
                </div>
                <div className="flex gap-2"><Button onClick={handleSaveTimelineItem}>שמור</Button><Button variant="outline" onClick={()=>setEditingTimelineItem(null)}>ביטול</Button></div>
            </div>
        </div>
      )}
    </div>
  );
};
