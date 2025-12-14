
import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, Product, CATEGORY_LABELS, CalculatorDefinition, TaxScenario, TaxBracket } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; 
import { ImageUploadButton } from '../components/ImageUploadButton.tsx'; 
import { emailService, cloudService } from '../services/api.ts'; 
import { dbService } from '../services/supabase.ts';
import { Settings, Layout, FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Link as LinkIcon, Copy, Users, Check, Monitor, Sun, Moon, Database, Type, Menu, Download, Upload, AlertTriangle, CloudUpload, CloudOff, Search, Save, Cloud, HelpCircle, ChevronDown, ChevronUp, Lock, File, Shield, Key, ShoppingCart, Newspaper, Image as ImageIcon, ArrowUp, GalleryHorizontal, Phone, MessageCircle, Printer, Mail, MapPin, Eye, EyeOff, CreditCard, Palette, Home, CheckCircle, Calculator, List, ToggleRight, Hash, AtSign } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
  version?: string; // Kept for compatibility but ignored
}

// --- PUBLIC KEYS FALLBACK (For Image Uploads) ---
const FALLBACK_SUPABASE_URL = 'https://kqjmwwjafypkswkkbncc.supabase.co'; 
const FALLBACK_SUPABASE_KEY = 'sb_publishable_ftgAGUontmVJ-BfgzfQJsA_n7npD__t';

// --- UPDATED GOOGLE APPS SCRIPT CODE (With Dynamic Column Mapping) ---
const GOOGLE_SCRIPT_CODE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(20000); 

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    var action = data.action;

    if (action === 'submitForm') {
      var sheetName = data.targetSheet || 'DATA';
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(['Timestamp', 'ID', 'Form Name']); 
      }

      // --- DYNAMIC COLUMN MAPPING ---
      // 1. Get current headers
      var lastCol = sheet.getLastColumn();
      var headers = [];
      if (lastCol > 0) {
        headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      } else {
        headers = ['Timestamp', 'ID', 'Form Name'];
        sheet.appendRow(headers);
        lastCol = 3;
      }

      // 2. Identify keys in incoming data that are NOT metadata
      var metadataKeys = ['action','targetSheet','templateSheet','formName','submittedAt','submissionId','officeEmail','clientEmail','sendClientCopy','customEmailSubject','customEmailBody'];
      var dataKeys = [];
      for (var key in data) {
        if (metadataKeys.indexOf(key) === -1) {
           dataKeys.push(key);
        }
      }

      // 3. Update headers if new keys are found
      var headerMap = {};
      for (var i = 0; i < headers.length; i++) headerMap[headers[i]] = i;

      var newHeaders = [];
      for (var i = 0; i < dataKeys.length; i++) {
        var key = dataKeys[i];
        if (headerMap[key] === undefined) {
           newHeaders.push(key);
           headers.push(key); 
           headerMap[key] = headers.length - 1; 
        }
      }

      if (newHeaders.length > 0) {
         sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
      }

      // 4. Construct Row Data aligned with headers
      var rowValues = [];
      for (var i = 0; i < headers.length; i++) {
         var header = headers[i];
         if (header === 'Timestamp') {
             rowValues.push(new Date());
         } else if (header === 'ID') {
             rowValues.push(data.submissionId || 'N/A');
         } else if (header === 'Form Name') {
             rowValues.push(data.formName);
         } else {
             var val = data[header];
             // If empty, leave empty string (or 0 if preferred, using "" for clean look)
             rowValues.push((val !== undefined && val !== null) ? val : "");
         }
      }

      sheet.appendRow(rowValues);
      
      SpreadsheetApp.flush(); 
      Utilities.sleep(3000); 

      // 5. PDF Generation
      var attachments = [];
      if (data.templateSheet === 'WILL') {
         var willSheet = ss.getSheetByName('WILL');
         if (willSheet) {
             var pdfBlob = exportSheetToPdf(ss.getId(), willSheet.getSheetId(), "צוואה_" + (data.submissionId || ''));
             if (pdfBlob) attachments.push(pdfBlob);
         }
      } 
      
      if (attachments.length === 0) {
          var html = "<html><body style='font-family: Arial; direction: rtl; text-align: right;'>";
          html += "<h1 style='color: #2EB0D9;'>" + data.formName + "</h1>";
          html += "<div><strong>אסמכתא:</strong> " + (data.submissionId || 'N/A') + "</div><hr>";
          for (var i = 0; i < headers.length; i++) {
             if (['Timestamp', 'ID', 'Form Name'].indexOf(headers[i]) === -1) {
                 var val = data[headers[i]];
                 if (val) html += "<p><strong>" + headers[i] + ":</strong> " + val + "</p>";
             }
          }
          html += "</body></html>";
          var genericPdf = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF).setName(data.formName + ".pdf");
          attachments.push(genericPdf);
      }

      // 6. Send Emails
      var subject = data.customEmailSubject || ("טופס חדש: " + data.formName);
      var body = data.customEmailBody || "<p>התקבל טופס חדש. מצורף קובץ.</p>";
      body = "<div style='direction: rtl; text-align: right; font-family: Arial;'>" + body + "</div>";

      if (data.officeEmail) {
          try { MailApp.sendEmail({ to: data.officeEmail, subject: subject, htmlBody: body, attachments: attachments }); } catch(e){}
      }
      if ((data.sendClientCopy === true || data.sendClientCopy === "true") && data.clientEmail) {
          try { MailApp.sendEmail({ to: data.clientEmail, subject: subject, htmlBody: body, attachments: attachments }); } catch(e){}
      }

      return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'saveState') {
       var configSheet = ss.getSheetByName('SiteConfig');
       if (!configSheet) configSheet = ss.insertSheet('SiteConfig');
       configSheet.clear();
       configSheet.getRange(1, 1).setValue(JSON.stringify(data.data));
       return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'uploadImage') {
         return ContentService.createTextOutput(JSON.stringify({status: 'success', url: 'mock_url'})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function exportSheetToPdf(spreadsheetId, sheetId, filename) {
  try {
    var token = ScriptApp.getOAuthToken();
    var url = "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export?";
    var opts = { format: 'pdf', size: 'A4', portrait: true, fitw: true, gid: sheetId, gridlines: false, attachment: true };
    var params = [];
    for (var name in opts) params.push(name + "=" + opts[name]);
    return UrlFetchApp.fetch(url + params.join("&"), { headers: { 'Authorization': 'Bearer ' + token } }).getBlob().setName(filename + ".pdf");
  } catch (e) { return null; }
}`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'integrations' | 'articles' | 'news' | 'sliders' | 'forms' | 'calculators' | 'team' | 'payments'>('articles');
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
  const [editingCalculator, setEditingCalculator] = useState<CalculatorDefinition | null>(null); 
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
      
      const now = new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
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
             // Handle Slider Migration logic here as well
             if (newData.slides) {
                 newData.slides = newData.slides.map((s: any) => {
                     if (!s.categories && s.category) return { ...s, categories: [s.category] };
                     return s;
                 });
             }

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
             alert(`הנתונים נטענו בהצלחה! (עדכון אחרון: ${newData.lastUpdated || 'לא ידוע'})`);
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
  
  // ARTICLE TABS LOGIC
  const addArticleTab = () => { if(editingArticle) setEditingArticle({...editingArticle, tabs: [...editingArticle.tabs, { title: 'כותרת חדשה', content: '' }]}); };
  const updateArticleTab = (index: number, field: 'title' | 'content', val: string) => { 
      if(editingArticle) { 
          const newTabs = [...editingArticle.tabs]; 
          newTabs[index] = { ...newTabs[index], [field]: val }; 
          setEditingArticle({...editingArticle, tabs: newTabs}); 
      }
  };
  const removeArticleTab = (index: number) => { if(editingArticle) setEditingArticle({...editingArticle, tabs: editingArticle.tabs.filter((_, i) => i !== index)}); };
  const toggleArticleCategory = (cat: Category) => { if (!editingArticle) return; const current = editingArticle.categories || []; if (current.includes(cat)) { setEditingArticle({ ...editingArticle, categories: current.filter(c => c !== cat) }); } else { setEditingArticle({ ...editingArticle, categories: [...current, cat] }); } };

  const handleImageSelect = (url: string) => {
      if (!imagePickerContext) return;
      if (imagePickerContext.type === 'article' && editingArticle) setEditingArticle({ ...editingArticle, imageUrl: url });
      else if (imagePickerContext.type === 'slide' && editingSlide) setEditingSlide({ ...editingSlide, imageUrl: url });
      else if (imagePickerContext.type === 'team' && editingMember) setEditingMember({ ...editingMember, imageUrl: url });
      else if (imagePickerContext.type === 'timeline' && editingTimelineItem) setEditingTimelineItem({ ...editingTimelineItem, imageUrl: url });
      setShowImagePicker(false);
  };
  const openImagePicker = (type: any, initialQuery: string) => { setImagePickerContext({ type, initialQuery }); setShowImagePicker(true); };
  
  // Forms logic
  const handleSaveForm = () => { if(editingForm && editingForm.title) { const exists = state.forms.find(f => f.id === editingForm.id); updateState({ forms: exists ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] }); setEditingForm(null); }};
  const addFieldToForm = (type: FieldType) => { if(editingForm) setEditingForm({ ...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type, label: 'שדה חדש', required: false, options: type === 'select' ? ['אפשרות 1'] : undefined }] }); };
  const updateFormField = (index: number, updates: Partial<FormField>) => { if(editingForm) { const f = [...editingForm.fields]; f[index] = { ...f[index], ...updates }; setEditingForm({ ...editingForm, fields: f }); }};
  const removeFormField = (index: number) => { if(editingForm) setEditingForm({ ...editingForm, fields: editingForm.fields.filter((_, i) => i !== index) }); };
  const toggleFormCategory = (cat: Category) => { if (!editingForm) return; const current = editingForm.categories || []; if (current.includes(cat)) { setEditingForm({ ...editingForm, categories: current.filter(c => c !== cat) }); } else { setEditingForm({ ...editingForm, categories: [...current, cat] }); } };

  // Calculator Logic
  const handleSaveCalculator = () => { if(editingCalculator && editingCalculator.title) { const calculators = state.calculators || []; const exists = calculators.find(c => c.id === editingCalculator.id); updateState({ calculators: exists ? calculators.map(c => c.id === editingCalculator.id ? editingCalculator : c) : [...calculators, editingCalculator] }); setEditingCalculator(null); }};
  const toggleCalculatorCategory = (cat: Category) => { if (!editingCalculator) return; const current = editingCalculator.categories || []; if (current.includes(cat)) { setEditingCalculator({ ...editingCalculator, categories: current.filter(c => c !== cat) }); } else { setEditingCalculator({ ...editingCalculator, categories: [...current, cat] }); } };
  const addScenario = () => { if(editingCalculator) { setEditingCalculator({ ...editingCalculator, scenarios: [...editingCalculator.scenarios, { id: Date.now().toString(), title: 'תרחיש חדש', brackets: [] }] }); }};
  const updateScenario = (index: number, updates: Partial<TaxScenario>) => { if(editingCalculator) { const s = [...editingCalculator.scenarios]; s[index] = { ...s[index], ...updates }; setEditingCalculator({ ...editingCalculator, scenarios: s }); }};
  const removeScenario = (index: number) => { if(editingCalculator) setEditingCalculator({ ...editingCalculator, scenarios: editingCalculator.scenarios.filter((_, i) => i !== index) }); };
  const addBracket = (scenarioIndex: number) => { if(editingCalculator) { const s = [...editingCalculator.scenarios]; s[scenarioIndex].brackets.push({ id: Date.now().toString(), threshold: 0, rate: 0 }); setEditingCalculator({ ...editingCalculator, scenarios: s }); }};
  const updateBracket = (scenarioIndex: number, bracketIndex: number, updates: Partial<TaxBracket>) => { if(editingCalculator) { const s = [...editingCalculator.scenarios]; const b = [...s[scenarioIndex].brackets]; b[bracketIndex] = { ...b[bracketIndex], ...updates }; s[scenarioIndex].brackets = b; setEditingCalculator({ ...editingCalculator, scenarios: s }); }};
  const removeBracket = (scenarioIndex: number, bracketIndex: number) => { if(editingCalculator) { const s = [...editingCalculator.scenarios]; s[scenarioIndex].brackets = s[scenarioIndex].brackets.filter((_, i) => i !== bracketIndex); setEditingCalculator({ ...editingCalculator, scenarios: s }); }};

  const handleSaveMember = () => { if(editingMember) { const exists = state.teamMembers.find(m => m.id === editingMember.id); updateState({ teamMembers: exists ? state.teamMembers.map(m => m.id === editingMember.id ? editingMember : m) : [...state.teamMembers, editingMember] }); setEditingMember(null); }};
  
  // SLIDER LOGIC
  const handleSaveSlide = () => { if(editingSlide) { const exists = state.slides.find(s => s.id === editingSlide.id); updateState({ slides: exists ? state.slides.map(s => s.id === editingSlide.id ? editingSlide : s) : [...state.slides, editingSlide] }); setEditingSlide(null); }};
  const toggleSlideCategory = (cat: Category) => { if (!editingSlide) return; const current = editingSlide.categories || []; if (current.includes(cat)) { setEditingSlide({ ...editingSlide, categories: current.filter(c => c !== cat) }); } else { setEditingSlide({ ...editingSlide, categories: [...current, cat] }); } };

  // TIMELINE LOGIC
  const handleSaveTimelineItem = () => { if(editingTimelineItem) { const exists = state.timelines.find(t => t.id === editingTimelineItem.id); updateState({ timelines: exists ? state.timelines.map(t => t.id === editingTimelineItem.id ? editingTimelineItem : t) : [...state.timelines, editingTimelineItem] }); setEditingTimelineItem(null); }};
  const toggleTimelineCategory = (cat: Category) => { if (!editingTimelineItem) return; const current = editingTimelineItem.category || []; if (current.includes(cat)) { setEditingTimelineItem({ ...editingTimelineItem, category: current.filter(c => c !== cat) }); } else { setEditingTimelineItem({ ...editingTimelineItem, category: [...current, cat] }); } };

  const handleSaveProduct = () => { if(editingProduct) { const currentProducts = state.products || []; const exists = currentProducts.find(p => p.id === editingProduct.id); updateState({ products: exists ? currentProducts.map(p => p.id === editingProduct.id ? editingProduct : p) : [...currentProducts, editingProduct] }); setEditingProduct(null); }};
  const toggleProductCategory = (cat: Category) => { if (!editingProduct) return; const current = editingProduct.categories || []; if (current.includes(cat)) { setEditingProduct({ ...editingProduct, categories: current.filter(c => c !== cat) }); } else { setEditingProduct({ ...editingProduct, categories: [...current, cat] }); } };
  
  const updateIntegration = (key: keyof typeof state.config.integrations, value: string) => { updateState({ config: { ...state.config, integrations: { ...state.config.integrations, [key]: value } } }); };
  
  const filteredArticles = state.articles.filter(a => selectedCategory === 'ALL' || a.categories.includes(selectedCategory)).sort((a,b) => (a.order || 99) - (b.order || 99));
  
  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 overflow-hidden relative">
      <aside className={`fixed h-full right-0 z-50 w-64 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div><h2 className="text-2xl font-bold text-white"><span className="text-[#2EB0D9]">Me</span>Law Admin</h2>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}><X/></button>
        </div>
        <div className="p-4 border-b border-slate-800 space-y-2">
             <div className="text-center mb-2">
                 {isCloudConnected ? <span className="text-xs text-green-500 flex items-center justify-center gap-1 font-bold"><CloudUpload size={12}/> מחובר לענן</span> : <span className="text-xs text-red-500 flex items-center justify-center gap-1 font-bold animate-pulse"><CloudOff size={12}/> ענן לא מחובר</span>}
             </div>
             <Button onClick={handleSaveToCloud} className={`w-full flex items-center justify-center gap-2 font-bold shine-effect ${isSavingToCloud ? 'opacity-70 cursor-wait' : ''}`} variant={isCloudConnected ? "secondary" : "outline"} disabled={isSavingToCloud}>
                 {isSavingToCloud ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} {isSavingToCloud ? 'שומר...' : 'שמור לענן'}
             </Button>
             <div className="text-center text-[10px] text-slate-500 mt-1">עדכון אחרון: {state.lastUpdated}</div>
             <Button onClick={handleLoadFromCloud} className={`w-full flex items-center justify-center gap-2 font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 ${isLoadingFromCloud ? 'opacity-70 cursor-wait' : ''}`} disabled={isLoadingFromCloud}>
                 {isLoadingFromCloud ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />} {isLoadingFromCloud ? 'טוען...' : 'טען מהענן'}
             </Button>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <button onClick={() => { setActiveTab('articles'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'articles' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><FileText size={20} /> מאמרים</button>
          <button onClick={() => { setActiveTab('sliders'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'sliders' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><GalleryHorizontal size={20} /> סליידרים (ראשי)</button>
          <button onClick={() => { setActiveTab('news'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'news' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Newspaper size={20} /> עדכונים וחדשות</button>
          <button onClick={() => { setActiveTab('forms'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><ClipboardList size={20} /> טפסים</button>
          <button onClick={() => { setActiveTab('calculators'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'calculators' ? 'bg-[#2EB0D9] text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><Calculator size={20} /> מחשבונים</button>
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

        {/* Sliders Tab */}
        {activeTab === 'sliders' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingSlide({ id: Date.now().toString(), imageUrl: '', title: 'כותרת חדשה', subtitle: 'תת כותרת', categories: [Category.HOME], order: 99 })}><Plus size={18} className="ml-2"/> סלייד חדש</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{state.slides.sort((a,b)=>(a.order||99)-(b.order||99)).map(slide => (<div key={slide.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg group"><div className="h-48 relative"><img src={slide.imageUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-4"><h4 className="font-bold text-white text-lg">{slide.title}</h4><div className="flex gap-1 mt-1 flex-wrap">{slide.categories?.map(c => <span key={c} className="text-xs bg-[#2EB0D9] text-white px-2 py-0.5 rounded">{CATEGORY_LABELS[c]}</span>)}</div></div></div><div className="p-4 flex justify-between items-center bg-slate-950 border-t border-slate-800"><div className="text-xs text-slate-500">סדר: {slide.order || 99}</div><div className="flex gap-2"><button onClick={() => setEditingSlide(slide)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded text-white"><Edit size={16}/></button><button onClick={() => updateState({ slides: state.slides.filter(s => s.id !== slide.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded text-white"><Trash size={16}/></button></div></div></div>))}</div>
            </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
            <div className="space-y-8 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl"><div className="flex flex-col md:flex-row gap-4"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9]" placeholder="נושא למאמר..." value={newArticleTopic} onChange={(e) => setNewArticleTopic(e.target.value)} /><Button onClick={handleGenerateArticle} disabled={isGenerating} className="min-w-[150px]">{isGenerating ? <Loader2 className="animate-spin ml-2"/> : 'צור (AI)'}</Button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredArticles.map(article => (<div key={article.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group"><div className="h-40 relative"><img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div><div className="p-4"><div className="flex justify-between items-start mb-2"><h4 className="font-bold line-clamp-1 text-white flex-1">{article.title}</h4><span className="text-xs text-slate-500 border border-slate-700 px-1 rounded">#{article.order || 99}</span></div><div className="flex justify-end gap-2"><button onClick={() => setEditingArticle(article)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white"><Edit size={16}/></button><button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== article.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white"><Trash size={16}/></button></div></div></div>))}</div>
            </div>
        )}
        
        {/* News & Updates Tab */}
        {activeTab === 'news' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingTimelineItem({ id: Date.now().toString(), title: 'עדכון חדש', description: '', imageUrl: '', category: [Category.HOME], order: 99 })}><Plus size={18} className="ml-2"/> עדכון חדש</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {state.timelines.sort((a,b)=>(a.order||99)-(b.order||99)).map(item => (
                        <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
                            <div className="h-40 relative bg-slate-800">
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><Newspaper size={40}/></div>}
                                <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end">{item.category?.map(c => <span key={c} className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded">{CATEGORY_LABELS[c]}</span>)}</div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h4 className="font-bold text-white text-lg mb-2 line-clamp-2">{item.title}</h4>
                                <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1">{item.description}</p>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                    <div className="text-xs text-slate-500">סדר: {item.order || 99}</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingTimelineItem(item)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white transition-colors"><Edit size={16}/></button>
                                        <button onClick={() => updateState({ timelines: state.timelines.filter(t => t.id !== item.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white transition-colors"><Trash size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {/* Forms Tab */}
        {activeTab === 'forms' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.HOME], fields: [], submitEmail: '', sendClientEmail: true, order: 99 })}><Plus size={18} className="ml-2"/> טופס חדש</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{state.forms.map(form => (<div key={form.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-lg"><div className="flex justify-between items-start"><div><h4 className="font-bold text-white text-lg">{form.title}</h4><div className="flex flex-wrap gap-1 mt-1">{form.categories?.map(c => <span key={c} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">{CATEGORY_LABELS[c]}</span>)}</div></div><div className="flex gap-2"><button onClick={() => setEditingForm(form)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white transition-colors"><Edit size={16}/></button><button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white transition-colors"><Trash size={16}/></button></div></div><div className="text-xs text-slate-500 bg-slate-950 p-2 rounded border border-slate-800 mt-auto flex justify-between"><span>{form.fields.length} שדות</span><span>#{form.order || 99}</span></div></div>))}</div>
            </div>
        )}

        {/* Calculators Tab */}
        {activeTab === 'calculators' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingCalculator({ id: Date.now().toString(), title: 'מחשבון מס חדש', categories: [Category.REAL_ESTATE], scenarios: [] })}><Plus size={18} className="ml-2"/> מחשבון חדש</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(state.calculators || []).map(calc => (
                        <div key={calc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-white text-xl flex items-center gap-2"><Calculator size={20} className="text-[#2EB0D9]"/> {calc.title}</h4>
                                    <div className="flex flex-wrap gap-1 mt-2">{calc.categories?.map(c => <span key={c} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">{CATEGORY_LABELS[c]}</span>)}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingCalculator(calc)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white transition-colors"><Edit size={16}/></button>
                                    <button onClick={() => updateState({ calculators: (state.calculators || []).filter(c => c.id !== calc.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white transition-colors"><Trash size={16}/></button>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500">סדר הופעה: {calc.order || 99}</div>
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mt-2">
                                <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">תרחישים מוגדרים</h5>
                                {calc.scenarios.length > 0 ? (
                                    <ul className="space-y-1">
                                        {calc.scenarios.map(sc => (
                                            <li key={sc.id} className="text-sm text-slate-300 flex justify-between">
                                                <span>{sc.title}</span>
                                                <span className="text-slate-500">{sc.brackets.length} מדרגות</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-slate-600 italic">לא הוגדרו תרחישים.</p>}
                            </div>
                        </div>
                    ))}
                    {(state.calculators || []).length === 0 && <p className="text-slate-500 col-span-2 text-center py-10">לא קיימים מחשבונים במערכת.</p>}
                </div>
            </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingMember({ id: Date.now().toString(), fullName: 'חבר צוות חדש', role: 'תפקיד', specialization: '', email: '', phone: '', imageUrl: '', bio: '', order: 99 })}><Plus size={18} className="ml-2"/> הוסף חבר צוות</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{state.teamMembers.sort((a,b)=>(a.order||99)-(b.order||99)).map(member => (
                    <div key={member.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col md:flex-row gap-4 p-4 items-center md:items-start shadow-md">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 border-2 border-slate-700">
                            <img src={member.imageUrl} className="w-full h-full object-cover" alt={member.fullName} />
                        </div>
                        <div className="flex-1 text-center md:text-right">
                            <h4 className="font-bold text-white text-lg">{member.fullName}</h4>
                            <p className="text-[#2EB0D9] text-sm font-medium">{member.role}</p>
                            <p className="text-slate-500 text-xs mt-1">{member.specialization}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setEditingMember(member)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white border border-slate-700 transition-colors"><Edit size={16}/></button>
                            <button onClick={() => updateState({ teamMembers: state.teamMembers.filter(m => m.id !== member.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white border border-slate-700 transition-colors"><Trash size={16}/></button>
                        </div>
                    </div>
                ))}</div>
            </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end"><Button onClick={() => setEditingProduct({ id: Date.now().toString(), title: 'מוצר חדש', price: 0, categories: [Category.STORE], paymentLink: '', order: 99 })}><Plus size={18} className="ml-2"/> הוסף מוצר לחנות</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(state.products || []).sort((a,b)=>(a.order||99)-(b.order||99)).map(product => (
                        <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg group">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-slate-800 rounded text-[#2EB0D9]"><ShoppingCart size={20}/></div>
                                <div className="text-xs text-slate-500 font-bold bg-slate-950 px-2 py-1 rounded">₪{product.price}</div>
                            </div>
                            <h4 className="font-bold text-white text-lg line-clamp-1">{product.title}</h4>
                            <p className="text-slate-400 text-sm line-clamp-2 flex-1">{product.description}</p>
                            <div className="flex gap-1 flex-wrap mt-2">
                                {product.categories?.map(c => <span key={c} className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">{CATEGORY_LABELS[c]}</span>)}
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
                                <span className="text-[10px] text-slate-600">ID: {product.id}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingProduct(product)} className="p-1.5 bg-slate-800 hover:bg-[#2EB0D9] rounded text-white transition-colors"><Edit size={14}/></button>
                                    <button onClick={() => updateState({ products: (state.products || []).filter(p => p.id !== product.id) })} className="p-1.5 bg-slate-800 hover:bg-red-500 rounded text-white transition-colors"><Trash size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
             <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-4xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6"><Monitor/> הגדרות כלליות ופרטי התקשרות</h3>
                    <div className="space-y-6">
                        {/* Config fields... */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800 pb-6">
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">כתובת המשרד</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.address} onChange={e => updateState({ config: { ...state.config, address: e.target.value }})} /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">טלפון ראשי</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.phone} onChange={e => updateState({ config: { ...state.config, phone: e.target.value }})} /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">אימייל ראשי</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.contactEmail} onChange={e => updateState({ config: { ...state.config, contactEmail: e.target.value }})} /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">מספר פקס</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.fax || ''} onChange={e => updateState({ config: { ...state.config, fax: e.target.value }})} placeholder="אופציונלי" /></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400">מספר WhatsApp</label><input className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.whatsapp || ''} onChange={e => updateState({ config: { ...state.config, whatsapp: e.target.value }})} placeholder="לדוגמה: 972500000000" /></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800 pb-6">
                            <div><label className="block text-xs font-bold mb-1 text-slate-400 flex items-center gap-1"><Palette size={12}/> ערכת נושא (Theme)</label><select className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.theme} onChange={e => updateState({ config: { ...state.config, theme: e.target.value as 'dark'|'light' }})}><option value="dark">כהה (Dark Mode)</option><option value="light">בהיר (Light Mode)</option></select></div>
                            <div><label className="block text-xs font-bold mb-1 text-slate-400 flex items-center gap-1"><Home size={12}/> עמוד הבית (קטגוריה ראשית)</label><select className="w-full p-2 border border-slate-700 rounded bg-slate-950 text-white" value={state.config.defaultCategory} onChange={e => updateState({ config: { ...state.config, defaultCategory: e.target.value as Category }})}>{Object.values(Category).map(cat => (<option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>))}</select></div>
                        </div>

                        <div className="flex gap-2 mb-2"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white" value={state.config.logoUrl} onChange={e => updateState({ config: { ...state.config, logoUrl: e.target.value }})} placeholder="קישור ללוגו (URL)" /><ImageUploadButton onImageSelected={(url) => updateState({ config: { ...state.config, logoUrl: url }})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} /></div>
                    </div>
                </div>
            </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
             <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 max-w-4xl">
                     <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6"><LinkIcon/> חיבורים חיצוניים</h3>
                     <div className="space-y-6">
                         {/* Integration settings... */}
                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <h4 className="font-bold text-[#2EB0D9] mb-4 flex items-center gap-2"><FileText size={18}/> Google Sheets (לקליטת טפסים ו-PDF)</h4>
                             
                             <div className="bg-slate-900 border border-slate-800 p-3 rounded mb-4 text-xs text-slate-400">
                                <strong className="text-white block mb-1">הוראות התקנה:</strong>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>פתח גיליון Google Sheet חדש</li>
                                    <li>בתפריט: <strong>Extensions</strong> -&gt; <strong>Apps Script</strong></li>
                                    <li>
                                        <div className="flex justify-between items-center mt-2 bg-slate-950 p-2 rounded border border-slate-700">
                                            <span>העתק והדבק את הקוד הבא:</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowGoogleCode(!showGoogleCode)} className="text-[#2EB0D9] text-xs hover:underline flex items-center gap-1">{showGoogleCode ? <EyeOff size={12}/> : <Eye size={12}/>} {showGoogleCode ? 'הסתר קוד' : 'הצג קוד'}</button>
                                                <button onClick={() => { navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE); alert("הקוד הועתק!"); }} className="bg-slate-800 text-white px-2 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 flex items-center gap-1"><Copy size={12}/> העתק קוד</button>
                                            </div>
                                        </div>
                                        {showGoogleCode && <pre className="mt-2 bg-black p-3 rounded text-[10px] text-green-400 overflow-x-auto border border-slate-700 custom-scrollbar select-all" dir="ltr" style={{maxHeight: '300px'}}>{GOOGLE_SCRIPT_CODE}</pre>}
                                    </li>
                                    <li className="mt-2">לחץ <strong>Deploy</strong> -&gt; <strong>New Deployment</strong></li>
                                    <li>בחר סוג: <strong>Web App</strong>, Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong></li>
                                    <li>העתק את ה-URL לשדה למטה</li>
                                </ol>
                             </div>

                             <div><label className="text-xs text-slate-500 block mb-1">Apps Script URL</label><input type="text" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.googleSheetsUrl} onChange={e => updateIntegration('googleSheetsUrl', e.target.value)} placeholder="https://script.google.com/..." /></div>
                         </div>
                         
                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <div className="flex justify-between items-center mb-4"><h4 className="font-bold text-[#2EB0D9] flex items-center gap-2"><Database size={18}/> Supabase</h4></div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div><label className="text-xs text-slate-500 block mb-1">Project URL</label><input type="text" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.supabaseUrl} onChange={e => updateIntegration('supabaseUrl', e.target.value)} /></div>
                                 <div><label className="text-xs text-slate-500 block mb-1">Anon Key</label><input type="password" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.supabaseKey} onChange={e => updateIntegration('supabaseKey', e.target.value)} /></div>
                             </div>
                         </div>
                         
                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <h4 className="font-bold text-[#2EB0D9] mb-4 flex items-center gap-2"><CreditCard size={18}/> סליקה (Stripe)</h4>
                             <div className="bg-slate-900 border border-slate-800 p-3 rounded mb-4 text-xs text-slate-400">
                                <strong className="text-white block mb-1">איך מגדירים?</strong>
                                יצירת מוצר ב-Stripe &rarr; יצירת Payment Link &rarr; הדבקת הלינק בעריכת המוצר.
                             </div>
                         </div>

                         <div className="p-4 border border-slate-700 rounded-lg bg-slate-950">
                             <h4 className="font-bold text-[#2EB0D9] mb-4 flex items-center gap-2"><Sparkles size={18}/> AI & תמונות</h4>
                             <div className="space-y-4">
                                 <div><label className="text-xs text-slate-500 block mb-1">Gemini API Key</label><input type="password" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.geminiApiKey} onChange={e => updateIntegration('geminiApiKey', e.target.value)} /></div>
                                 <div><label className="text-xs text-slate-500 block mb-1">Unsplash Access Key</label><input type="password" className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 text-xs" value={state.config.integrations.unsplashAccessKey} onChange={e => updateIntegration('unsplashAccessKey', e.target.value)} /></div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        )}

      </main>

      <ImagePickerModal isOpen={showImagePicker} onClose={() => setShowImagePicker(false)} onSelect={handleImageSelect} initialQuery={imagePickerContext?.initialQuery} unsplashAccessKey={state.config.integrations.unsplashAccessKey} />
      
      {/* --- MODALS --- */}
      
      {/* IMPROVED FORM BUILDER MODAL */}
      {editingForm && (
         <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
             <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                 
                 {/* Header */}
                 <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                     <h3 className="font-bold text-white text-xl flex items-center gap-2"><ClipboardList className="text-[#2EB0D9]"/> בניית טופס חדש</h3>
                     <div className="flex gap-2">
                         <Button onClick={handleSaveForm} size="sm" className="bg-[#2EB0D9] hover:bg-[#259cc0] text-white"><Save size={16} className="ml-2"/> שמור טופס</Button>
                         <button onClick={()=>setEditingForm(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                     </div>
                 </div>

                 <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                     {/* Sidebar - General Settings */}
                     <div className="w-full md:w-1/3 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto space-y-6">
                         <div className="space-y-4">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">הגדרות כלליות</h4>
                             <div>
                                 <label className="block text-xs font-bold text-slate-300 mb-1">שם הטופס (כותרת)</label>
                                 <input className="w-full p-2 bg-slate-950 text-white rounded border border-slate-700 focus:border-[#2EB0D9] outline-none" value={editingForm.title} onChange={e=>setEditingForm({...editingForm, title: e.target.value})} placeholder="למשל: שאלון קליטת לקוח"/>
                             </div>
                             <div className="flex gap-2">
                                 <div className="flex-1">
                                     <label className="block text-xs font-bold text-slate-300 mb-1">סדר הופעה</label>
                                     <input type="number" className="w-full p-2 bg-slate-950 text-white rounded border border-slate-700" value={editingForm.order || 99} onChange={e=>setEditingForm({...editingForm, order: Number(e.target.value)})}/>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-300 mb-1">אימייל לקבלת הטופס</label>
                                 <input className="w-full p-2 bg-slate-950 text-white rounded border border-slate-700 text-xs" value={editingForm.submitEmail || ''} onChange={e=>setEditingForm({...editingForm, submitEmail: e.target.value})} placeholder="office@melaw.co.il"/>
                             </div>
                             <div className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800">
                                 <input type="checkbox" id="sendClientEmail" className="accent-[#2EB0D9] w-4 h-4" checked={editingForm.sendClientEmail || false} onChange={e=>setEditingForm({...editingForm, sendClientEmail: e.target.checked})}/>
                                 <label htmlFor="sendClientEmail" className="text-xs text-slate-300 cursor-pointer select-none">שלח העתק ללקוח באופן אוטומטי</label>
                             </div>
                         </div>

                         <div className="space-y-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">שיוך לקטגוריות</h4>
                             <div className="flex flex-wrap gap-2">
                                 {Object.values(Category).map(cat => (
                                     <button key={cat} onClick={() => toggleFormCategory(cat)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${editingForm.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-950 text-slate-500 border-slate-700 hover:border-slate-500'}`}>
                                         {CATEGORY_LABELS[cat]} {editingForm.categories?.includes(cat) && <Check size={10} className="inline ml-1"/>}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         <div className="space-y-4 pt-4 border-t border-slate-800">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">הגדרות אימייל חוזר</h4>
                             <div>
                                 <label className="block text-xs font-bold text-slate-300 mb-1">נושא האימייל</label>
                                 <input className="w-full p-2 bg-slate-950 text-white rounded border border-slate-700 text-xs" value={editingForm.emailSubject || ''} onChange={e=>setEditingForm({...editingForm, emailSubject: e.target.value})} placeholder="ברירת מחדל: טופס חדש..."/>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-300 mb-1">תוכן הודעה (Body)</label>
                                 <textarea className="w-full p-2 bg-slate-950 text-white rounded border border-slate-700 text-xs h-20" value={editingForm.emailBody || ''} onChange={e=>setEditingForm({...editingForm, emailBody: e.target.value})} placeholder="מלל חופשי שיופיע בגוף המייל..."/>
                             </div>
                         </div>
                     </div>

                     {/* Main Area - Fields Canvas */}
                     <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col">
                         
                         {/* Toolbar */}
                         <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 mb-6 flex gap-2 flex-wrap items-center shadow-lg">
                             <span className="text-xs font-bold text-slate-500 ml-2">הוסף שדה:</span>
                             <button onClick={()=>addFieldToForm('text')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-[#2EB0D9] hover:text-white text-slate-300 text-xs rounded border border-slate-700 transition-colors"><Type size={14}/> טקסט</button>
                             <button onClick={()=>addFieldToForm('number')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-[#2EB0D9] hover:text-white text-slate-300 text-xs rounded border border-slate-700 transition-colors"><Hash size={14}/> מספר</button>
                             <button onClick={()=>addFieldToForm('email')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-[#2EB0D9] hover:text-white text-slate-300 text-xs rounded border border-slate-700 transition-colors"><AtSign size={14}/> אימייל</button>
                             <button onClick={()=>addFieldToForm('select')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-[#2EB0D9] hover:text-white text-slate-300 text-xs rounded border border-slate-700 transition-colors"><List size={14}/> רשימה</button>
                             <button onClick={()=>addFieldToForm('boolean')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-[#2EB0D9] hover:text-white text-slate-300 text-xs rounded border border-slate-700 transition-colors"><ToggleRight size={14}/> כן/לא</button>
                         </div>

                         {/* Fields List */}
                         <div className="space-y-4 flex-1">
                             {editingForm.fields.length === 0 && (
                                 <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
                                     <ClipboardList size={40} className="mb-2 opacity-50"/>
                                     <p>הטופס ריק. הוסף שדות באמצעות הסרגל למעלה.</p>
                                 </div>
                             )}
                             
                             {editingForm.fields.map((field, i) => (
                                 <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm hover:border-slate-600 transition-colors relative group animate-fade-in-up">
                                     <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={()=>removeFormField(i)} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded transition-colors"><Trash size={14}/></button>
                                     </div>
                                     
                                     <div className="flex gap-4 items-start mb-3">
                                         <div className="mt-2 p-2 bg-slate-950 rounded text-slate-500 border border-slate-800">
                                             {field.type === 'text' && <Type size={16}/>}
                                             {field.type === 'number' && <Hash size={16}/>}
                                             {field.type === 'email' && <AtSign size={16}/>}
                                             {field.type === 'select' && <List size={16}/>}
                                             {field.type === 'boolean' && <ToggleRight size={16}/>}
                                         </div>
                                         <div className="flex-1">
                                             <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">תווית השדה (Label)</label>
                                             <input value={field.label} onChange={e=>updateFormField(i,{label:e.target.value})} className="w-full bg-transparent border-b border-slate-700 text-white font-bold py-1 focus:border-[#2EB0D9] outline-none placeholder-slate-600" placeholder="שם השדה כפי שיופיע למשתמש"/>
                                         </div>
                                     </div>

                                     {/* Field Specific Config */}
                                     <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div className="flex items-center gap-2">
                                             <input type="checkbox" id={`req-${i}`} checked={field.required} onChange={e => updateFormField(i, { required: e.target.checked })} className="accent-red-500 w-4 h-4 rounded"/>
                                             <label htmlFor={`req-${i}`} className={`text-xs cursor-pointer select-none font-medium ${field.required ? 'text-red-400' : 'text-slate-500'}`}>שדה חובה</label>
                                         </div>
                                         
                                         {field.type === 'email' && (
                                             <div className="flex items-center gap-2">
                                                 <input type="checkbox" id={`isEmail-${i}`} checked={field.isClientEmail || false} onChange={e => { const newFields = editingForm.fields.map(f => ({...f, isClientEmail: false})); newFields[i].isClientEmail = e.target.checked; setEditingForm({...editingForm, fields: newFields}); }} className="accent-green-500 w-4 h-4 rounded"/>
                                                 <label htmlFor={`isEmail-${i}`} className={`text-xs cursor-pointer select-none font-medium ${field.isClientEmail ? 'text-green-400' : 'text-slate-500'}`}>זהו המייל של הלקוח</label>
                                             </div>
                                         )}

                                         {field.type === 'select' && (
                                             <div className="col-span-2">
                                                 <label className="text-[10px] text-slate-500 block mb-1">אפשרויות בחירה (מופרדות בפסיק)</label>
                                                 <input value={field.options?.join(',')} onChange={e => updateFormField(i, { options: e.target.value.split(',') })} className="w-full bg-slate-800 border border-slate-700 text-white p-1.5 rounded text-xs" placeholder="אפשרות 1, אפשרות 2..."/>
                                             </div>
                                         )}

                                         <div className="col-span-2 flex gap-2 items-center">
                                             <label className="text-[10px] text-slate-500 whitespace-nowrap flex items-center gap-1"><HelpCircle size={10}/> קישור למאמר עזרה:</label>
                                             <select value={field.helpArticleId || ''} onChange={e => updateFormField(i, { helpArticleId: e.target.value })} className="bg-slate-800 border border-slate-700 text-white p-1 rounded flex-1 text-xs outline-none">
                                                 <option value="">-- ללא --</option>
                                                 {state.articles.map(article => (<option key={article.id} value={article.id}>{article.title}</option>))}
                                             </select>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      )}

      {/* TEAM EDIT MODAL - (Re-using standard modal structure for simplicity if needed, but separate is cleaner) */}
      {editingMember && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-2xl overflow-y-auto max-h-[90vh]">
                <h3 className="font-bold text-white mb-4 text-xl">עריכת חבר צוות</h3>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">שם מלא</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.fullName} onChange={e=>setEditingMember({...editingMember, fullName: e.target.value})}/></div>
                        <div className="w-24"><label className="block text-xs text-slate-400 mb-1">סדר</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.order || 99} onChange={e=>setEditingMember({...editingMember, order: Number(e.target.value)})}/></div>
                    </div>
                    <div><label className="block text-xs text-slate-400 mb-1">תפקיד</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}/></div>
                    <div><label className="block text-xs text-slate-400 mb-1">התמחות</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.specialization} onChange={e=>setEditingMember({...editingMember, specialization: e.target.value})}/></div>
                    <div className="flex gap-4">
                        <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">אימייל</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.email} onChange={e=>setEditingMember({...editingMember, email: e.target.value})}/></div>
                        <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">טלפון</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.phone} onChange={e=>setEditingMember({...editingMember, phone: e.target.value})}/></div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">תמונה</label>
                        <div className="flex gap-2">
                            <input className="flex-1 p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingMember.imageUrl} onChange={e=>setEditingMember({...editingMember, imageUrl: e.target.value})}/>
                            <Button size="sm" onClick={() => openImagePicker('team', editingMember.fullName)}><Search size={14}/></Button>
                            <ImageUploadButton onImageSelected={(url) => setEditingMember({...editingMember, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} className="h-8 w-10 px-0"/>
                        </div>
                    </div>
                    <div><label className="block text-xs text-slate-400 mb-1">ביוגרפיה קצרה</label><textarea className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700 h-24" value={editingMember.bio} onChange={e=>setEditingMember({...editingMember, bio: e.target.value})}/></div>
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-800">
                    <Button onClick={handleSaveMember}>שמור</Button>
                    <Button variant="outline" onClick={()=>setEditingMember(null)}>ביטול</Button>
                </div>
            </div>
        </div>
      )}

      {/* PRODUCT EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-2xl">
                <h3 className="font-bold text-white mb-4 text-xl">עריכת מוצר / שירות</h3>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">שם המוצר</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.title} onChange={e=>setEditingProduct({...editingProduct, title: e.target.value})}/></div>
                        <div className="w-24"><label className="block text-xs text-slate-400 mb-1">מחיר (₪)</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: Number(e.target.value)})}/></div>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                         <label className="block text-xs font-bold text-slate-400 mb-2">קטגוריות</label>
                         <div className="flex flex-wrap gap-2">
                             {Object.values(Category).map(cat => (
                                 <button key={cat} onClick={() => toggleProductCategory(cat)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${editingProduct.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'}`}>
                                     {CATEGORY_LABELS[cat]} {editingProduct.categories?.includes(cat) && <Check size={12}/>}
                                 </button>
                             ))}
                         </div>
                    </div>

                    <div><label className="block text-xs text-slate-400 mb-1">תיאור קצר</label><textarea className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700 h-20" value={editingProduct.description || ''} onChange={e=>setEditingProduct({...editingProduct, description: e.target.value})}/></div>
                    <div><label className="block text-xs text-slate-400 mb-1">לינק לתשלום (Stripe / משולם / אחר)</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.paymentLink} onChange={e=>setEditingProduct({...editingProduct, paymentLink: e.target.value})} placeholder="https://buy.stripe.com/..."/></div>
                    <div><label className="block text-xs text-slate-400 mb-1">פריסת תשלומים (טקסט חופשי)</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.installments || ''} onChange={e=>setEditingProduct({...editingProduct, installments: e.target.value})} placeholder="למשל: עד 12 תשלומים ללא ריבית"/></div>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">סדר הופעה</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingProduct.order || 99} onChange={e=>setEditingProduct({...editingProduct, order: Number(e.target.value)})}/></div>
                        <div className="flex items-center gap-2 pt-4">
                            <input type="checkbox" id="isPop" checked={editingProduct.isPopular || false} onChange={e=>setEditingProduct({...editingProduct, isPopular: e.target.checked})} className="accent-[#2EB0D9] w-4 h-4"/><label htmlFor="isPop" className="text-white text-sm">סמן כפופולרי</label>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-800">
                    <Button onClick={handleSaveProduct}>שמור</Button>
                    <Button variant="outline" onClick={()=>setEditingProduct(null)}>ביטול</Button>
                </div>
            </div>
        </div>
      )}

      {/* Other modals (Slider, Calculator, Article, Timeline) remain as previously defined in the full file context */}
      {editingSlide && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-3xl flex flex-col max-h-[90vh]">
                <h3 className="font-bold text-white mb-4 text-xl">עריכת סלייד</h3>
                <div className="flex-1 overflow-y-auto space-y-4 px-2">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">כותרת ראשית</label>
                            <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingSlide.title} onChange={e=>setEditingSlide({...editingSlide, title: e.target.value})} />
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-bold text-slate-400 mb-1">סדר</label>
                            <input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingSlide.order || 99} onChange={e=>setEditingSlide({...editingSlide, order: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">כותרת משנה</label>
                        <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingSlide.subtitle} onChange={e=>setEditingSlide({...editingSlide, subtitle: e.target.value})} />
                    </div>
                    
                    {/* Multi-Category Selection */}
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                         <label className="block text-xs font-bold text-slate-400 mb-2">איפה להציג? (ניתן לבחור כמה)</label>
                         <div className="flex flex-wrap gap-2">
                             {Object.values(Category).map(cat => (
                                 <button 
                                    key={cat} 
                                    onClick={() => toggleSlideCategory(cat)} 
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                                        editingSlide.categories?.includes(cat) 
                                        ? 'bg-[#2EB0D9] text-white border-[#2EB0D9] shadow-md shadow-[#2EB0D9]/20' 
                                        : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'
                                    }`}
                                 >
                                     {CATEGORY_LABELS[cat]} 
                                     {editingSlide.categories?.includes(cat) && <Check size={12}/>}
                                 </button>
                             ))}
                         </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">קישור לתמונה</label>
                            <div className="flex gap-2">
                                <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingSlide.imageUrl} onChange={e=>setEditingSlide({...editingSlide, imageUrl: e.target.value})} />
                                <Button size="sm" onClick={() => openImagePicker('slide', 'legal')}><Search size={14}/></Button>
                                <ImageUploadButton onImageSelected={(url) => setEditingSlide({...editingSlide, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} className="h-8 w-10 px-0"/>
                            </div>
                        </div>
                    </div>
                    
                    {/* Preview */}
                    {editingSlide.imageUrl && (
                        <div className="h-32 w-full rounded overflow-hidden relative border border-slate-700 mt-2">
                            <img src={editingSlide.imageUrl} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-shadow">תצוגה מקדימה</span></div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <div className="flex-1"><label className="block text-xs font-bold text-slate-400 mb-1">טקסט כפתור</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingSlide.buttonText || ''} onChange={e=>setEditingSlide({...editingSlide, buttonText: e.target.value})} placeholder="למשל: קרא עוד"/></div>
                        <div className="flex-1"><label className="block text-xs font-bold text-slate-400 mb-1">קישור כפתור (אופציונלי)</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingSlide.linkTo || ''} onChange={e=>setEditingSlide({...editingSlide, linkTo: e.target.value})} placeholder="URL או ID של טופס"/></div>
                    </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                    <Button onClick={handleSaveSlide}>שמור שינויים</Button>
                    <Button variant="outline" onClick={()=>setEditingSlide(null)}>ביטול</Button>
                </div>
            </div>
        </div>
      )}

      {/* CALCULATOR EDIT MODAL */}
      {editingCalculator && (
         <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
             <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-4xl h-[90vh] flex flex-col">
                 <h3 className="font-bold text-white mb-4 text-xl flex items-center gap-2"><Calculator className="text-[#2EB0D9]"/> עריכת מחשבון מס</h3>
                 
                 <div className="flex-1 overflow-y-auto space-y-6 px-2">
                     
                     {/* Calc Settings */}
                     <div className="flex gap-4 border-b border-slate-800 pb-4">
                         <div className="flex-1">
                             <label className="block text-xs font-bold text-slate-400 mb-1">כותרת המחשבון</label>
                             <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingCalculator.title} onChange={e=>setEditingCalculator({...editingCalculator, title: e.target.value})} placeholder="למשל: מחשבון מס רכישה"/>
                         </div>
                         <div className="w-32">
                             <label className="block text-xs font-bold text-slate-400 mb-1">סדר הופעה</label>
                             <input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingCalculator.order || 99} onChange={e=>setEditingCalculator({...editingCalculator, order: Number(e.target.value)})} />
                         </div>
                     </div>

                     <div className="bg-slate-950 p-3 rounded border border-slate-800">
                         <label className="block text-xs font-bold text-slate-400 mb-2">היכן יופיע המחשבון?</label>
                         <div className="flex flex-wrap gap-2">{Object.values(Category).map(cat => (<button key={cat} onClick={() => toggleCalculatorCategory(cat)} className={`text-xs px-2 py-1 rounded border transition-colors ${editingCalculator.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>{CATEGORY_LABELS[cat]} {editingCalculator.categories?.includes(cat) && <Check size={10} className="inline ml-1"/>}</button>))}</div>
                     </div>

                     {/* Scenarios Logic */}
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-lg text-white">סוגי עסקה (תרחישים)</h4>
                            <Button onClick={addScenario} size="sm" variant="outline"><Plus size={14} className="ml-1"/> הוסף תרחיש</Button>
                        </div>
                        
                        {editingCalculator.scenarios.map((scenario, sIndex) => (
                            <div key={scenario.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                                <div className="bg-slate-950 p-3 border-b border-slate-700 flex justify-between items-center">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-slate-500 block">שם התרחיש</label>
                                        <input className="bg-transparent border-none text-white font-bold w-full focus:ring-0 px-0" value={scenario.title} onChange={e => updateScenario(sIndex, { title: e.target.value })} placeholder="למשל: דירה יחידה"/>
                                    </div>
                                    <button onClick={() => removeScenario(sIndex)} className="text-red-400 hover:bg-red-900/20 p-2 rounded"><Trash size={16}/></button>
                                </div>
                                
                                <div className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-slate-400">מדרגות מס (סדר עולה)</span>
                                        <button onClick={() => addBracket(sIndex)} className="text-xs text-[#2EB0D9] hover:underline">+ הוסף מדרגה</button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {scenario.brackets.length === 0 && <p className="text-center text-xs text-slate-500 py-4">אין מדרגות מס. הוסף מדרגה כדי להתחיל.</p>}
                                        
                                        {scenario.brackets.map((bracket, bIndex) => (
                                            <div key={bracket.id} className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-slate-800">
                                                <div className="w-8 text-center text-xs text-slate-500 font-mono">{bIndex + 1}.</div>
                                                <div className="flex-1">
                                                    <label className="text-[9px] text-slate-500 block">עד סכום (₪)</label>
                                                    <input type="number" className="w-full bg-slate-800 text-white text-xs p-1 rounded border border-slate-700" value={bracket.threshold} onChange={e => updateBracket(sIndex, bIndex, { threshold: Number(e.target.value) })} />
                                                </div>
                                                <div className="w-24">
                                                    <label className="text-[9px] text-slate-500 block">שיעור מס (%)</label>
                                                    <input type="number" step="0.1" className="w-full bg-slate-800 text-white text-xs p-1 rounded border border-slate-700" value={bracket.rate} onChange={e => updateBracket(sIndex, bIndex, { rate: Number(e.target.value) })} />
                                                </div>
                                                <button onClick={() => removeBracket(sIndex, bIndex)} className="text-slate-500 hover:text-red-400 p-1"><X size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 bg-slate-900/50 p-2 rounded">
                                        * טיפ: המדרגה האחרונה צריכה להיות עם סכום גבוה מאוד (למשל 99999999) כדי לייצג "כל סכום שמעל".
                                    </p>
                                </div>
                            </div>
                        ))}
                     </div>

                 </div>
                 <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                     <Button onClick={handleSaveCalculator}>שמור מחשבון</Button>
                     <Button variant="outline" onClick={()=>setEditingCalculator(null)}>ביטול</Button>
                 </div>
             </div>
         </div>
      )}

      {/* TIMELINE (NEWS) EDITOR MODAL */}
      {editingTimelineItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-3xl flex flex-col max-h-[90vh]">
                <h3 className="font-bold text-white mb-4 text-xl">עריכת עדכון / חדשה</h3>
                <div className="flex-1 overflow-y-auto space-y-4 px-2">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">כותרת</label>
                            <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingTimelineItem.title} onChange={e=>setEditingTimelineItem({...editingTimelineItem, title: e.target.value})} />
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-bold text-slate-400 mb-1">סדר</label>
                            <input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingTimelineItem.order || 99} onChange={e=>setEditingTimelineItem({...editingTimelineItem, order: Number(e.target.value)})} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">תיאור קצר (יופיע בכרטיסייה)</label>
                        <textarea className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700 h-24" value={editingTimelineItem.description} onChange={e=>setEditingTimelineItem({...editingTimelineItem, description: e.target.value})} />
                    </div>

                    {/* Multi-Category Selection for Timeline */}
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                         <label className="block text-xs font-bold text-slate-400 mb-2">קטגוריות</label>
                         <div className="flex flex-wrap gap-2">
                             {Object.values(Category).map(cat => (
                                 <button 
                                    key={cat} 
                                    onClick={() => toggleTimelineCategory(cat)} 
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                                        editingTimelineItem.category?.includes(cat) 
                                        ? 'bg-[#2EB0D9] text-white border-[#2EB0D9] shadow-md shadow-[#2EB0D9]/20' 
                                        : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'
                                    }`}
                                 >
                                     {CATEGORY_LABELS[cat]} 
                                     {editingTimelineItem.category?.includes(cat) && <Check size={12}/>}
                                 </button>
                             ))}
                         </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">קישור לתמונה</label>
                            <div className="flex gap-2">
                                <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingTimelineItem.imageUrl} onChange={e=>setEditingTimelineItem({...editingTimelineItem, imageUrl: e.target.value})} />
                                <Button size="sm" onClick={() => openImagePicker('timeline', editingTimelineItem.title)}><Search size={14}/></Button>
                                <ImageUploadButton onImageSelected={(url) => setEditingTimelineItem({...editingTimelineItem, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} className="h-8 w-10 px-0"/>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">קישור מיוחד (ID של טופס או URL חיצוני)</label>
                            <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingTimelineItem.linkTo || ''} onChange={e=>setEditingTimelineItem({...editingTimelineItem, linkTo: e.target.value})} placeholder="form-XXX או https://..." />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                    <Button onClick={handleSaveTimelineItem}>שמור שינויים</Button>
                    <Button variant="outline" onClick={()=>setEditingTimelineItem(null)}>ביטול</Button>
                </div>
            </div>
        </div>
      )}

      {/* ARTICLE EDITOR MODAL */}
      {editingArticle && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-xl">עריכת מאמר</h3>
                    <button onClick={()=>setEditingArticle(null)} className="text-slate-400 hover:text-white"><X/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-6 px-2">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">כותרת המאמר</label>
                            <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingArticle.title} onChange={e=>setEditingArticle({...editingArticle, title: e.target.value})} placeholder="כותרת"/>
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-bold text-slate-400 mb-1">סדר</label>
                            <input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingArticle.order || 99} onChange={e=>setEditingArticle({...editingArticle, order: Number(e.target.value)})}/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">תקציר (Abstract)</label>
                        <textarea className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700 h-24" value={editingArticle.abstract} onChange={e=>setEditingArticle({...editingArticle, abstract: e.target.value})} />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">ציטוט מוביל (אופציונלי)</label>
                            <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingArticle.quote || ''} onChange={e=>setEditingArticle({...editingArticle, quote: e.target.value})} />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                         <label className="block text-xs font-bold text-slate-400 mb-2">קטגוריות</label>
                         <div className="flex flex-wrap gap-2">
                             {Object.values(Category).map(cat => (
                                 <button 
                                    key={cat} 
                                    onClick={() => toggleArticleCategory(cat)} 
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                                        editingArticle.categories?.includes(cat) 
                                        ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' 
                                        : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'
                                    }`}
                                 >
                                     {CATEGORY_LABELS[cat]} 
                                     {editingArticle.categories?.includes(cat) && <Check size={12}/>}
                                 </button>
                             ))}
                         </div>
                    </div>

                    {/* Image */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 mb-1">תמונה ראשית</label>
                            <div className="flex gap-2">
                                <input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingArticle.imageUrl} onChange={e=>setEditingArticle({...editingArticle, imageUrl: e.target.value})} />
                                <Button size="sm" onClick={() => openImagePicker('article', editingArticle.title)}><Search size={14}/></Button>
                                <ImageUploadButton onImageSelected={(url) => setEditingArticle({...editingArticle, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} supabaseConfig={supabaseConfig} className="h-8 w-10 px-0"/>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Content */}
                    <div className="border-t border-slate-800 pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-white">תוכן המאמר (לשוניות)</h4>
                            <Button size="sm" onClick={addArticleTab}><Plus size={14}/> הוסף לשונית</Button>
                        </div>
                        <div className="space-y-4">
                            {editingArticle.tabs.map((tab, idx) => (
                                <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700">
                                    <div className="flex justify-between mb-2">
                                        <input className="bg-transparent font-bold text-white border-b border-slate-600 focus:border-[#2EB0D9] outline-none w-1/2" value={tab.title} onChange={e => updateArticleTab(idx, 'title', e.target.value)} placeholder="כותרת הלשונית" />
                                        <button onClick={() => removeArticleTab(idx)} className="text-red-400 hover:text-red-300"><Trash size={16}/></button>
                                    </div>
                                    <textarea className="w-full h-40 bg-slate-900 text-slate-200 p-2 rounded border border-slate-800 text-sm leading-relaxed" value={tab.content} onChange={e => updateArticleTab(idx, 'content', e.target.value)} placeholder="תוכן הלשונית..." />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-800 mt-auto">
                    <Button onClick={handleUpdateArticle}>שמור שינויים</Button>
                    <Button variant="outline" onClick={()=>setEditingArticle(null)}>ביטול</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
