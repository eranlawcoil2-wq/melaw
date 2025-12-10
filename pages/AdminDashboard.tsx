
import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, Product, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; 
import { ImageUploadButton } from '../components/ImageUploadButton.tsx'; 
import { emailService, cloudService } from '../services/api.ts'; 
import { dbService } from '../services/supabase.ts';
import { Settings, Layout, FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Link as LinkIcon, Copy, Users, Check, Monitor, Sun, Moon, Database, Type, Menu, Download, Upload, AlertTriangle, CloudUpload, CloudOff, Search, Save, Cloud, HelpCircle, ChevronDown, ChevronUp, Lock, File, Shield, Key, ShoppingCart, Newspaper, Image as ImageIcon, ArrowUp, GalleryHorizontal } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
  version?: string;
}

// --- PUBLIC KEYS FALLBACK (For Image Uploads) ---
const FALLBACK_SUPABASE_URL = 'https://kqjmwwjafypkswkkbncc.supabase.co'; 
const FALLBACK_SUPABASE_KEY = 'sb_publishable_ftgAGUontmVJ-BfgzfQJsA_n7npD__t';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout, version }) => {
  // SPLIT TABS: Added 'sliders' as distinct from 'news'
  const [activeTab, setActiveTab] = useState<'config' | 'integrations' | 'articles' | 'news' | 'sliders' | 'forms' | 'team' | 'payments'>('articles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 
  const [isSavingToCloud, setIsSavingToCloud] = useState(false); 
  const [isLoadingFromCloud, setIsLoadingFromCloud] = useState(false); 
  // timelineSubTab removed - we use top level tabs now
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

  // UPDATED: Use Fallback keys if user keys are missing, ensuring upload button always has a config
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

  const handleExportData = () => { const dataStr = JSON.stringify(state); const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', 'melaw_data.json'); linkElement.click(); };
  const handleImportData = (e: any) => { const file = e.target.files?.[0]; if(!file)return; const reader = new FileReader(); reader.onload = (ev) => { try { const p = JSON.parse(ev.target?.result as string); updateState({...p, isAdminLoggedIn:true}); alert("נטען!"); } catch { alert("שגיאה"); }}; reader.readAsText(file); };
  
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

  const toggleProductCategory = (cat: Category) => {
      if (!editingProduct) return;
      const current = editingProduct.categories || [];
      if (current.includes(cat)) {
          setEditingProduct({ ...editingProduct, categories: current.filter(c => c !== cat) });
      } else {
          setEditingProduct({ ...editingProduct, categories: [...current, cat] });
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

        {/* --- ARTICLES TAB --- */}
        {activeTab === 'articles' && (
            <div className="space-y-8 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl"><div className="flex flex-col md:flex-row gap-4"><input type="text" className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9]" placeholder="נושא למאמר..." value={newArticleTopic} onChange={(e) => setNewArticleTopic(e.target.value)} /><Button onClick={handleGenerateArticle} disabled={isGenerating} className="min-w-[150px]">{isGenerating ? <Loader2 className="animate-spin ml-2"/> : 'צור (AI)'}</Button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredArticles.map(article => (<div key={article.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group"><div className="h-40 relative"><img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div><div className="p-4"><div className="flex justify-between items-start mb-2"><h4 className="font-bold line-clamp-1 text-white flex-1">{article.title}</h4><span className="text-xs text-slate-500 border border-slate-700 px-1 rounded">#{article.order || 99}</span></div><div className="flex justify-end gap-2"><button onClick={() => setEditingArticle(article)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg text-white"><Edit size={16}/></button><button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== article.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg text-white"><Trash size={16}/></button></div></div></div>))}</div>
            </div>
        )}

        {/* --- SLIDERS TAB (NEW) --- */}
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
                                <span className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">Order: {slide.order || 99}</span>
                                <button onClick={() => setEditingSlide(slide)} className="bg-slate-800 p-2 rounded hover:bg-[#2EB0D9] hover:text-white transition-colors"><Edit size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- NEWS & UPDATES TAB (NEW SPLIT) --- */}
        {activeTab === 'news' && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">עדכונים, חדשות וקיצורי דרך</h3>
                    <Button onClick={() => setEditingTimelineItem({ id: Date.now().toString(), title: 'עדכון חדש', description: '', imageUrl: 'https://picsum.photos/400/300', category: [Category.HOME], order: 99, tabs: [] })}><Plus size={16}/> הוסף חדש</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTimelines.map(t => (
                        <div key={t.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between group hover:border-[#2EB0D9] transition-colors">
                            <div className="flex-1">
                                <div className="text-white font-bold text-lg mb-1">{t.title}</div>
                                <div className="text-xs text-slate-400 line-clamp-1 mb-2">{t.description}</div>
                                <div className="flex gap-2">
                                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-500 border border-slate-700">Order: {t.order || 99}</span>
                                    {t.linkTo && t.linkTo.startsWith('form-') && <span className="text-xs bg-[#2EB0D9]/20 text-[#2EB0D9] px-2 py-0.5 rounded border border-[#2EB0D9]/30">מקושר לטופס</span>}
                                    {t.linkTo === 'wills-generator' && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">מחולל צוואות</span>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setEditingTimelineItem(t)} className="p-2 bg-slate-800 rounded hover:bg-[#2EB0D9] text-slate-300 hover:text-white"><Edit size={16}/></button>
                                <button onClick={() => updateState({ timelines: state.timelines.filter(x => x.id !== t.id) })} className="p-2 bg-slate-800 rounded hover:bg-red-500 text-slate-300 hover:text-white"><Trash size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ... (PAYMENTS, FORMS - Same as before) ... */}
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
                         <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-3xl h-[90vh] flex flex-col">
                             <h3 className="font-bold text-white mb-4">עריכת טופס</h3>
                             <div className="flex-1 overflow-y-auto space-y-4 px-2">
                                 <div className="flex gap-2">
                                     <div className="flex-1"><label className="block text-xs font-bold text-slate-400 mb-1">שם הטופס</label><input className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.title} onChange={e=>setEditingForm({...editingForm, title: e.target.value})} placeholder="שם הטופס"/></div>
                                     <div className="w-24"><label className="block text-xs font-bold text-slate-400 mb-1">סדר</label><input type="number" className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.order || 99} onChange={e=>setEditingForm({...editingForm, order: Number(e.target.value)})}/></div>
                                 </div>
                                 <div className="bg-slate-950 p-3 rounded border border-slate-800"><label className="block text-xs font-bold text-slate-400 mb-2">היכן יופיע הטופס?</label><div className="flex flex-wrap gap-2">{Object.values(Category).map(cat => (<button key={cat} onClick={() => toggleFormCategory(cat)} className={`text-xs px-2 py-1 rounded border transition-colors ${editingForm.categories?.includes(cat) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9]' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>{CATEGORY_LABELS[cat]} {editingForm.categories?.includes(cat) && <Check size={10} className="inline ml-1"/>}</button>))}</div></div>
                                 <div><label className="block text-xs font-bold text-slate-400 mb-1">סוג הדפסה (PDF Template)</label><select className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" value={editingForm.pdfTemplate || 'NONE'} onChange={e => setEditingForm({...editingForm, pdfTemplate: e.target.value as any})}><option value="NONE">ללא (רק שליחה)</option><option value="WILL">צוואה (Will)</option><option value="POA">ייפוי כוח (POA)</option></select></div>
                                 <div className="border-t border-slate-800 pt-4"><div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-slate-400">שדות הטופס</label><div className="flex gap-2"><button onClick={()=>addFieldToForm('text')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ טקסט</button><button onClick={()=>addFieldToForm('select')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ בחירה</button><button onClick={()=>addFieldToForm('boolean')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ כן/לא</button><button onClick={()=>addFieldToForm('number')} className="p-1 px-2 bg-slate-800 border border-slate-700 hover:border-[#2EB0D9] rounded text-xs text-white transition-colors">+ מספר</button></div></div>
                                     <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                         {editingForm.fields.map((field,i)=>(
                                             <div key={i} className="flex flex-col gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                                                 <div className="flex gap-2 items-center"><span className="text-[10px] uppercase bg-black/30 px-1 rounded text-slate-400 w-12 text-center">{field.type}</span><input value={field.label} onChange={e=>updateFormField(i,{label:e.target.value})} className="bg-slate-900 border border-slate-700 text-white p-1 rounded flex-1 text-xs" placeholder="שם השדה"/><button onClick={()=>removeFormField(i)} className="text-red-400 hover:bg-slate-900 p-1 rounded"><Trash size={14}/></button></div>
                                                 <div className="flex gap-2 items-center"><label className="text-[10px] text-slate-500 whitespace-nowrap">מאמר עזרה:</label><select value={field.helpArticleId || ''} onChange={e => updateFormField(i, { helpArticleId: e.target.value })} className="bg-slate-900 border border-slate-700 text-white p-1 rounded flex-1 text-xs"><option value="">-- ללא עזרה --</option>{state.articles.map(article => (<option key={article.id} value={article.id}>{article.title}</option>))}</select></div>
                                                 {field