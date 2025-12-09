import React, { useState } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; 
import { ImageUploadButton } from '../components/ImageUploadButton.tsx'; 
import { emailService, cloudService } from '../services/api.ts'; 
import { dbService } from '../services/supabase.ts';
import { Settings, Layout, FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Link as LinkIcon, Copy, Users, Check, Monitor, Sun, Moon, Database, Type, Menu, Download, Upload, AlertTriangle, CloudUpload, CloudOff, Search, Save, Cloud } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
  version?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateState, onLogout, version }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'integrations' | 'articles' | 'timelines' | 'forms' | 'team'>('articles');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile sidebar state
  const [isSavingToCloud, setIsSavingToCloud] = useState(false); // Cloud save loading state
  
  // Timeline/Slider Sub-tab
  const [timelineSubTab, setTimelineSubTab] = useState<'slider' | 'cards'>('slider');

  // Global Admin State
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');

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

  const isSupabaseConfigured = state.config.integrations.supabaseUrl && state.config.integrations.supabaseKey;
  const isGoogleSheetsConfigured = state.config.integrations.googleSheetsUrl && state.config.integrations.googleSheetsUrl.includes("script.google.com");
  
  const isCloudConnected = isSupabaseConfigured || isGoogleSheetsConfigured;

  // --- CLOUD SAVE HANDLER (Unified) ---
  const handleSaveToCloud = async () => {
      if (!isCloudConnected) {
          alert("שגיאה: לא הוגדר חיבור למסד נתונים (Supabase) או ענן (Google).\nאנא עבור ללשונית 'חיבורים' והגדר את החיבור.");
          setActiveTab('integrations');
          return;
      }
      
      setIsSavingToCloud(true);
      try {
          // Priority 1: Supabase
          if (isSupabaseConfigured) {
              const success = await dbService.saveState(
                  state.config.integrations.supabaseUrl, 
                  state.config.integrations.supabaseKey, 
                  state
              );
              if (success) {
                  alert("האתר נשמר בהצלחה במסד הנתונים! השינויים יופיעו מיד בכל המכשירים.");
              } else {
                  alert("שגיאה בשמירה ל-Supabase. בדוק את המפתחות.");
              }
          } 
          // Priority 2: Google Sheets (Legacy)
          else if (isGoogleSheetsConfigured) {
              const success = await cloudService.saveStateToCloud(state.config.integrations.googleSheetsUrl, state);
              if (success) {
                   alert("האתר עודכן בהצלחה בענן (Google)! השינויים יופיעו בטעינה הבאה.");
              } else {
                   alert("שגיאה בשמירה לענן.");
              }
          }
      } catch (e) {
          alert("שגיאת תקשורת.");
      } finally {
          setIsSavingToCloud(false);
      }
  };

  // --- EXPORT / IMPORT LOGIC ---
  const handleExportData = () => {
      const dataStr = JSON.stringify(state);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'melaw_data_backup.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const parsedState = JSON.parse(content);
              
              if (confirm("פעולה זו תחליף את כל הנתונים הנוכחיים בנתונים מהקובץ. האם להמשיך?")) {
                  // Ensure admin stays logged in
                  updateState({ ...parsedState, isAdminLoggedIn: true });
                  alert("הנתונים נטענו בהצלחה!");
              }
          } catch (err) {
              alert("שגיאה בטעינת הקובץ. וודא שזהו קובץ JSON תקין.");
          }
      };
      reader.readAsText(file);
  };

  // ... (Existing handlers: handleGenerateArticle, handleUpdateArticle, etc.) ...
  const handleGenerateArticle = async () => {
    if (!newArticleTopic) return;
    if (!state.config.integrations.geminiApiKey) {
        alert("שגיאה: חסר מפתח API של Gemini. נא להגדיר אותו בלשונית 'חיבורים ואינטגרציות'.");
        return;
    }
    setIsGenerating(true);
    try {
      const generated = await generateArticleContent(newArticleTopic, selectedCategory, state.config.integrations.geminiApiKey);
      const newArticle: Article = {
        id: Date.now().toString(),
        categories: selectedCategory === 'ALL' ? [Category.HOME] : [selectedCategory],
        title: generated.title || newArticleTopic,
        abstract: generated.abstract || '',
        imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`, 
        quote: generated.quote,
        tabs: generated.tabs || []
      };
      updateState({ articles: [newArticle, ...state.articles] });
      setNewArticleTopic('');
      alert("מאמר נוצר בהצלחה באמצעות AI!");
    } catch (e: any) {
      console.error(e);
      alert("שגיאה ביצירת מאמר:\n" + (e.message || "אירעה תקלה בחיבור ל-Gemini."));
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
  
  // --- IMPROVED FORM SAVE HANDLER ---
  const handleSaveForm = () => { 
      if(editingForm) { 
          // Validate required fields
          if (!editingForm.title) {
              alert("נא להזין כותרת לטופס");
              return;
          }

          const exists = state.forms.find(f => f.id === editingForm.id); 
          const newForms = exists 
            ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) 
            : [...state.forms, editingForm];
            
          updateState({ forms: newForms }); 
          setEditingForm(null); 
          alert("הטופס נשמר בהצלחה!");
      }
  };

  const addFieldToForm = (type: FieldType) => { if(editingForm) setEditingForm({ ...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type, label: 'שדה חדש', required: false, options: type === 'select' ? ['אפשרות 1'] : undefined }] }); };
  const updateFormField = (index: number, updates: Partial<FormField>) => { if(editingForm) { const f = [...editingForm.fields]; f[index] = { ...f[index], ...updates }; setEditingForm({ ...editingForm, fields: f }); }};
  const removeFormField = (index: number) => { if(editingForm) setEditingForm({ ...editingForm, fields: editingForm.fields.filter((_, i) => i !== index) }); };
  const handleSaveMember = () => { if(editingMember) { const exists = state.teamMembers.find(m => m.id === editingMember.id); updateState({ teamMembers: exists ? state.teamMembers.map(m => m.id === editingMember.id ? editingMember : m) : [...state.teamMembers, editingMember] }); setEditingMember(null); }};
  const handleSaveSlide = () => { if(editingSlide) { const exists = state.slides.find(s => s.id === editingSlide.id); updateState({ slides: exists ? state.slides.map(s => s.id === editingSlide.id ? editingSlide : s) : [...state.slides, editingSlide] }); setEditingSlide(null); }};
  const handleSaveTimelineItem = () => { if(editingTimelineItem) { const exists = state.timelines.find(t => t.id === editingTimelineItem.id); updateState({ timelines: exists ? state.timelines.map(t => t.id === editingTimelineItem.id ? editingTimelineItem : t) : [...state.timelines, editingTimelineItem] }); setEditingTimelineItem(null); }};
  const toggleTimelineCategory = (item: TimelineItem, category: Category) => { return item.category.includes(category) ? item.category.filter(c => c !== category) : [...item.category, category]; };
  const updateIntegration = (key: keyof typeof state.config.integrations, value: string) => { updateState({ config: { ...state.config, integrations: { ...state.config.integrations, [key]: value } } }); };
  const toggleArticleCategory = (article: Article, category: Category) => { return article.categories.includes(category) ? article.categories.filter(c => c !== category) : [...article.categories, category]; };
  const handleFontUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if(file && (file.name.endsWith('.ttf') || file.name.endsWith('.otf'))) { const reader = new FileReader(); reader.onload = (e) => { updateState({ config: { ...state.config, customFontData: e.target?.result as string }}); alert("הפונט הועלה!"); }; reader.readAsDataURL(file); }};
  const handleResetFont = () => { if(confirm("למחוק פונט?")) updateState({ config: { ...state.config, customFontData: undefined }}); };

  const filteredArticles = state.articles.filter(a => selectedCategory === 'ALL' || a.categories.includes(selectedCategory));
  const filteredTimelines = state.timelines.filter(t => selectedCategory === 'ALL' || t.category.includes(selectedCategory));

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
      )}

      {/* Sidebar - Responsive */}
      <aside className={`fixed h-full right-0 z-50 w-64 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white"><span className="text-[#2EB0D9]">Me</span>Law Admin</h2>
            {version && <span className="text-[10px] text-slate-500 font-mono bg-black/30 px-1 rounded">{version}</span>}
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}><X/></button>
        </div>
        
        {/* Cloud Save Button in Sidebar */}
        <div className="p-4 border-b border-slate-800">
             <div className="text-center mb-2">
                 {isCloudConnected ? (
                     <span className="text-xs text-green-500 flex items-center justify-center gap-1 font-bold"><CloudUpload size={12}/> מחובר לענן</span>
                 ) : (
                     <span className="text-xs text-red-500 flex items-center justify-center gap-1 font-bold animate-pulse"><CloudOff size={12}/> ענן לא מחובר</span>
                 )}
             </div>
             <Button 
                onClick={handleSaveToCloud} 
                className={`w-full flex items-center justify-center gap-2 font-bold shine-effect ${isSavingToCloud ? 'opacity-70 cursor-wait' : ''}`}
                variant={isCloudConnected ? "secondary" : "outline"}
                disabled={isSavingToCloud}
             >
                 {isSavingToCloud ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                 {isSavingToCloud ? 'שומר במסד...' : 'שמור למסד הנתונים'}
             </Button>
             <p className="text-[10px] text-slate-500 text-center mt-2">
                 {isCloudConnected ? 'מעדכן את האתר בכל המכשירים בזמן אמת' : 'השינויים נשמרים רק במחשב זה'}
             </p>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <button onClick={() => { setActiveTab('articles'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'articles' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <FileText size={20} /> ניהול מאמרים
          </button>
          <button onClick={() => { setActiveTab('timelines'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'timelines' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Layout size={20} /> טיים-ליין וקרוסלות
          </button>
          <button onClick={() => { setActiveTab('forms'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'forms' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ClipboardList size={20} /> ניהול טפסים
          </button>
          <button onClick={() => { setActiveTab('team'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'team' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Users size={20} /> ניהול צוות
          </button>
          <div className="border-t border-slate-800 my-2"></div>
          <button onClick={() => { setActiveTab('integrations'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LinkIcon size={20} /> חיבורים ואינטגרציות
          </button>
          <button onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-[#2EB0D9] text-white font-bold shadow-lg shadow-[#2EB0D9]/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Monitor size={20} /> הגדרות אתר
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button onClick={onLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors p-2"><LogOut size={18}/> יציאה</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:mr-64 p-4 md:p-8 overflow-y-auto min-h-screen">
        
        {/* Mobile Header with Toggle */}
        <div className="md:hidden flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800 sticky top-0 z-30 shadow-lg">
             <h3 className="font-bold text-white">תפריט ניהול</h3>
             <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-slate-800 rounded text-[#2EB0D9] border border-slate-700">
                 <Menu size={24} />
             </button>
        </div>

        {/* CONNECTION ALERT BANNER */}
        {!isCloudConnected && activeTab !== 'integrations' && (
             <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-6 flex items-start gap-3 animate-fade-in-up">
                 <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" />
                 <div className="flex-1">
                     <h4 className="font-bold text-red-500">הענן לא מחובר!</h4>
                     <p className="text-sm text-slate-300 mt-1">
                         כל השינויים שאתה מבצע נשמרים כרגע <b>רק במחשב זה</b>. אנשים אחרים (ובמכשירים אחרים) לא יראו את העדכונים.
                     </p>
                     <button onClick={() => setActiveTab('integrations')} className="text-sm text-[#2EB0D9] underline mt-2 font-bold hover:text-white">
                         לחץ כאן כדי לחבר את האתר למסד נתונים
                     </button>
                 </div>
             </div>
        )}
        
        {/* INTEGRATIONS TAB - UPDATED SCRIPT */}
        {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-4xl">
                
                {/* SUPABASE CONFIG */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#2EB0D9]"></div>
                    <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                        <Database className="text-[#2EB0D9]"/> מסד נתונים בזמן אמת (Supabase) - מומלץ!
                    </h3>
                    <p className="text-slate-400 mb-4 text-sm">
                        חיבור זה מאפשר לאתר לעבוד בזמן אמת. כל שינוי שומר מיד לענן ומתעדכן אצל כל הלקוחות.
                        <br/>
                        1. פתח חשבון ב- <a href="https://supabase.com" target="_blank" className="text-[#2EB0D9] underline">Supabase.com</a>.
                        <br/>
                        2. צור פרויקט חדש.
                        <br/>
                        3. ב-SQL Editor, הרץ את הפקודה ליצירת טבלה (בקש מהמתכנת את הקוד).
                        <br/>
                        4. העתק את ה-URL וה-KEY מהגדרות הפרויקט.
                    </p>
                    
                    <div className="space-y-4 bg-slate-950 p-4 rounded border border-slate-800">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">Project URL</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white placeholder-slate-600 focus:border-[#2EB0D9] outline-none" 
                                placeholder="https://xyz.supabase.co" 
                                value={state.config.integrations.supabaseUrl} 
                                onChange={e => updateIntegration('supabaseUrl', e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">API Key (anon/public)</label>
                            <input 
                                type="password" 
                                className="w-full p-2 border border-slate-700 rounded bg-slate-900 text-white placeholder-slate-600 focus:border-[#2EB0D9] outline-none" 
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..." 
                                value={state.config.integrations.supabaseKey} 
                                onChange={e => updateIntegration('supabaseKey', e.target.value)} 
                            />
                        </div>
                        {isSupabaseConfigured && <div className="text-green-500 text-sm font-bold flex items-center gap-1"><Check size={16}/> מוגדר</div>}
                    </div>
                </div>

                {/* GOOGLE CONFIG (LEGACY) */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 opacity-80">
                    <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Cloud/> שרת תמונות (Google Script)</h3>
                    <div className="space-y-4 bg-slate-950 p-4 rounded border border-slate-800">
                        <label className="block text-sm font-bold text-slate-300">Google Script Web App URL</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-700 rounded-lg bg-slate-900 text-white placeholder-slate-600 focus:border-[#2EB0D9] outline-none" 
                            placeholder="https://script.google.com/macros/s/..." 
                            value={state.config.integrations.googleSheetsUrl} 
                            onChange={e => updateIntegration('googleSheetsUrl', e.target.value)} 
                        />
                        <p className="text-xs text-slate-500">משמש בעיקר להעלאת תמונות ל-Google Drive.</p>
                    </div>
                </div>

                {/* AI CONFIG */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Sparkles/> בינה מלאכותית (Gemini)</h3>
                    <input 
                        type="password" 
                        className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder-slate-600 focus:border-[#2EB0D9] outline-none" 
                        placeholder="AIzaSy..." 
                        value={state.config.integrations.geminiApiKey} 
                        onChange={e => updateIntegration('geminiApiKey', e.target.value)} 
                    />
                </div>
            </div>
        )}

        {/* Global Category Selector Header */}
        {(activeTab === 'articles' || activeTab === 'forms') && (
            <div className="bg-slate-900 p-4 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row md:items-center justify-between sticky top-20 md:top-0 z-20 border border-slate-800 gap-4">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-300 text-sm md:text-lg">אזור עריכה:</span>
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as Category | 'ALL')}
                        className="p-2 border border-slate-700 rounded-lg text-[#2EB0D9] font-bold focus:outline-none focus:border-[#2EB0D9] bg-slate-800 font-sans flex-1"
                    >
                        <option value="ALL">הכל (ללא סינון)</option>
                        {Object.values(Category).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="text-slate-500 text-xs md:text-sm">
                    מציג תכנים עבור: <b className="text-slate-300">{selectedCategory === 'ALL' ? 'כל הקטגוריות' : selectedCategory}</b>
                </div>
            </div>
        )}

        {/* --- ARTICLES TAB --- */}
        {activeTab === 'articles' && (
            <div className="animate-fade-in space-y-8">
                {/* Generator Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                        <Sparkles className="text-[#2EB0D9]" /> מחולל מאמרים (AI)
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4">
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
                        <div key={article.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-[#2EB0D9] transition-all group relative">
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
                                
                                {/* Copy ID Button Added */}
                                <div className="text-xs text-slate-500 mb-2 flex items-center gap-2 bg-slate-950 p-1 rounded w-fit">
                                    <span>ID: {article.id.substring(0,8)}...</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(article.id);
                                            alert("מזהה המאמר הועתק!");
                                        }} 
                                        title="העתק מזהה מלא"
                                        className="text-[#2EB0D9] hover:text-white"
                                    >
                                        <Copy size={12}/>
                                    </button>
                                </div>

                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{article.abstract}</p>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingArticle(article)} className="p-2 bg-slate-800 hover:bg-[#2EB0D9] rounded-lg transition-colors text-white"><Edit size={16} /></button>
                                    <button onClick={() => updateState({ articles: state.articles.filter(a => a.id !== article.id) })} className="p-2 bg-slate-800 hover:bg-red-500 rounded-lg transition-colors text-white"><Trash size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- CONFIG TAB WITH IMPORT/EXPORT --- */}
        {activeTab === 'config' && (
             <div className="space-y-6">
                
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
                        <input type="text" className="w-full p-3 border border-slate-700 rounded-lg bg-slate-800 text-white mb-2" value={state.config.logoUrl} onChange={e => updateState({ config: { ...state.config, logoUrl: e.target.value }})} placeholder="לוגו URL" />
                        
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

        {/* --- Render other tabs content (Timelines, Forms, Team) --- */}
        {activeTab === 'timelines' && (
            <div className="space-y-6">
                <div className="flex gap-4 border-b border-slate-800 pb-4">
                    <button onClick={() => setTimelineSubTab('slider')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'slider' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>סליידר</button>
                    <button onClick={() => setTimelineSubTab('cards')} className={`pb-2 px-4 font-bold ${timelineSubTab === 'cards' ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>כרטיסים</button>
                </div>
                {timelineSubTab === 'slider' && (
                    <div className="space-y-4">{state.slides.map(slide => (<div key={slide.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between"><div className="flex items-center gap-4"><img src={slide.imageUrl} className="w-16 h-10 object-cover rounded"/><div><div className="font-bold">{slide.title}</div><div className="text-xs text-slate-400">סדר: {slide.order || 99}</div></div></div><button onClick={() => setEditingSlide(slide)}><Edit size={16}/></button></div>))}</div>
                )}
                {timelineSubTab === 'cards' && (
                     <div className="space-y-4">
                         <Button onClick={() => setEditingTimelineItem({ id: Date.now().toString(), title: '', description: '', imageUrl: 'https://picsum.photos/400/300', category: [Category.HOME] })}><Plus size={16}/> חדש</Button>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredTimelines.map(t => (<div key={t.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between"><div><div className="font-bold">{t.title}</div><div className="text-xs text-slate-400">{t.description.substring(0,50)}...</div></div><div className="flex flex-col gap-2"><button onClick={() => setEditingTimelineItem(t)}><Edit size={16}/></button><button onClick={() => updateState({ timelines: state.timelines.filter(x => x.id !== t.id) })} className="text-red-400"><Trash size={16}/></button></div></div>))}</div>
                     </div>
                )}
                {/* Modals for Slide/Timeline Editor would be here (reusing existing logic) */}
                {editingSlide && (
                    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                        <div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-md space-y-4">
                            <h3 className="font-bold text-white">עריכה</h3>
                            <input className="w-full p-2 bg-slate-800 text-white rounded" value={editingSlide.title} onChange={e=>setEditingSlide({...editingSlide, title: e.target.value})}/>
                            <input className="w-full p-2 bg-slate-800 text-white rounded" value={editingSlide.subtitle} onChange={e=>setEditingSlide({...editingSlide, subtitle: e.target.value})}/>
                            
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">סדר תצוגה (1 = ראשון)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 bg-slate-800 text-white rounded border border-slate-700" 
                                    value={editingSlide.order || 99} 
                                    onChange={e=>setEditingSlide({...editingSlide, order: parseInt(e.target.value)})}
                                />
                            </div>

                            <div className="flex gap-2">
                                <input className="flex-1 p-2 bg-slate-800 text-white rounded" value={editingSlide.imageUrl} onChange={e=>setEditingSlide({...editingSlide, imageUrl: e.target.value})} placeholder="URL תמונה"/>
                                <ImageUploadButton onImageSelected={(url) => setEditingSlide({...editingSlide, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSaveSlide}>שמור</Button>
                                <Button variant="outline" onClick={()=>setEditingSlide(null)}>ביטול</Button>
                            </div>
                        </div>
                    </div>
                )}
                
                {editingTimelineItem && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-md space-y-4 max-h-[80vh] overflow-y-auto"><h3 className="font-bold text-white">עריכה</h3><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingTimelineItem.title} onChange={e=>setEditingTimelineItem({...editingTimelineItem, title: e.target.value})}/><textarea className="w-full p-2 bg-slate-800 text-white rounded" value={editingTimelineItem.description} onChange={e=>setEditingTimelineItem({...editingTimelineItem, description: e.target.value})}/><div className="flex gap-2">
                    <input className="flex-1 p-2 bg-slate-800 text-white rounded" value={editingTimelineItem.imageUrl} onChange={e=>setEditingTimelineItem({...editingTimelineItem, imageUrl: e.target.value})} placeholder="URL תמונה"/>
                    <ImageUploadButton onImageSelected={(url) => setEditingTimelineItem({...editingTimelineItem, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} />
                </div><div className="flex gap-2"><Button onClick={handleSaveTimelineItem}>שמור</Button><Button variant="outline" onClick={()=>setEditingTimelineItem(null)}>ביטול</Button></div></div></div>}
            </div>
        )}

        {activeTab === 'forms' && (
             <div className="space-y-6">
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

        {activeTab === 'team' && (
            <div className="space-y-6">
                <div className="flex justify-end"><Button onClick={() => setEditingMember({ id: Date.now().toString(), fullName: '', role: '', specialization: '', email: '', phone: '', bio: '', imageUrl: 'https://picsum.photos/400/400' })}><Plus size={16}/> איש צוות</Button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{state.teamMembers.map(m => (<div key={m.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex gap-4"><img src={m.imageUrl} className="w-16 h-16 rounded-full"/><div className="flex-1"><div className="font-bold text-white">{m.fullName}</div><div className="text-xs text-slate-400">{m.role}</div></div><button onClick={()=>setEditingMember(m)}><Edit size={16}/></button><button onClick={()=>updateState({teamMembers: state.teamMembers.filter(x=>x.id!==m.id)})} className="text-red-400"><Trash size={16}/></button></div>))}</div>
                {editingMember && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><div className="bg-slate-900 p-6 rounded border border-slate-700 w-full max-w-lg space-y-4"><h3 className="font-bold text-white">עריכת צוות</h3><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingMember.fullName} onChange={e=>setEditingMember({...editingMember, fullName: e.target.value})}/><input className="w-full p-2 bg-slate-800 text-white rounded" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}/><div className="flex gap-2">
                    <input className="flex-1 p-2 bg-slate-800 text-white rounded" value={editingMember.imageUrl} onChange={e=>setEditingMember({...editingMember, imageUrl: e.target.value})} placeholder="URL תמונה"/>
                    <ImageUploadButton onImageSelected={(url) => setEditingMember({...editingMember, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} />
                </div><div className="flex gap-2"><Button onClick={handleSaveMember}>שמור</Button><Button variant="outline" onClick={()=>setEditingMember(null)}>ביטול</Button></div></div></div>}
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
      {/* Article Edit Modal (Re-added here to ensure visibility) */}
      {editingArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">עריכת מאמר</h3><button onClick={() => setEditingArticle(null)}><X className="text-slate-400"/></button></div>
                <div className="space-y-4">
                    <input className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.title} onChange={e => setEditingArticle({...editingArticle, title: e.target.value})} placeholder="כותרת"/>
                    <textarea className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white h-24" value={editingArticle.abstract} onChange={e => setEditingArticle({...editingArticle, abstract: e.target.value})} placeholder="תקציר"/>
                    <div className="flex gap-2">
                        <input className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded text-white" value={editingArticle.imageUrl} onChange={e => setEditingArticle({...editingArticle, imageUrl: e.target.value})} placeholder="URL תמונה"/>
                        <ImageUploadButton onImageSelected={(url) => setEditingArticle({...editingArticle, imageUrl: url})} googleSheetsUrl={state.config.integrations.googleSheetsUrl} />
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