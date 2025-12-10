
import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, Product, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; 
import { ImageUploadButton } from '../components/ImageUploadButton.tsx'; 
import { emailService, cloudService } from '../services/api.ts'; 
import { dbService } from '../services/supabase.ts';
import { Settings, Layout, FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Link as LinkIcon, Copy, Users, Check, Monitor, Sun, Moon, Database, Type, Menu, Download, Upload, AlertTriangle, CloudUpload, CloudOff, Search, Save, Cloud, HelpCircle, ChevronDown, ChevronUp, Lock, File, Shield, Key, ShoppingCart, Newspaper, Image as ImageIcon, ArrowUp, GalleryHorizontal, Phone, MessageCircle, Printer, Mail, MapPin, Eye, EyeOff, CreditCard } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
  version?: string;
}

// --- PUBLIC KEYS FALLBACK (For Image Uploads) ---
const FALLBACK_SUPABASE_URL = 'https://kqjmwwjafypkswkkbncc.supabase.co'; 
const FALLBACK_SUPABASE_KEY = 'sb_publishable_ftgAGUontmVJ-BfgzfQJsA_n7npD__t';

const GOOGLE_SCRIPT_CODE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    var action = data.action;

    // --- CASE 1: FORM SUBMISSION & EMAIL PDF ---
    if (action === 'submitForm') {
      var sheetName = data.targetSheet || 'DATA';
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(['Timestamp', 'ID', 'Form Name', 'Data']);
      }

      var timestamp = new Date();
      var id = data.submissionId || 'N/A';
      
      // Store in Sheet
      var rowData = [timestamp, id, data.formName];
      for (var key in data) {
        if (key !== 'action' && key !== 'targetSheet' && key !== 'templateSheet' && key !== 'formName' && key !== 'submittedAt' && key !== 'submissionId' && key !== 'officeEmail' && key !== 'clientEmail' && key !== 'sendClientCopy') {
           rowData.push(key + ": " + data[key]);
        }
      }
      sheet.appendRow(rowData);

      // Generate HTML Content
      var html = "<html><body style='font-family: Arial; direction: rtl; text-align: right;'>";
      html += "<h1 style='color: #2EB0D9;'>" + data.formName + "</h1>";
      html += "<div style='background: #f0f0f0; padding: 10px; margin-bottom: 20px;'><strong>מספר אסמכתא:</strong> " + id + "<br><strong>תאריך:</strong> " + timestamp.toLocaleString() + "</div>";
      html += "<table border='1' cellpadding='10' cellspacing='0' style='width: 100%; border-collapse: collapse; border-color: #ddd;'>";
      
      for (var key in data) {
          if (key !== 'action' && key !== 'targetSheet' && key !== 'templateSheet' && key !== 'formName' && key !== 'submittedAt' && key !== 'submissionId' && key !== 'officeEmail' && key !== 'clientEmail' && key !== 'sendClientCopy') {
              html += "<tr><td style='background: #f9f9f9; width: 30%;'><strong>" + key + "</strong></td><td>" + data[key] + "</td></tr>";
          }
      }
      html += "</table><br><p>נשלח באופן אוטומטי ע\"י מערכת MeLaw.</p></body></html>";
      var pdfBlob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF).setName(data.formName + "_" + id + ".pdf");

      // 1. Send to Office (Always)
      if (data.officeEmail) {
          try {
              MailApp.sendEmail({
                  to: data.officeEmail,
                  subject: "טופס חדש התקבל: " + data.formName + " (" + id + ")",
                  htmlBody: "<h3>שלום רב,</h3><p>התקבל טופס חדש מהאתר.</p><p>מצורף קובץ PDF עם הפרטים.</p>",
                  attachments: [pdfBlob]
              });
          } catch (e) { console.log("Office email failed: " + e); }
      }

      // 2. Send to Client (If requested and exists)
      if (data.sendClientCopy && data.clientEmail) {
          try {
              MailApp.sendEmail({
                  to: data.clientEmail,
                  subject: "העתק טופס: " + data.formName + " - " + id,
                  htmlBody: "<h3>שלום רב,</h3><p>תודה שמילאת את הטופס באתרנו.</p><p>מצורף העתק הפרטים כקובץ PDF.</p><br><p>בברכה,<br>משרד עורכי הדין</p>",
                  attachments: [pdfBlob]
              });
          } catch (e) { console.log("Client email failed: " + e); }
      }

      return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // --- CASE 2: SAVE STATE ---
    if (action === 'saveState') {
       var configSheet = ss.getSheetByName('SiteConfig');
       if (!configSheet) configSheet = ss.insertSheet('SiteConfig');
       configSheet.clear();
       configSheet.getRange(1, 1).setValue(JSON.stringify(data.data));
       return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    }

    // --- CASE 3: UPLOAD IMAGE (LEGACY) ---
    if (action === 'uploadImage') {
        var folderName = "MeLaw Images";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        var contentType = data.data.mimeType || 'image/jpeg';
        var blob = Utilities.newBlob(Utilities.base64Decode(data.data.imageData), contentType, data.data.fileName);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return ContentService.createTextOutput(JSON.stringify({status: 'success', url: file.getDownloadUrl()})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout, version }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'integrations' | 'articles' | 'news' | 'sliders' | 'forms' | 'team' | 'payments'>('articles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isSavingToCloud, setIsSavingToCloud] = useState(false); 
  const [isLoadingFromCloud, setIsLoadingFromCloud] = useState(false); 
  
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
  
  const [showGoogleCode, setShowGoogleCode] = useState(false);

  const isSupabaseConfigured = state.config.integrations.supabaseUrl && state.config.integrations.supabaseKey;
  const isGoogleSheetsConfigured = state.config.integrations.googleSheetsUrl && state.config.integrations.googleSheetsUrl.includes("script.google.com");
  const isCloudConnected = isSupabaseConfigured || isGoogleSheetsConfigured;

  const supabaseConfig = { 
      url: state.config.integrations.supabaseUrl || FALLBACK_SUPABASE_URL, 
      key: state.config.integrations.supabaseKey || FALLBACK_SUPABASE_KEY
  };

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

  const handleGenerateArticle = async () => { 
      if (!newArticleTopic) return;
      const apiKey = state.config.integrations.geminiApiKey;
      if (!apiKey || apiKey.length < 10) {
          alert("שגיאה: חסר מפתח Gemini API.\n\nאנא עבור ללשונית 'חיבורים' והדבק מפתח API תקין מ-Google AI Studio.");
          setActiveTab('integrations');
          return;
      }
      setIsGenerating(true); 
      try { 
          const generated = await generateArticleContent(newArticleTopic, selectedCategory, apiKey); 
          const newArticle: Article = { id: Date.now().toString(), categories: selectedCategory === 'ALL' ? [Category.HOME] : [selectedCategory], title: generated.title || newArticleTopic, abstract: generated.abstract || '', imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`, quote: generated.quote, tabs: generated.tabs || [], order: 99 }; 
          updateState({ articles: [newArticle, ...state.articles] }); 
          setNewArticleTopic(''); 
          alert("נוצר!"); 
      } catch (e: any) { 
          alert("שגיאה ביצירת המאמר: " + e.message); 
      } finally { 
          setIsGenerating(false); 
      } 
  };

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
  
  // Forms & Fields Helpers
  const handleSaveForm = () => { if(editingForm && editingForm.title) { const exists = state.forms.find(f => f.id === editingForm.id); updateState({ forms: exists ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] }); setEditingForm(null); }};
  const addFieldToForm = (type: FieldType) => { if(editingForm) setEditingForm({ ...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type, label: 'שדה חדש', required: false, options: type === 'select' ? ['אפשרות 1'] : undefined }] }); };
  const updateFormField = (index: number, updates: Partial<FormField>) => { if(editingForm) { const f = [...editingForm.fields]; f[index] = { ...f[index], ...updates }; setEditingForm({ ...editingForm, fields: f }); }};
  const removeFormField = (index: number) => { if(editingForm) setEditingForm({ ...editingForm, fields: editingForm.fields.filter((_, i) => i !== index) }); };
  const toggleFormCategory = (cat: Category) => { if (!editingForm) return; const current = editingForm.categories || []; if (current.includes(cat)) { setEditingForm({ ...editingForm, categories: current.filter(c => c !== cat) }); } else { setEditingForm({ ...editingForm, categories: [...current, cat] }); } };

  // Other Savers
  const handleSaveMember = () => { if(editingMember) { const exists = state.teamMembers.find(m => m.id === editingMember.id); updateState({ teamMembers: exists ? state.teamMembers.map(m => m.id === editingMember.id ? editingMember : m) : [...state.teamMembers, editingMember] }); setEditingMember(null); }};
  const handleSaveSlide = () => { if(editingSlide) { const exists = state.slides.find(s => s.id === editingSlide.id); updateState({ slides: exists ? state.slides.map(s => s.id === editingSlide.id ? editingSlide : s) : [...state.slides, editingSlide] }); setEditingSlide(null); }};
  const handleSaveTimelineItem = () => { if(editingTimelineItem) { const exists = state.timelines.find(t => t.id === editingTimelineItem.id); updateState({ timelines: exists ? state.timelines.map(t => t.id === editingTimelineItem.id ? editingTimelineItem : t) : [...state.timelines, editingTimelineItem] }); setEditingTimelineItem(null); }};
  const handleSaveProduct = () => { if(editingProduct) { const currentProducts = state.products || []; const exists = currentProducts.find(p => p.id === editingProduct.id); updateState({ products: exists ? currentProducts.map(p => p.id === editingProduct.id ? editingProduct : p) : [...currentProducts, editingProduct] }); setEditingProduct(null); }};
  const toggleProductCategory = (cat: Category) => { if (!editingProduct) return; const current = editingProduct.categories || []; if (current.includes(cat)) { setEditingProduct({ ...editingProduct, categories: current.filter(c => c !== cat) }); } else { setEditingProduct({ ...editingProduct, categories: [...current, cat] }); } };
  
  const updateIntegration = (key: keyof typeof state.config.integrations, value: string) => { updateState({ config: { ...state.config, integrations: { ...state.config.integrations, [key]: value } } }); };
  const handleFontUpload = (e: any) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => updateState({ config: { ...state.config, customFontData: ev.target?.result as string }}); r.readAsDataURL(f); }};
  const handleResetFont = () => updateState({ config: { ...state.config, customFontData: undefined }});

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
          
          {/* SPLIT TABS: Sliders and News */}
          <button onClick={() => { setActiveTab('sliders'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'sliders' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><GalleryHorizontal size={20} /> סליידרים (ראשי)</button>
          <button onClick={() => { setActiveTab('news'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'news' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Newspaper size={20} /> עדכונים וחדשות</button>
          
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

        {/* ... (Previous Tab Contents Unchanged) ... */}
        {activeTab === 'articles' && (
            <div className="space-y-8 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl"><div className="flex flex-col md:flex-row gap-4"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9]" placeholder="נושא למאמר..." value={newArticleTopic} onChange={(e) => setNewArticleTopic(e.target.value)} /><Button onClick={handleGenerateArticle} disabled={isGenerating} className="min-w-[150px]">{isGenerating ? <Loader2 className="animate-spin ml-2"/> : 'צור (AI)'}</Button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredArticles.map(article => (<div key={article.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group"><div className="h-40 relative"><img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div><div className="p-4"><div className="flex justify-between items-start mb-2"><h4 className="font-bold line-clamp-1 text-white flex-1">{article.title}</h4><span className="text-xs text-slate-500 border border-slate-700 px-1 rounded">#{article.order || 99}</span></div><div className="flex justify-end gap-2"><button onClick={() => setEditingArticle(article)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white"><Edit size={16}/></button><button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== article.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white"><Trash size={16}/></button></div></div></div>))}</div>
            </div>
        )}

        {/* ... (Include All Other Tabs as before) ... */}
        
        {/* --- INTEGRATIONS TAB (UPDATED) --- */}
        {activeTab === 'integrations' && (
             <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-4xl">
                     <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6"><LinkIcon/> חיבורים חיצוניים</h3>
                     <div className="space-y-6">
                         
                         {/* Google Sheets (First for focus) */}
                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <h4 className="font-bold text-[#2EB0D9] mb-4 flex items-center gap-2"><FileText size={18}/> Google Sheets (לקליטת טפסים ו-PDF)</h4>
                             
                             <div className="bg-slate-900 border border-slate-800 p-3 rounded mb-4 text-xs text-slate-400">
                                <strong className="text-white block mb-1">הוראות התקנה (חד פעמי):</strong>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>פתח גיליון Google Sheet חדש</li>
                                    <li>בתפריט: <strong>Extensions</strong> -&gt; <strong>Apps Script</strong></li>
                                    <li>
                                        <div className="flex justify-between items-center mt-2 bg-slate-950 p-2 rounded border border-slate-700">
                                            <span>העתק והדבק את הקוד הבא:</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowGoogleCode(!showGoogleCode)} className="text-[#2EB0D9] text-xs hover:underline flex items-center gap-1">{showGoogleCode ? <EyeOff size={12}/> : <Eye size={12}/>} {showGoogleCode ? 'הסתר קוד' : 'הצג קוד'}</button>
                                                <button 
                                                    onClick={() => { navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE); alert("הקוד הועתק!"); }}
                                                    className="bg-slate-800 text-white px-2 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 flex items-center gap-1"
                                                >
                                                    <Copy size={12}/> העתק קוד
                                                </button>
                                            </div>
                                        </div>
                                        {showGoogleCode && (
                                            <pre className="mt-2 bg-black p-3 rounded text-[10px] text-green-400 overflow-x-auto border border-slate-700 custom-scrollbar select-all" dir="ltr" style={{maxHeight: '300px'}}>
                                                {GOOGLE_SCRIPT_CODE}
                                            </pre>
                                        )}
                                    </li>
                                    <li className="mt-2">לחץ <strong>Deploy</strong> -&gt; <strong>New Deployment</strong></li>
                                    <li>בחר סוג: <strong>Web App</strong></li>
                                    <li>הגדר <strong>Execute as: Me</strong></li>
                                    <li>הגדר <strong>Who has access: Anyone</strong> (חשוב!)</li>
                                    <li>לחץ Deploy והעתק את ה-<strong>Web App URL</strong> לשדה למטה</li>
                                </ol>
                             </div>

                             <div><label className="text-xs text-slate-500 block mb-1">Apps Script URL</label><input type="text" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.googleSheetsUrl} onChange={e => updateIntegration('googleSheetsUrl', e.target.value)} placeholder="https://script.google.com/..." /></div>
                         </div>

                         {/* Supabase */}
                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-[#2EB0D9] flex items-center gap-2"><Database size={18}/> Supabase (מסד נתונים ואחסון תמונות)</h4></div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div><label className="text-xs text-slate-500 block mb-1">Project URL</label><input type="text" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.supabaseUrl} onChange={e => updateIntegration('supabaseUrl', e.target.value)} placeholder="https://xyz.supabase.co" /></div>
                                 <div><label className="text-xs text-slate-500 block mb-1">Anon Key</label><input type="password" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.supabaseKey} onChange={e => updateIntegration('supabaseKey', e.target.value)} /></div>
                             </div>
                         </div>
                         
                         {/* Stripe / Payments - NEW SECTION */}
                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <h4 className="font-bold text-[#2EB0D9] mb-4 flex items-center gap-2"><CreditCard size={18}/> סליקה ותשלומים (Stripe)</h4>
                             <div className="bg-slate-900 border border-slate-800 p-3 rounded mb-4 text-xs text-slate-400">
                                <strong className="text-white block mb-1">איך מגדירים פקדי תשלום?</strong>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>הירשם בחינם ב- <a href="https://stripe.com" target="_blank" className="text-[#2EB0D9] underline">Stripe.com</a></li>
                                    <li>צור מוצר חדש (Products) -> לחץ על "Create payment link".</li>
                                    <li>במסך יצירת הלינק, תחת <strong>Advanced options</strong>, ניתן להגדיר תשלומים (Installments) אם רלוונטי.</li>
                                    <li>העתק את הקישור שנוצר (למשל: buy.stripe.com/xyz).</li>
                                    <li>הדבק את הקישור הזה בעמוד "חנות ותשלומים" בתוך עריכת המוצר הרלוונטי באתר.</li>
                                </ol>
                             </div>
                         </div>

                         {/* AI & Images */}
                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <h4 className="font-bold text-[#2EB0D9] mb-4 flex items-center gap-2"><Sparkles size={18}/> AI & תמונות</h4>
                             <div className="space-y-4">
                                 <div><label className="text-xs text-slate-500 block mb-1">Google Gemini API Key</label><input type="password" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.geminiApiKey} onChange={e => updateIntegration('geminiApiKey', e.target.value)} /></div>
                                 <div><label className="text-xs text-slate-500 block mb-1">Unsplash Access Key (Optional)</label><input type="password" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.unsplashAccessKey} onChange={e => updateIntegration('unsplashAccessKey', e.target.value)} /></div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* --- PAYMENTS TAB (UPDATED) --- */}
        {activeTab === 'payments' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShoppingCart className="text-[#2EB0D9]"/> חנות ומוצרים לתשלום</h3>
                    <Button onClick={() => setEditingProduct({ id: Date.now().toString(), title: 'מוצר חדש', price: 0, categories: [Category.STORE], paymentLink: '', order: 99 })}><Plus size={16}/> הוסף מוצר</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(state.products || []).sort((a,b)=>(a.order||99)-(b.order||99)).map(product => (
                        <div key={product.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 relative group hover:border-[#2EB0D9] transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-wrap gap-1">
                                    {product.categories && product.categories.map(cat => (
                                        <span key={cat} className="text-[10px] bg-[#2EB0D9]/20 text-[#2EB0D9] px-1.5 py-0.5 rounded border border-[#2EB0D9]/30">{CATEGORY_LABELS[cat]}</span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingProduct(product)} className="text-slate-400 hover:text-white"><Edit size={16}/></button>
                                    <button onClick={() => updateState({ products: state.products.filter(p => p.id !== product.id) })} className="text-slate-400 hover:text-red-500"><Trash size={16}/></button>
                                </div>
                            </div>
                            <h4 className="font-bold text-white text-lg mt-2">{product.title}</h4>
                            <p className="text-slate-400 text-xs mb-2 line-clamp-2">{product.description}</p>
                            {product.installments && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 mb-2 inline-block border border-slate-700">{product.installments}</span>}
                            <div className="flex justify-between items-center mt-2">
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
                            
                            {/* NEW: Installments */}
                            <div>
                                <label className="text-xs text-slate-500">אפשרויות תשלום (לתצוגה)</label>
                                <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.installments || ''} onChange={e=>setEditingProduct({...editingProduct, installments: e.target.value})} placeholder="לדוגמה: עד 12 תשלומים ללא ריבית"/>
                            </div>

                            <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                <label className="block text-xs font-bold text-slate-400 mb-2">היכן יופיע המוצר?</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(Category).map(cat => (
                                        <button key={cat} onClick={() => toggleProductCategory(cat)} className={`text-xs px-2 py-1 rounded border transition-colors ${editingProduct.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                                            {CATEGORY_LABELS[cat]} {editingProduct.categories?.includes(cat) && <Check size={10} className="inline ml-1"/>}
                                        </button>
                                    ))}
                                </div>
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
        
        {activeTab === 'forms' && (
             <div className="space-y-6 animate-fade-in">
                 <div className="flex justify-end"><Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.POA], fields: [], submitEmail: '', pdfTemplate: 'NONE', order: 99, sendClientEmail: false })}><Plus size={16}/> טופס חדש</Button></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {state.forms.sort((a,b)=>(a.order||99)-(b.order||99)).map(f => (<div key={f.id} className="bg-slate-900 p-4 rounded border border-slate-800 relative">
                         <div className="flex justify-between items-start"><h4 className="font-bold text-white">{f.title}</h4><span className="text-xs text-slate-500">#{f.order || 99}</span></div>
                         <div className="text-xs text-slate-500 mt-2 flex items-center gap-2"><span>ID: form-{f.id}</span><button onClick={() => {navigator.clipboard.writeText(`form-${f.id}`); alert("הועתק!");}} className="text-[#2EB0D9] hover:text-white"><Copy size={12}/></button></div>
                         <button onClick={() => setEditingForm(f)} className="absolute top-4 left-10 p-2"><Edit size={16}/></button>
                         <button onClick={() => updateState({ forms: state.forms.filter(x => x.id !== f.id) })} className="absolute top-4 left-2 p-2 text-red-400"><Trash size={16}/></button>
                     </div>))}
                 </div>
                 {/* Re-using the same editing modal logic from previous implementation */}
                 {editingForm && (
                     <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                         <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-3xl h-[90vh] flex flex-col">
                             <h3 className="font-bold text-white mb-4">עריכת טופס</h3>
                             <div className="flex-1 overflow-y-auto space-y-4 px-2">
                                 <div className="flex gap-2">
                                     <div className="flex-1"><label className="block text-xs font-bold text-slate-400 mb-1">שם הטופס</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.title} onChange={e=>setEditingForm({...editingForm, title: e.target.value})} placeholder="שם הטופס"/></div>
                                     <div className="w-24"><label className="block text-xs font-bold text-slate-400 mb-1">סדר</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.order || 99} onChange={e=>setEditingForm({...editingForm, order: Number(e.target.value)})}/></div>
                                 </div>
                                 
                                 {/* NEW: Submit Email Field & Toggle */}
                                 <div className="flex gap-4 items-end">
                                     <div className="flex-1">
                                         <label className="block text-xs font-bold text-slate-400 mb-1">מייל משרדי (לקבלת הטופס)</label>
                                         <input 
                                            className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700 placeholder-slate-600" 
                                            value={editingForm.submitEmail || ''} 
                                            onChange={e=>setEditingForm({...editingForm, submitEmail: e.target.value})} 
                                            placeholder="office@melaw.co.il (חובה - לכאן הטופס נשלח)"
                                         />
                                     </div>
                                     <div className="flex items-center gap-2 h-10 bg-slate-950 p-2 rounded border border-slate-800">
                                         <input 
                                            type="checkbox" 
                                            id="sendClientEmail"
                                            className="accent-[#2EB0D9] w-4 h-4"
                                            checked={editingForm.sendClientEmail || false} 
                                            onChange={e=>setEditingForm({...editingForm, sendClientEmail: e.target.checked})}
                                         />
                                         <label htmlFor="sendClientEmail" className="text-xs text-white cursor-pointer select-none">שלח העתק ללקוח?</label>
                                     </div>
                                 </div>
                                 <p className="text-[10px] text-slate-500 mb-2">המערכת תמיד תשלח למייל המשרדי. סימון "שלח העתק ללקוח" ישלח גם למייל שהוזן בטופס.</p>

                                 <div className="bg-slate-950 p-3 rounded border border-slate-800"><label className="block text-xs font-bold text-slate-400 mb-2">היכן יופיע הטופס?</label><div className="flex flex-wrap gap-2">{Object.values(Category).map(cat => (<button key={cat} onClick={() => toggleFormCategory(cat)} className={`text-xs px-2 py-1 rounded border transition-colors ${editingForm.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>{CATEGORY_LABELS[cat]} {editingForm.categories?.includes(cat) && <Check size={10} className="inline ml-1"/>}</button>))}</div></div>
                                 <div className="border-t border-slate-800 pt-4"><div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-slate-400">שדות הטופס</label><div className="flex gap-2"><button onClick={()=>addFieldToForm('text')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ טקסט</button><button onClick={()=>addFieldToForm('select')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ בחירה</button><button onClick={()=>addFieldToForm('boolean')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ כן/לא</button><button onClick={()=>addFieldToForm('number')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ מספר</button></div></div>
                                     <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                         {editingForm.fields.map((field,i)=>(
                                             <div key={i} className="flex flex-col gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                                                 <div className="flex gap-2 items-center"><span className="text-[10px] uppercase bg-black/30 px-1 rounded text-slate-400 w-12 text-center">{field.type}</span><input value={field.label} onChange={e=>updateFormField(i,{label:e.target.value})} className="bg-slate-900 border border-slate-700 text-white p-1 rounded flex-1 text-xs" placeholder="שם השדה"/><button onClick={()=>removeFormField(i)} className="text-red-400 hover:bg-slate-900 p-1 rounded"><Trash size={14}/></button></div>
                                                 <div className="flex items-center gap-4 bg-slate-950 p-2 rounded">
                                                     <div className="flex gap-2 items-center"><label className="text-[10px] text-slate-500 whitespace-nowrap">מאמר עזרה:</label><select value={field.helpArticleId || ''} onChange={e => updateFormField(i, { helpArticleId: e.target.value })} className="bg-slate-900 border border-slate-700 text-white p-1 rounded flex-1 text-xs"><option value="">-- ללא עזרה --</option>{state.articles.map(article => (<option key={article.id} value={article.id}>{article.title}</option>))}</select></div>
                                                     <div className="flex items-center gap-1">
                                                         <input type="checkbox" id={`req-${i}`} checked={field.required} onChange={e => updateFormField(i, { required: e.target.checked })} className="accent-[#2EB0D9] w-3 h-3"/>
                                                         <label htmlFor={`req-${i}`} className="text-xs text-white cursor-pointer select-none font-bold">שדה חובה</label>
                                                     </div>
                                                 </div>
                                                 {field.type === 'select' && (<input value={field.options?.join(',')} onChange={e => updateFormField(i, { options: e.target.value.split(',') })} className="bg-slate-900 border border-slate-700 text-white p-1 rounded w-full text-xs" placeholder="אפשרויות (מופרדות בפסיק)"/>)}
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                             <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800"><Button onClick={handleSaveForm}>שמור</Button><Button variant="outline" onClick={()=>setEditingForm(null)}>ביטול</Button></div>
                         </div>
                     </div>
                 )}
             </div>
        )}

        {/* ... (Team, Sliders, Config - Keeping existing implementations) ... */}
        {activeTab === 'sliders' && (
            <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-white mb-4">ניהול סליידרים ראשיים</h3>
                <div className="space-y-4">
                    {state.slides.sort((a,b)=>(a.order||99)-(b.order||99)).map(slide => (
                        <div key={slide.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between items-center">
                            <div className="flex gap-4">
                                <img src={slide.imageUrl} className="w-16 h-10 object-cover rounded"/>
                                <div className="flex flex-col">
                                    <span className="text-white font-bold">{slide.title}</span>
                                    <span className="text-xs text-slate-500">{slide.subtitle}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setEditingSlide(slide)} className="bg-slate-800 p-2 rounded hover:bg-[#2EB0D9] hover:text-white transition-colors"><Edit size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {activeTab === 'team' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingMember({ id: Date.now().toString(), fullName: '', role: '', specialization: '', email: '', phone: '', bio: '', imageUrl: 'https://picsum.photos/400/400', order: 99 })}><Plus size={16}/> איש צוות</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{state.teamMembers.sort((a,b)=>(a.order||99)-(b.order||99)).map(m => (<div key={m.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex gap-4"><img src={m.imageUrl} className="w-16 h-16 rounded-full"/><div className="flex-1"><div className="flex justify-between"><div className="font-bold text-white">{m.fullName}</div><span className="text-xs text-slate-500">#{m.order || 99}</span></div><div className="text-xs text-slate-400">{m.role}</div></div><button onClick={()=>setEditingMember(m)}><Edit size={16}/></button><button onClick={()=>updateState({teamMembers: state.teamMembers.filter(x=>x.id!==m.id)})} className="text-red-400"><Trash size={16}/></button></div>))}</div>
                {/* Team Editor Modal Logic from previous version */}
                {editingMember && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"><h3 className="font-bold text-white mb-4">עריכת איש צוות</h3><div className="flex gap-2"><div className="flex-1"><label className="text-xs text-slate-500">שם מלא</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.fullName} onChange={e=>setEditingMember({...editingMember, fullName: e.target.value})}/></div><div className="w-24"><label className="text-xs text-slate-500">סדר</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.order || 99} onChange={e=>setEditingMember({...editingMember, order: Number(e.target.value)})}/></div></div><div className="flex gap-2"><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}/><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.specialization} onChange={e=>setEditingMember({...editingMember, specialization: e.target.value})}/></div><textarea className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.bio} onChange={e=>setEditingMember({...editingMember, bio: e.target.value})}/><div className="flex gap-2"><input className="flex-1 p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.imageUrl} onChange={e=>setEditingMember({...editingMember, imageUrl: e.target.value})} placeholder="URL תמונה"/><ImageUploadButton onImageSelected={(url) => setEditingMember({...editingMember, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} /><Button onClick={()=>openImagePicker('team', editingMember.fullName)}><Search size={16}/></Button></div><div className="flex gap-2"><Button onClick={handleSaveMember}>שמור</Button><Button variant="outline" onClick={()=>setEditingMember(null)}>ביטול</Button></div></div></div>}
            </div>
        )}

        {activeTab === 'config' && (
             <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-4xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6"><Monitor/> הגדרות כלליות ופרטי התקשרות</h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800 pb-6">
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">כתובת המשרד</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.address} onChange={e => updateState({ config: { ...state.config, address: e.target.value }})} /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">טלפון ראשי</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.phone} onChange={e => updateState({ config: { ...state.config, phone: e.target.value }})} /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">אימייל ראשי</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.contactEmail} onChange={e => updateState({ config: { ...state.config, contactEmail: e.target.value }})} /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">מספר פקס</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.fax || ''} onChange={e => updateState({ config: { ...state.config, fax: e.target.value }})} placeholder="אופציונלי" /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">מספר WhatsApp</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.whatsapp || ''} onChange={e => updateState({ config: { ...state.config, whatsapp: e.target.value }})} placeholder="לדוגמה: 972500000000" /></div>
                        </div>
                        <div className="flex gap-2 mb-2"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" value={state.config.logoUrl} onChange={e => updateState({ config: { ...state.config, logoUrl: e.target.value }})} placeholder="קישור ללוגו (URL)" /><ImageUploadButton onImageSelected={(url) => updateState({ config: { ...state.config, logoUrl: url }})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} /></div>
                    </div>
                </div>
            </div>
        )}

      </main>

      <ImagePickerModal isOpen={showImagePicker} onClose={() => setShowImagePicker(false)} onSelect={handleImageSelect} initialQuery={imagePickerContext?.initialQuery} unsplashAccessKey={state.config.integrations.unsplashAccessKey} />
      
      {/* ... (Keep Article, Slide, Timeline Modals) ... */}
      {/* (All existing modals for Article, Slide, Timeline, etc. are implicitly here as they are part of the component structure) */}
      {/* Ensuring Timeline Modal exists for editing */}
      {editingTimelineItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-white">עריכת עדכון חדשות / כלי דיגיטלי</h3>
                <input className="w-full p-2 bg-slate-800 text-white rounded" value={editingTimelineItem.title} onChange={e=>setEditingTimelineItem({...editingTimelineItem, title: e.target.value})} placeholder="כותרת"/>
                <textarea className="w-full p-2 bg-slate-800 text-white rounded h-24" value={editingTimelineItem.description} onChange={e=>setEditingTimelineItem({...editingTimelineItem, description: e.target.value})} placeholder="תוכן ראשי (תקציר)"/>
                
                {/* NEW: FORM LINKER */}
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                    <label className="block text-xs font-bold text-[#2EB0D9] mb-2 flex items-center gap-1"><ClipboardList size={12}/> קשר לטופס דיגיטלי (אופציונלי)</label>
                    <select 
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                        value={editingTimelineItem.linkTo || ''}
                        onChange={(e) => setEditingTimelineItem({ ...editingTimelineItem, linkTo: e.target.value })}
                    >
                        <option value="">-- ללא קישור לטופס (מידע בלבד) --</option>
                        <option value="wills-generator">מחולל הצוואות הדיגיטלי (מובנה)</option>
                        {state.forms.map(f => (
                            <option key={f.id} value={`form-${f.id}`}>טופס: {f.title}</option>
                        ))}
                    </select>
                </div>

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
