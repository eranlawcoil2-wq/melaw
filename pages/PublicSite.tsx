
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS, CalculatorDefinition, Product } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx';
import { emailService } from '../services/api.ts'; 
import { Search, Phone, MapPin, Mail, Menu, X, ArrowLeft, Navigation, FileText, Settings, ChevronLeft, ChevronRight, Loader2, Scale, BookOpen, ClipboardList, Newspaper, AlertOctagon, HelpCircle, Printer, MessageCircle, Calculator, ChevronDown, Filter, Tag, ArrowRightCircle, UserPlus, Users, Share2, ExternalLink } from 'lucide-react';

// Added missing interface for PublicSite component props to fix TypeScript error
interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: any) => void;
  onAdminClick: () => void;
  dataVersion: string;
}

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = "", delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { 
            if (entry.isIntersecting) { 
                setTimeout(() => setIsVisible(true), delay); 
                observer.disconnect(); 
            } 
        }, { threshold: 0.1 });
        
        if (ref.current) observer.observe(ref.current);
        
        return () => {
            observer.disconnect();
        };
    }, [delay]);
    
    return <div ref={ref} className={`reveal ${isVisible ? 'active' : ''} ${className}`}>{children}</div>;
};

const SectionTitle: React.FC<{ title: string; isDark: boolean }> = ({ title, isDark }) => (
    <div className="mb-6 md:mb-10 relative z-10 text-right">
        <h3 className={`text-3xl md:text-4xl font-black inline-block tracking-tight leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
    </div>
);

// --- OVERLAY COMPONENTS (MODALS) ---

const ArticleOverlay: React.FC<{ article: Article, onClose: () => void, relatedArticles: Article[], theme: any, isDark: boolean }> = ({ article, onClose, relatedArticles, theme, isDark }) => {
    const [activeTab, setActiveTab] = useState(0);
    
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${theme.border} ${theme.cardBg}`}>
                <div className="sticky top-0 z-10 p-4 flex justify-between items-center bg-slate-900 border-b border-white/10">
                    <div className="flex gap-2">
                        <ShareMenu variant="inline" title={article.title} />
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X/></button>
                </div>

                <div className="p-6 md:p-12">
                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="md:w-1/3">
                            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-square bg-slate-800">
                                {article.imageUrl ? (
                                    <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Newspaper size={48} className="text-slate-600"/></div>
                                )}
                                <div className="absolute top-4 right-4 bg-[#2EB0D9] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                    {(article.categories || []).map(c => CATEGORY_LABELS[c]).join(', ')}
                                </div>
                            </div>
                            {article.quote && (
                                <div className="mt-8 p-4 border-r-4 border-[#2EB0D9] bg-white/5 italic text-lg leading-relaxed text-white">
                                    "{article.quote}"
                                </div>
                            )}
                        </div>
                        <div className="md:w-2/3 text-right">
                            <h2 className={`text-3xl md:text-5xl font-black mb-6 leading-tight ${theme.textTitle}`}>{article.title}</h2>
                            
                            {article.tabs && article.tabs.length > 0 && (
                                <>
                                    <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
                                        {article.tabs.map((tab, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setActiveTab(idx)}
                                                className={`pb-4 px-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === idx ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {tab.title}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={`prose prose-invert max-w-none text-lg leading-relaxed text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {(article.tabs[activeTab]?.content || '').split('\n').map((p, i) => (
                                            <p key={i} className="mb-4">{p}</p>
                                        ))}
                                    </div>
                                </>
                            )}
                            {(!article.tabs || article.tabs.length === 0) && (
                                <p className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{article.abstract}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TeamOverlay: React.FC<{ member: TeamMember, onClose: () => void, theme: any }> = ({ member, onClose, theme }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" dir="rtl">
        <div className={`relative w-full max-w-3xl overflow-hidden rounded-3xl shadow-2xl border ${theme.border} ${theme.cardBg}`}>
            <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white"><X/></button>
            <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 h-80 md:h-auto">
                    <img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover" />
                </div>
                <div className="md:w-1/2 p-8 md:p-12 text-right">
                    <h2 className={`text-3xl font-black mb-2 ${theme.textTitle}`}>{member.fullName}</h2>
                    <p className="text-[#2EB0D9] font-bold text-lg mb-6">{member.role}</p>
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">אודות</h4>
                            <p className="text-sm leading-relaxed opacity-80">{member.bio}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">התמחות</h4>
                            <p className="text-sm opacity-80">{member.specialization}</p>
                        </div>
                        <div className="flex gap-4 pt-4 justify-end">
                            {member.phone && <a href={`tel:${member.phone}`} className="p-3 bg-[#2EB0D9] rounded-full text-white"><Phone size={20}/></a>}
                            {member.email && <a href={`mailto:${member.email}`} className="p-3 bg-slate-800 rounded-full text-white"><Mail size={20}/></a>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const PublicSite: React.FC<PublicSiteProps> = ({ state, onCategoryChange, onWillsFormSubmit, onAdminClick, dataVersion }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  const [isSubmittingDynamic, setIsSubmittingDynamic] = useState(false);
  const [activeCalc, setActiveCalc] = useState<string | null>(null);
  
  // Safe destructuring with full fallbacks to prevent black screen (crashing on undefined)
  const safeState = state || {};
  const { 
    currentCategory = Category.HOME, 
    config = {} as any, 
    slides = [], 
    timelines = [], 
    articles = [], 
    menuItems = [], 
    forms = [], 
    calculators = [], 
    teamMembers = [] 
  } = safeState;
  
  const isDark = config?.theme === 'dark'; 
  const theme = {
      bgMain: isDark ? 'bg-slate-950' : 'bg-slate-50',
      textMain: isDark ? 'text-slate-200' : 'text-slate-800',
      headerBg: isDark ? 'bg-slate-950/80' : 'bg-white/80',
      cardBg: isDark ? 'bg-slate-900/90' : 'bg-white/90',
      inputBg: isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900',
      textTitle: isDark ? 'text-white' : 'text-slate-900',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
      border: isDark ? 'border-slate-800' : 'border-slate-200',
  };

  const dynamicFormRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const currentSlides = (slides || []).filter(s => s.categories?.includes(currentCategory) || currentCategory === Category.HOME).sort((a,b) => (a.order||99)-(b.order||99));
  
  const mixedTimelineItems = [
      ...(timelines || []).filter(t => t.category?.includes(currentCategory) || currentCategory === Category.HOME).map(t => ({ ...t, type: 'timeline' as const })),
      ...(calculators || []).filter(c => c.categories?.includes(currentCategory)).map(c => ({ 
          id: c.id, 
          title: c.title, 
          description: 'מחשבון משפטי מתקדם.', 
          type: 'calculator' as const, 
          order: c.order || 99 
      }))
  ].sort((a: any, b: any) => (a.order || 99) - (b.order || 99));

  const filteredArticles = (articles || []).filter(a => a.categories?.includes(currentCategory) || currentCategory === Category.HOME).sort((a,b) => (a.order||99)-(b.order||99));

  const handleTimelineClick = (item: any) => {
    if (item.type === 'calculator') {
        setActiveCalc(item.id);
        return;
    }
    if (item.linkTo?.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setTimeout(() => dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
        setSelectedArticle({
            id: item.id,
            title: item.title,
            abstract: item.description,
            imageUrl: item.imageUrl || '',
            categories: item.category || [currentCategory],
            tabs: item.tabs || [{ title: 'מידע', content: item.description }],
            order: 0
        });
    }
  };

  // Find the active form to render fields
  const activeForm = (forms || []).find(f => f.id === activeDynamicFormId);

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-[#2EB0D9] ${theme.bgMain} ${theme.textMain}`} dir="rtl">
      <header className={`fixed top-0 left-0 right-0 backdrop-blur-md shadow-lg z-40 h-20 border-b ${theme.headerBg} ${theme.border}`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div onClick={() => onCategoryChange(Category.HOME)} className="cursor-pointer">
              <h1 className="text-xl font-black text-[#2EB0D9]" style={{ fontFamily: "'MyLogoFont', serif" }}>{config?.officeName || 'MeLaw Office'}</h1>
          </div>
          <nav className="hidden md:flex gap-6">
              {(menuItems || []).sort((a,b)=>(a.order||0)-(b.order||0)).map(item => (
                  <button key={item.id} onClick={() => onCategoryChange(item.cat)} className={`text-sm font-bold transition-all ${currentCategory === item.cat ? 'text-[#2EB0D9]' : theme.textMuted}`}>
                      {item.label}
                  </button>
              ))}
          </nav>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu/></button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-10 space-y-6">
           <button onClick={() => setMobileMenuOpen(false)} className="self-start p-2 text-white"><X size={32}/></button>
           {(menuItems || []).map(item => (
              <button key={item.id} onClick={() => { onCategoryChange(item.cat); setMobileMenuOpen(false); }} className="text-2xl font-black text-right border-b border-slate-800 pb-2 text-white">
                  {item.label}
              </button>
           ))}
        </div>
      )}

      <main className="flex-1 pt-20">
        {currentSlides.length > 0 && (
            <section className="relative h-[45vh] bg-black overflow-hidden">
                {currentSlides.map((slide, idx) => (
                    <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${idx === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                        <img src={slide.imageUrl} className="w-full h-full object-cover opacity-50" alt={slide.title} />
                        <div className="absolute inset-0 flex items-center px-12">
                            <div className="max-w-2xl text-white text-right">
                                <h2 className="text-4xl font-black mb-4">{slide.title}</h2>
                                <p className="text-xl opacity-90 border-r-4 border-[#2EB0D9] pr-4">{slide.subtitle}</p>
                                {slide.buttonText && <Button className="mt-8" variant="secondary">{slide.buttonText}</Button>}
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        )}

        {/* Dynamic Form Rendering - Fully Updated to support all field types */}
        {activeForm && (
            <div ref={dynamicFormRef} className="container mx-auto px-4 py-20 animate-fade-in-up">
                <div className={`max-w-2xl mx-auto rounded-2xl shadow-2xl p-8 md:p-12 border-t-4 border-[#2EB0D9] ${theme.cardBg}`}>
                    <div className="flex justify-between items-center mb-8">
                        <h3 className={`text-3xl font-black ${theme.textTitle}`}>{activeForm.title}</h3>
                        <button onClick={() => setActiveDynamicFormId(null)} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X/></button>
                    </div>
                    <div className="space-y-8">
                        {(activeForm.fields || []).map(field => (
                            <div key={field.id} className="space-y-3">
                                {/* Special: Composite Name+ID in a row */}
                                {field.type === 'composite_name_id' && (
                                    <div className="p-5 rounded-xl bg-black/5 border border-slate-700/30 space-y-4">
                                        <label className="block text-sm font-bold opacity-70 flex items-center gap-2">
                                            <UserPlus size={16} className="text-[#2EB0D9]"/> {field.label}
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input type="text" placeholder="שם פרטי" className={`p-3 rounded-lg border text-sm ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_first`]: e.target.value})} />
                                            <input type="text" placeholder="שם משפחה" className={`p-3 rounded-lg border text-sm ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_last`]: e.target.value})} />
                                            <input type="text" placeholder="ת.ז." className={`p-3 rounded-lg border text-sm font-mono ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_id`]: e.target.value.replace(/[^0-9]/g, '')})} />
                                        </div>
                                    </div>
                                )}

                                {/* Special: Children List */}
                                {field.type === 'children_list' && (
                                    <div className="p-5 rounded-xl bg-black/5 border border-slate-700/30 space-y-6">
                                        <label className="block text-sm font-bold opacity-70 flex items-center gap-2">
                                            <Users size={16} className="text-[#2EB0D9]"/> {field.label}
                                        </label>
                                        <div>
                                            <p className="text-xs mb-2 opacity-60">מספר ילדים:</p>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                className={`w-24 p-3 rounded-lg border font-bold ${theme.inputBg}`} 
                                                value={dynamicFormValues[`${field.id}_count`] || 0}
                                                onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_count`]: parseInt(e.target.value) || 0})} 
                                            />
                                        </div>
                                        {Array.from({ length: dynamicFormValues[`${field.id}_count`] || 0 }).map((_, i) => (
                                            <div key={i} className="p-4 rounded-lg border border-dashed border-slate-600 bg-black/10 space-y-3 animate-fade-in-up">
                                                <h5 className="text-xs font-bold text-[#2EB0D9]">ילד #{i+1}</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <input placeholder="שם פרטי" className={`p-2 rounded border text-sm ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_c${i}_first`]: e.target.value})} />
                                                    <input placeholder="שם משפחה" className={`p-2 rounded border text-sm ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_c${i}_last`]: e.target.value})} />
                                                    <input placeholder="ת.ז." className={`p-2 rounded border text-sm font-mono ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_c${i}_id`]: e.target.value.replace(/[^0-9]/g, '')})} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Standard fields */}
                                {['text', 'email', 'phone', 'number', 'select', 'long_text'].includes(field.type) && (
                                    <>
                                        <label className="block text-sm font-bold opacity-70 text-right">{field.label} {field.required && '*'}</label>
                                        {field.type === 'text' && <input type="text" className={`w-full p-4 rounded-lg border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'long_text' && <textarea className={`w-full p-4 rounded-lg border h-32 text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'email' && <input type="email" className={`w-full p-4 rounded-lg border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'phone' && <input type="tel" className={`w-full p-4 rounded-lg border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'number' && <input type="number" className={`w-full p-4 rounded-lg border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'select' && (
                                            <select className={`w-full p-4 rounded-lg border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}>
                                                <option value="">בחר...</option>
                                                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                        <Button className="w-full h-14 text-lg font-bold shadow-xl" variant="secondary" onClick={async () => {
                            setIsSubmittingDynamic(true);
                            try {
                                await emailService.sendForm(activeForm.title, dynamicFormValues, config.integrations as any);
                                alert("הטופס נשלח בהצלחה!");
                                setActiveDynamicFormId(null);
                            } catch {
                                alert("שגיאה בשליחה.");
                            } finally {
                                setIsSubmittingDynamic(false);
                            }
                        }}>
                            {isSubmittingDynamic ? <Loader2 className="animate-spin" /> : (activeForm.submitButtonText || 'שלח טופס')}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Timeline Section */}
        <section className="py-20 container mx-auto px-4">
            <SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} />
            <div ref={timelineScrollRef} className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x" dir="rtl">
                {mixedTimelineItems.map(item => (
                    <div key={item.id} onClick={() => handleTimelineClick(item)} className={`flex-shrink-0 w-72 rounded-2xl p-6 shadow-lg border border-transparent cursor-pointer hover:-translate-y-2 transition-all ${item.type === 'calculator' ? 'bg-gradient-to-br from-[#2EB0D9] to-blue-600 text-white' : theme.cardBg}`}>
                        <div className="p-2 bg-white/10 rounded-lg w-fit mb-4">
                            {item.type === 'calculator' ? <Calculator size={20}/> : <ClipboardList size={20}/>}
                        </div>
                        <h4 className="text-xl font-bold mb-2 text-right">{item.title}</h4>
                        <p className="text-sm opacity-80 line-clamp-3 text-right">{item.description}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Articles Section */}
        <section className={`py-20 ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
            <div className="container mx-auto px-4 text-right">
                <SectionTitle title="מאמרים ומדריכים" isDark={isDark} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredArticles.map(article => (
                        <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
                    ))}
                </div>
            </div>
        </section>

        {/* Team Section */}
        <section className={`py-20 ${isDark ? 'bg-slate-900/30' : 'bg-slate-200'}`}>
            <div className="container mx-auto px-4 text-center mb-12">
                <SectionTitle title="הנבחרת שלנו" isDark={isDark} />
            </div>
            <div className="container mx-auto px-4 flex flex-nowrap overflow-x-auto gap-8 pb-10 scrollbar-hide" dir="rtl">
                {(teamMembers || []).sort((a,b)=>(a.order||0)-(b.order||0)).map(member => (
                    <div 
                        key={member.id} 
                        onClick={() => setSelectedMember(member)}
                        className="min-w-[280px] bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 group transition-all duration-500 hover:shadow-2xl cursor-pointer"
                    >
                        <div className="h-64 overflow-hidden">
                            <img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div className="p-6 text-center">
                            <h4 className="text-xl font-black text-slate-900 mb-1">{member.fullName}</h4>
                            <p className="text-[#2EB0D9] font-bold text-sm mb-4">{member.role}</p>
                            <p className="text-slate-500 text-sm line-clamp-3">{member.specialization}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* Modals */}
        {selectedArticle && (
            <ArticleOverlay 
                article={selectedArticle} 
                onClose={() => setSelectedArticle(null)} 
                theme={theme} 
                isDark={isDark} 
                relatedArticles={(articles || []).filter(a => a.id !== selectedArticle.id).slice(0, 3)}
            />
        )}

        {selectedMember && (
            <TeamOverlay member={selectedMember} theme={theme} onClose={() => setSelectedMember(null)} />
        )}

        <footer className={`bg-black text-slate-500 py-12 border-t ${theme.border}`}>
            <div className="container mx-auto px-4 text-center">
                <div className="flex justify-center mb-8">
                    <img src={config?.logoUrl} alt="Logo" className="h-10 opacity-60 grayscale hover:grayscale-0 transition-all cursor-pointer" onClick={() => onCategoryChange(Category.HOME)} />
                </div>
                <div className="flex justify-center gap-6 mb-8 text-sm">
                   <button onClick={() => onCategoryChange(Category.HOME)} className="hover:text-white">המשרד</button>
                   <button onClick={() => onCategoryChange(Category.WILLS)} className="hover:text-white">צוואות</button>
                   <button onClick={() => onCategoryChange(Category.REAL_ESTATE)} className="hover:text-white">מקרקעין</button>
                   <button onClick={() => onCategoryChange(Category.CONTACT)} className="hover:text-white">צור קשר</button>
                </div>
                <p className="text-xs">&copy; {new Date().getFullYear()} {config?.officeName}. {dataVersion}</p>
                {onAdminClick && (
                    <button onClick={onAdminClick} className="mt-6 text-[10px] uppercase tracking-widest hover:text-[#2EB0D9] flex items-center gap-2 mx-auto">
                        <Settings size={12}/> System Administration
                    </button>
                )}
            </div>
        </footer>
      </main>

      <FloatingWidgets dataVersion={dataVersion} />
    </div>
  );
};
