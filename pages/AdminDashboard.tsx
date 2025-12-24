
import React, { useState, useEffect } from 'react';
import { AppState, Article, Category, TimelineItem, MenuItem, FormDefinition, FormField, FieldType, TeamMember, SliderSlide, Product, CATEGORY_LABELS, CalculatorDefinition, TaxScenario, TaxBracket } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { generateArticleContent } from '../services/geminiService.ts';
import { ImagePickerModal } from '../components/ImagePickerModal.tsx'; 
import { ImageUploadButton } from '../components/ImageUploadButton.tsx'; 
import { emailService, cloudService } from '../services/api.ts'; 
import { dbService } from '../services/supabase.ts';
import { Settings, Layout, FileText, Plus, Loader2, Sparkles, LogOut, Edit, Trash, X, ClipboardList, Link as LinkIcon, Copy, Users, Check, Monitor, Sun, Moon, Database, Type, Menu, Download, Upload, AlertTriangle, CloudUpload, CloudOff, Search, Save, Cloud, HelpCircle, ChevronDown, ChevronUp, Lock, File, Shield, Key, ShoppingCart, Newspaper, Image as ImageIcon, ArrowUp, GalleryHorizontal, Phone, MessageCircle, Printer, Mail, MapPin, Eye, EyeOff, CreditCard, Palette, Home, CheckCircle, Calculator, List, ToggleRight, Hash, AtSign, Tag, ArrowRightCircle, UserPlus, ArrowDown } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  onLogout: () => void;
  version?: string;
}

const FALLBACK_SUPABASE_URL = 'https://kqjmwwjafypkswkkbncc.supabase.co'; 
const FALLBACK_SUPABASE_KEY = 'sb_publishable_ftgAGUontmVJ-BfgzfQJsA_n7npD__t';

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
      setIsSavingToCloud(true);
      let success = false;
      if (isSupabaseConfigured) {
          success = await dbService.saveState(supabaseConfig.url, supabaseConfig.key, state);
      }
      setIsSavingToCloud(false);
      if (success) alert('האתר נשמר בהצלחה בענן!');
      else alert('שגיאה בשמירה לענן.');
  };

  const handleGenerateArticle = async () => {
      if (!newArticleTopic) return;
      setIsGenerating(true);
      try {
          const generated = await generateArticleContent(newArticleTopic, selectedCategory, state.config.integrations.geminiApiKey);
          const newArticle: Article = {
              id: Date.now().toString(),
              categories: selectedCategory === 'ALL' ? [Category.HOME] : [selectedCategory],
              title: generated.title || newArticleTopic,
              abstract: generated.abstract || '',
              quote: generated.quote || '',
              imageUrl: '', 
              tabs: generated.tabs || [],
              order: 99
          };
          updateState({ articles: [newArticle, ...state.articles] });
          setEditingArticle(newArticle);
          setNewArticleTopic('');
      } catch (e: any) {
          alert('שגיאה ביצירת תוכן');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSaveForm = () => { if(editingForm && editingForm.title) { const exists = state.forms.find(f => f.id === editingForm.id); updateState({ forms: exists ? state.forms.map(f => f.id === editingForm.id ? editingForm : f) : [...state.forms, editingForm] }); setEditingForm(null); }};
  const addFieldToForm = (type: FieldType) => { if(editingForm) setEditingForm({ ...editingForm, fields: [...editingForm.fields, { id: Date.now().toString(), type, label: type === 'children_list' ? 'רשימת ילדים' : 'שדה חדש', required: false }] }); };
  const updateFormField = (index: number, updates: Partial<FormField>) => { if(editingForm) { const f = [...editingForm.fields]; f[index] = { ...f[index], ...updates }; setEditingForm({ ...editingForm, fields: f }); }};
  const removeFormField = (index: number) => { if(editingForm) setEditingForm({ ...editingForm, fields: editingForm.fields.filter((_, i) => i !== index) }); };
  const toggleFormCategory = (cat: Category) => { if (!editingForm) return; const current = editingForm.categories || []; if (current.includes(cat)) { setEditingForm({ ...editingForm, categories: current.filter(c => c !== cat) }); } else { setEditingForm({ ...editingForm, categories: [...current, cat] }); } };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 overflow-hidden relative" dir="rtl">
      <aside className={`fixed h-full right-0 z-50 w-64 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div><h2 className="text-2xl font-bold text-white"><span className="text-[#2EB0D9]">Me</span>Law Admin</h2></div>
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}><X/></button>
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <button onClick={() => setActiveTab('articles')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'articles' ? 'bg-[#2EB0D9]' : ''}`}><FileText size={20} /> מאמרים</button>
          <button onClick={() => setActiveTab('forms')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'forms' ? 'bg-[#2EB0D9]' : ''}`}><ClipboardList size={20} /> טפסים</button>
          <button onClick={() => setActiveTab('team')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'team' ? 'bg-[#2EB0D9]' : ''}`}><Users size={20} /> צוות</button>
          <button onClick={() => setActiveTab('integrations')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'integrations' ? 'bg-[#2EB0D9]' : ''}`}><LinkIcon size={20} /> חיבורים</button>
        </nav>
        <div className="p-4 border-t border-slate-800">
            <Button onClick={handleSaveToCloud} className="w-full mb-2" variant="secondary">{isSavingToCloud ? <Loader2 className="animate-spin"/> : 'שמור לענן'}</Button>
            <button onClick={onLogout} className="w-full text-slate-500 text-sm">יציאה</button>
        </div>
      </aside>

      <main className="flex-1 md:mr-64 p-4 md:p-8 overflow-y-auto min-h-screen">
        {activeTab === 'forms' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold">ניהול טפסים</h3>
                    <Button onClick={() => setEditingForm({ id: Date.now().toString(), title: 'טופס חדש', categories: [Category.HOME], fields: [], submitEmail: '', order: 99 })}>טופס חדש</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {state.forms.map(form => (
                        <div key={form.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <h4 className="font-bold text-lg mb-4">{form.title}</h4>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingForm(form)} className="p-2 bg-slate-800 rounded"><Edit size={16}/></button>
                                <button onClick={() => updateState({ forms: state.forms.filter(f => f.id !== form.id) })} className="p-2 bg-red-900 rounded"><Trash size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {editingForm && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between">
                        <h3 className="font-bold">עריכת טופס: {editingForm.title}</h3>
                        <div className="flex gap-2"><Button onClick={handleSaveForm}>שמור</Button><button onClick={() => setEditingForm(null)}><X/></button></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <input className="p-2 bg-slate-800 rounded border border-slate-700" value={editingForm.title} onChange={e => setEditingForm({...editingForm, title: e.target.value})} placeholder="כותרת הטופס"/>
                            <input className="p-2 bg-slate-800 rounded border border-slate-700" value={editingForm.submitEmail} onChange={e => setEditingForm({...editingForm, submitEmail: e.target.value})} placeholder="אימייל לקבלת הטופס"/>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg flex gap-2 flex-wrap">
                            <button onClick={() => addFieldToForm('text')} className="px-3 py-1 bg-slate-700 rounded text-xs flex items-center gap-1"><Type size={12}/> טקסט</button>
                            <button onClick={() => addFieldToForm('composite_name_id')} className="px-3 py-1 bg-slate-700 rounded text-xs flex items-center gap-1"><UserPlus size={12}/> שם+תז</button>
                            <button onClick={() => addFieldToForm('children_list')} className="px-3 py-1 bg-[#2EB0D9] text-white rounded text-xs flex items-center gap-1"><Users size={12}/> פקד ילדים</button>
                        </div>
                        <div className="space-y-4">
                            {editingForm.fields.map((field, i) => (
                                <div key={field.id} className="bg-slate-950 p-4 rounded border border-slate-800 flex justify-between items-center">
                                    <div className="flex-1 flex gap-4">
                                        <span className="text-[#2EB0D9] text-xs font-bold uppercase">{field.type}</span>
                                        <input className="bg-transparent border-b border-slate-700 flex-1" value={field.label} onChange={e => updateFormField(i, {label: e.target.value})}/>
                                    </div>
                                    <button onClick={() => removeFormField(i)} className="text-red-500 mr-4"><Trash size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};
