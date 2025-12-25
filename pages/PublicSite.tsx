
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx';
import { emailService } from '../services/api.ts'; 
import { 
  X, Phone, MapPin, Mail, Menu, ClipboardList, Newspaper, HelpCircle, 
  Loader2, Calculator, ChevronDown, UserPlus, Users, CreditCard, CheckCircle2, 
  Settings, ArrowLeft, ArrowRight, Check
} from 'lucide-react';

interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: any) => void;
  onAdminClick: () => void;
  dataVersion: string;
}

const SectionTitle: React.FC<{ title: string; isDark: boolean }> = ({ title, isDark }) => (
  <div className="flex items-center gap-4 mb-12" dir="rtl">
    <div className="h-px flex-1 bg-[#2EB0D9]/20" />
    <h2 className={`text-3xl md:text-5xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
    <div className="h-px w-16 bg-[#2EB0D9]" />
  </div>
);

const ArticleOverlay: React.FC<{ 
  article: Article, 
  onClose: () => void, 
  theme: any, 
  isDark: boolean,
  relatedArticles?: Article[]
}> = ({ article, onClose, theme, isDark, relatedArticles = [] }) => {
    const [activeTab, setActiveTab] = useState(0);
    if (!article) return null;
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in" dir="rtl">
            <div className={`relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border ${theme.border} ${theme.cardBg}`}>
                <div className="sticky top-0 z-10 p-6 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-white/5">
                    <ShareMenu variant="inline" title={article.title} colorClass="text-white" />
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"><X size={24}/></button>
                </div>
                <div className="p-8 md:p-16">
                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="md:w-1/3">
                            <div className="relative rounded-3xl overflow-hidden aspect-square shadow-2xl">
                                <img src={article.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/10">{CATEGORY_LABELS[article.categories?.[0] || Category.HOME]}</div>
                            </div>
                        </div>
                        <div className="md:w-2/3">
                            <h2 className={`text-4xl md:text-6xl font-black mb-8 leading-tight ${theme.textTitle}`}>{article.title}</h2>
                            {article.tabs && article.tabs.length > 0 ? (
                                <>
                                    <div className="flex gap-6 border-b border-white/5 mb-10 overflow-x-auto no-scrollbar pb-1">
                                        {article.tabs.map((tab, idx) => (
                                            <button key={idx} onClick={() => setActiveTab(idx)} className={`pb-4 px-2 font-bold text-lg transition-all whitespace-nowrap ${activeTab === idx ? 'text-[#2EB0D9] border-b-4 border-[#2EB0D9]' : 'text-slate-500 hover:text-slate-300'}`}>
                                                {tab.title}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={`prose prose-invert max-w-none text-right text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {(article.tabs?.[activeTab]?.content || '').split('\n').map((p, i) => <p key={i} className="mb-6">{p}</p>)}
                                    </div>
                                </>
                            ) : (
                                <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{article.abstract}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PublicSite: React.FC<PublicSiteProps> = ({ state, onCategoryChange, onAdminClick, dataVersion }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  const [formPreviewMode, setFormPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Robust destructing to avoid "black screen" errors
  const safeState = state || ({} as AppState);
  const { 
    currentCategory = Category.HOME, 
    config = { officeName: 'MeLaw', theme: 'dark', integrations: {} } as any, 
    slides = [], 
    timelines = [], 
    articles = [], 
    menuItems = [], 
    forms = [], 
    teamMembers = [] 
  } = safeState;
  
  const isDark = config.theme === 'dark';
  const theme = {
      bgMain: isDark ? 'bg-slate-950' : 'bg-slate-50',
      textMain: isDark ? 'text-slate-200' : 'text-slate-800',
      headerBg: isDark ? 'bg-slate-950/80' : 'bg-white/80',
      cardBg: isDark ? 'bg-slate-900/95' : 'bg-white/95',
      inputBg: isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900',
      textTitle: isDark ? 'text-white' : 'text-slate-900',
      border: isDark ? 'border-slate-800' : 'border-slate-200',
  };

  const activeForm = forms.find(f => f.id === activeDynamicFormId);

  const handleTimelineClick = (item: TimelineItem) => {
    if (item.linkTo?.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setFormPreviewMode(false);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else if (item.linkTo) {
        window.open(item.linkTo, '_blank');
    }
  };

  const handleSendForm = async () => {
    if (!activeForm) return;
    setIsSubmitting(true);
    
    const processedData: any = {};
    (activeForm.fields || []).forEach(f => {
        const raw = dynamicFormValues[f.id];
        if (f.type === 'boolean') processedData[f.label] = raw ? "כן" : "לא";
        else if (f.type === 'composite_name_id') {
            processedData[f.label] = `${dynamicFormValues[`${f.id}_first`] || ''} ${dynamicFormValues[`${f.id}_last`] || ''} (ת.ז. ${dynamicFormValues[`${f.id}_id`] || ''})`;
        } else if (f.type === 'children_list') {
            const count = dynamicFormValues[`${f.id}_count`] || 0;
            let kids = [];
            for(let i=0; i<count; i++) {
                kids.push(`${dynamicFormValues[`${f.id}_kid_${i}_first`] || ''} (ת.ז. ${dynamicFormValues[`${f.id}_kid_${i}_id`] || ''})`);
            }
            processedData[f.label] = kids.join(' | ');
        }
        else processedData[f.label] = raw || "לא הוזן";
    });

    try {
        await emailService.sendForm(
            activeForm.title, processedData, config.integrations as any, 
            activeForm.pdfTemplate || 'NONE', activeForm.sendClientEmail || false, 
            activeForm.submitEmail || config.contactEmail
        );
        alert("הטופס נשלח בהצלחה למשרד!");
        setActiveDynamicFormId(null);
        setFormPreviewMode(false);
    } catch { 
        alert("שגיאה בשליחת הטופס."); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const filteredArticles = articles.filter(a => (a.categories || []).includes(currentCategory) || currentCategory === Category.HOME).sort((a,b) => (a.order||0)-(b.order||0));

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-[#2EB0D9] ${theme.bgMain} ${theme.textMain}`} dir="rtl">
      {/* Navbar */}
      <header className={`fixed top-0 inset-x-0 h-20 z-[100] border-b backdrop-blur-md shadow-2xl transition-all ${theme.headerBg} ${theme.border}`}>
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div onClick={() => onCategoryChange(Category.HOME)} className="cursor-pointer group flex items-center gap-4">
            <div className="w-10 h-10 bg-[#2EB0D9] rounded-xl flex items-center justify-center text-white font-black group-hover:rotate-12 transition-transform">M</div>
            <h1 className="text-2xl font-black text-[#2EB0D9]" style={{fontFamily: "'MyLogoFont', serif"}}>{config.officeName}</h1>
          </div>
          <nav className="hidden md:flex gap-10">
            {menuItems.sort((a,b)=>(a.order||0)-(b.order||0)).map(item => (
              <button key={item.id} onClick={() => onCategoryChange(item.cat)} className={`font-bold text-sm tracking-wide uppercase transition-all relative py-2 group ${currentCategory === item.cat ? 'text-[#2EB0D9]' : 'text-slate-500 hover:text-white'}`}>
                {item.label}
                <div className={`absolute bottom-0 left-0 h-0.5 bg-[#2EB0D9] transition-all duration-300 ${currentCategory === item.cat ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
             <button className="md:hidden p-2 text-[#2EB0D9]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={28}/></button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero Slider */}
        {slides.length > 0 && currentCategory === Category.HOME && (
          <section className="relative h-[55vh] bg-black overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {slides.sort((a,b)=>(a.order||0)-(b.order||0)).map((slide, idx) => (
              <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${idx === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                <img src={slide.imageUrl} className="w-full h-full object-cover opacity-50 animate-ken-burns scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20"></div>
                <div className="absolute inset-0 flex items-center px-12 md:px-32">
                  <div className="max-w-4xl text-right animate-fade-in-up">
                    <h2 className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">{slide.title}</h2>
                    <p className="text-xl md:text-3xl text-white/90 border-r-8 border-[#2EB0D9] pr-8 py-2 font-light">{slide.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="absolute bottom-10 left-12 flex gap-4 z-20">
               {slides.map((_, i) => (
                 <button key={i} onClick={() => setActiveSlide(i)} className={`h-2 rounded-full transition-all ${i === activeSlide ? 'w-12 bg-[#2EB0D9]' : 'w-4 bg-white/20 hover:bg-white/40'}`} />
               ))}
            </div>
          </section>
        )}

        {/* Dynamic Form UI - THE HEART OF THE PAGE */}
        <div ref={formRef}>
        {activeForm && (
          <section className="py-24 container mx-auto px-6 animate-fade-in-up">
            <div className={`max-w-3xl mx-auto rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.4)] p-10 md:p-20 border-t-[12px] border-[#2EB0D9] relative ${theme.cardBg}`}>
              {!formPreviewMode ? (
                <>
                  <div className="flex justify-between items-center mb-16">
                    <div>
                        <h3 className={`text-4xl md:text-5xl font-black mb-3 ${theme.textTitle}`}>{activeForm.title}</h3>
                        <p className="text-slate-500 font-bold">אנא מלא/י את כל השדות המסומנים</p>
                    </div>
                    <button onClick={() => setActiveDynamicFormId(null)} className="p-4 bg-black/20 hover:bg-black/40 rounded-full transition-all text-[#2EB0D9]"><X size={32}/></button>
                  </div>
                  <div className="space-y-10">
                    {(activeForm.fields || []).map(field => (
                      <div key={field.id} className="space-y-4 group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <label className="block text-xl font-black text-[#2EB0D9]">{field.label}</label>
                                {field.helpArticleId && (
                                    <button 
                                        onClick={() => setSelectedArticle(articles.find(a=>a.id===field.helpArticleId!) || null)} 
                                        className="text-[#2EB0D9]/50 hover:text-[#2EB0D9] hover:scale-125 transition-all p-1"
                                        title="לחץ לקבלת עזרה והסבר"
                                    >
                                        <HelpCircle size={22}/>
                                    </button>
                                )}
                            </div>
                            {field.required && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">שדה חובה</span>}
                        </div>

                        {/* Name + ID Field Type */}
                        {field.type === 'composite_name_id' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 bg-black/10 rounded-[2rem] border border-white/5 group-hover:bg-black/20 transition-all">
                                <input placeholder="שם פרטי" className={`p-4 rounded-2xl border text-right focus:ring-4 ring-[#2EB0D9]/20 transition-all outline-none ${theme.inputBg}`} value={dynamicFormValues[`${field.id}_first`] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_first`]: e.target.value})} />
                                <input placeholder="שם משפחה" className={`p-4 rounded-2xl border text-right focus:ring-4 ring-[#2EB0D9]/20 transition-all outline-none ${theme.inputBg}`} value={dynamicFormValues[`${field.id}_last`] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_last`]: e.target.value})} />
                                <input placeholder='ת.ז. (9 ספרות)' className={`p-4 rounded-2xl border text-right focus:ring-4 ring-[#2EB0D9]/20 transition-all outline-none font-mono ${theme.inputBg}`} value={dynamicFormValues[`${field.id}_id`] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_id`]: e.target.value.replace(/[^0-9]/g, '')})} />
                            </div>
                        )}

                        {/* Children List Field Type */}
                        {field.type === 'children_list' && (
                            <div className="p-8 bg-black/10 rounded-[2rem] border border-white/5 space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold opacity-60">כמה ילדים תרצו לעדכן בטופס זה?</span>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setDynamicFormValues({...dynamicFormValues, [`${field.id}_count`]: Math.max(0, (dynamicFormValues[`${field.id}_count`]||0)-1)})} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors">-</button>
                                        <span className="text-2xl font-black w-8 text-center">{dynamicFormValues[`${field.id}_count`] || 0}</span>
                                        <button onClick={() => setDynamicFormValues({...dynamicFormValues, [`${field.id}_count`]: (dynamicFormValues[`${field.id}_count`]||0)+1})} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-green-500 transition-colors">+</button>
                                    </div>
                                </div>
                                {Array.from({ length: dynamicFormValues[`${field.id}_count`] || 0 }).map((_, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-2xl border border-dashed border-white/10 animate-fade-in-up">
                                        <input placeholder={`שם הילד/ה ה-${i+1}`} className={`p-3 rounded-xl border text-xs ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_kid_${i}_first`]: e.target.value})} />
                                        <input placeholder="ת.ז. הילד/ה" className={`p-3 rounded-xl border text-xs font-mono ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_kid_${i}_id`]: e.target.value})} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {field.type === 'boolean' && (
                            <div className="flex items-center justify-between p-6 bg-black/10 rounded-[2rem] border border-white/5 group-hover:bg-black/20 transition-all">
                                <span className="text-lg font-bold opacity-80">האם נדרש / מאושר?</span>
                                <button onClick={() => setDynamicFormValues({...dynamicFormValues, [field.id]: !dynamicFormValues[field.id]})} className={`relative w-20 h-10 rounded-full transition-all flex items-center px-2 ${dynamicFormValues[field.id] ? 'bg-[#2EB0D9]' : 'bg-slate-700'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full transition-transform ${dynamicFormValues[field.id] ? 'translate-x-0' : '-translate-x-10'}`} />
                                    <Check className={`absolute left-3 text-white transition-opacity ${dynamicFormValues[field.id] ? 'opacity-100' : 'opacity-0'}`} size={16}/>
                                </button>
                            </div>
                        )}

                        {['text', 'email', 'phone', 'number', 'long_text'].includes(field.type) && (
                            field.type === 'long_text' ? 
                            <textarea className={`w-full p-6 rounded-[2rem] border text-right focus:ring-4 ring-[#2EB0D9]/20 transition-all outline-none ${theme.inputBg} h-40`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} /> :
                            <input type={field.type} className={`w-full p-6 rounded-[2rem] border text-right focus:ring-4 ring-[#2EB0D9]/20 transition-all outline-none ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />
                        )}

                        {field.type === 'select' && (
                            <select className={`w-full p-6 rounded-[2rem] border text-right focus:ring-4 ring-[#2EB0D9]/20 transition-all outline-none ${theme.inputBg} appearance-none cursor-pointer`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}>
                                <option value="">בחר מרשימה...</option>
                                {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        )}
                      </div>
                    ))}
                    <Button className="w-full h-24 text-2xl font-black mt-12 rounded-[2rem] shadow-[0_20px_40px_rgba(46,176,217,0.3)] group hover:scale-[1.02] active:scale-95 transition-all" variant="secondary" onClick={() => setFormPreviewMode(true)}>
                        מעבר לתצוגה מקדימה <ArrowLeft className="mr-4 group-hover:-translate-x-2 transition-transform" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="animate-fade-in-up">
                  <div className="text-center mb-16">
                    <div className="w-24 h-24 bg-[#2EB0D9]/20 text-[#2EB0D9] rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={64}/></div>
                    <h3 className={`text-4xl font-black mb-4 ${theme.textTitle}`}>סיכום נתונים ותשלום</h3>
                    <p className="text-slate-500">עבור/י על הפרטים לפני השליחה הסופית</p>
                  </div>
                  
                  <div className="bg-black/20 p-8 rounded-[2.5rem] border border-white/5 space-y-6 mb-12 shadow-inner">
                     {(activeForm.fields || []).map(f => (
                         <div key={f.id} className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="font-bold text-[#2EB0D9] text-sm uppercase tracking-wider">{f.label}:</span>
                            <span className="text-lg font-medium">
                                {dynamicFormValues[f.id] === true ? 'כן' : 
                                 dynamicFormValues[f.id] === false ? 'לא' : 
                                 dynamicFormValues[f.id] || '---'}
                            </span>
                         </div>
                     ))}
                  </div>

                  <div className="space-y-6">
                    <Button className="w-full h-20 text-2xl font-black gap-4 rounded-[2rem] shadow-2xl" variant="secondary" onClick={handleSendForm} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <><Mail size={24}/> שלח טופס למשרד</>}
                    </Button>
                    
                    {/* Mandatory Payment Button as Requested */}
                    <a 
                        href={config.integrations?.stripeWillsLink || 'https://buy.stripe.com/demo'} 
                        target="_blank" 
                        className="block w-full h-20 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center gap-4 text-2xl font-black shadow-[0_15px_30px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-1 active:scale-95 border border-white/10"
                    >
                        <CreditCard size={28}/> מעבר לתשלום מאובטח
                    </a>
                    
                    <button onClick={() => setFormPreviewMode(false)} className="w-full text-slate-500 font-bold hover:text-[#2EB0D9] transition-colors flex items-center justify-center gap-2">
                        <ArrowRight size={18}/> חזרה לעריכת השדות
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        </div>

        {/* Normal Page Content */}
        {currentCategory === Category.HOME && !activeDynamicFormId && (
          <>
            <section className="py-32 container mx-auto px-6">
              <SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {(timelines || []).sort((a,b)=>(a.order||0)-(b.order||0)).slice(0, 8).map(item => (
                  <div key={item.id} onClick={() => handleTimelineClick(item)} className={`p-10 rounded-[2.5rem] shadow-2xl cursor-pointer hover:-translate-y-4 hover:shadow-[#2EB0D9]/20 transition-all border border-transparent hover:border-[#2EB0D9]/30 group ${theme.cardBg}`}>
                    <div className="w-16 h-16 bg-[#2EB0D9]/10 text-[#2EB0D9] rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#2EB0D9] group-hover:text-white transition-all"><ClipboardList size={32}/></div>
                    <h4 className="text-2xl font-black mb-4 group-hover:text-[#2EB0D9] transition-colors">{item.title}</h4>
                    <p className="text-sm opacity-60 line-clamp-4 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={`py-32 ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
              <div className="container mx-auto px-6">
                <SectionTitle title="מאמרים ומדריכים משפטיים" isDark={isDark} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {filteredArticles.slice(0, 9).map(art => <ArticleCard key={art.id} article={art} onClick={() => setSelectedArticle(art)} />)}
                </div>
              </div>
            </section>
          </>
        )}

        <footer className={`py-32 bg-black border-t ${theme.border} text-center relative overflow-hidden`}>
           <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,#2EB0D9_0,transparent_70%)]" />
           <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center gap-8 mb-16">
                    <h1 className="text-4xl font-black text-[#2EB0D9]" style={{fontFamily: "'MyLogoFont', serif"}}>{config.officeName}</h1>
                    <div className="flex gap-8 text-sm font-bold opacity-60">
                        <button onClick={() => onCategoryChange(Category.HOME)} className="hover:text-white transition-colors">ראשי</button>
                        <button onClick={() => onCategoryChange(Category.WILLS)} className="hover:text-white transition-colors">צוואות</button>
                        <button onClick={() => onCategoryChange(Category.POA)} className="hover:text-white transition-colors">ייפוי כוח</button>
                        <button onClick={() => onCategoryChange(Category.CONTACT)} className="hover:text-white transition-colors">צור קשר</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-slate-500 text-sm border-y border-white/5 py-12 mb-12">
                    <div className="flex flex-col items-center gap-3">
                        <Phone size={24} className="text-[#2EB0D9]"/>
                        <p>{config.phone}</p>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <MapPin size={24} className="text-[#2EB0D9]"/>
                        <p>{config.address}</p>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <Mail size={24} className="text-[#2EB0D9]"/>
                        <p>{config.contactEmail}</p>
                    </div>
                </div>
                <p className="text-[10px] opacity-40 uppercase tracking-[0.3em]">© {new Date().getFullYear()} {config.officeName}. ALL RIGHTS RESERVED.</p>
                <button onClick={onAdminClick} className="mt-12 text-[10px] text-slate-800 hover:text-[#2EB0D9] transition-all flex items-center gap-2 mx-auto"><Settings size={12}/> LOGIN TO ADMIN CONSOLE</button>
           </div>
        </footer>
      </main>

      {selectedArticle && <ArticleOverlay article={selectedArticle} onClose={() => setSelectedArticle(null)} theme={theme} isDark={isDark} />}
      <FloatingWidgets dataVersion={dataVersion} />
    </div>
  );
};
