
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS, CalculatorDefinition, Product } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx';
import { emailService } from '../services/api.ts'; 
import { Search, Phone, MapPin, Mail, Menu, X, ArrowLeft, Navigation, FileText, Settings, ChevronLeft, ChevronRight, Loader2, Scale, BookOpen, ClipboardList, Newspaper, AlertOctagon, HelpCircle, Printer, MessageCircle, Calculator, ChevronDown, Filter, Tag, ArrowRightCircle, UserPlus, Users, Share2, ExternalLink, CheckCircle2, Check, Circle } from 'lucide-react';

interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: any) => void;
  onAdminClick: () => void;
  dataVersion: string;
}

const SectionTitle: React.FC<{ title: string; isDark: boolean }> = ({ title, isDark }) => (
    <div className="mb-6 md:mb-10 relative z-10 text-right">
        <h3 className={`text-3xl md:text-4xl font-black inline-block tracking-tight leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
    </div>
);

// --- MODALS ---

const ArticleOverlay: React.FC<{ article: Article, onClose: () => void, relatedArticles: Article[], theme: any, isDark: boolean }> = ({ article, onClose, relatedArticles, theme, isDark }) => {
    const [activeTab, setActiveTab] = useState(0);
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${theme.border} ${theme.cardBg}`}>
                <div className="sticky top-0 z-10 p-4 flex justify-between items-center bg-slate-900 border-b border-white/10">
                    <div className="flex gap-2"><ShareMenu variant="inline" title={article.title} /></div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><X/></button>
                </div>
                <div className="p-6 md:p-12">
                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="md:w-1/3">
                            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-square bg-slate-800">
                                {article.imageUrl ? <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Newspaper size={48} className="text-slate-600"/></div>}
                            </div>
                        </div>
                        <div className="md:w-2/3 text-right">
                            <h2 className={`text-3xl md:text-5xl font-black mb-6 leading-tight ${theme.textTitle}`}>{article.title}</h2>
                            {article.tabs && article.tabs.length > 0 && (
                                <>
                                    <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
                                        {article.tabs.map((tab, idx) => (
                                            <button key={idx} onClick={() => setActiveTab(idx)} className={`pb-4 px-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === idx ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500 hover:text-slate-300'}`}>
                                                {tab.title}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={`prose prose-invert max-w-none text-lg leading-relaxed text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {(article.tabs[activeTab]?.content || '').split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
                                    </div>
                                </>
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
                <div className="md:w-1/2 h-80 md:h-auto"><img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover" /></div>
                <div className="md:w-1/2 p-8 md:p-12 text-right">
                    <h2 className={`text-3xl font-black mb-2 ${theme.textTitle}`}>{member.fullName}</h2>
                    <p className="text-[#2EB0D9] font-bold text-lg mb-6">{member.role}</p>
                    <div className="space-y-6">
                        <div><h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">אודות</h4><p className="text-sm leading-relaxed opacity-80">{member.bio}</p></div>
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
  
  // Defensive destructuring to prevent "black screen" crashes if data is null/undefined
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
  } = (state || {}) as Partial<AppState>;
  
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
  const filteredArticles = (articles || []).filter(a => a.categories?.includes(currentCategory) || currentCategory === Category.HOME).sort((a,b) => (a.order||99)-(b.order||99));
  const mixedTimelineItems = [
      ...(timelines || []).filter(t => t.category?.includes(currentCategory) || currentCategory === Category.HOME).map(t => ({ ...t, type: 'timeline' as const })),
      ...(calculators || []).filter(c => c.categories?.includes(currentCategory)).map(c => ({ id: c.id, title: c.title, description: 'מחשבון משפטי מתקדם.', type: 'calculator' as const, order: c.order || 99 }))
  ].sort((a: any, b: any) => (a.order || 99) - (b.order || 99));

  const handleTimelineClick = (item: any) => {
    if (item.type === 'calculator') { setActiveCalc(item.id); return; }
    if (item.linkTo?.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setTimeout(() => dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
        setSelectedArticle({ id: item.id, title: item.title, abstract: item.description, imageUrl: item.imageUrl || '', categories: item.category || [currentCategory], tabs: item.tabs || [{ title: 'מידע', content: item.description }], order: 0 });
    }
  };

  const activeForm = (forms || []).find(f => f.id === activeDynamicFormId);

  const handleFormSubmit = async () => {
    if (!activeForm) return;
    setIsSubmittingDynamic(true);
    
    // Process values for the email (convert booleans to Hebrew text)
    const processedData: any = {};
    activeForm.fields.forEach(f => {
        const rawValue = dynamicFormValues[f.id];
        if (f.type === 'boolean') {
            processedData[f.label] = rawValue === true ? "כן" : "לא";
        } else if (f.type === 'composite_name_id') {
            processedData[f.label] = `${dynamicFormValues[`${f.id}_first`] || ''} ${dynamicFormValues[`${f.id}_last`] || ''} (ת.ז. ${dynamicFormValues[`${f.id}_id`] || ''})`;
        } else {
            processedData[f.label] = rawValue || "לא הוזן";
        }
    });

    try {
        const officeEmail = activeForm.submitEmail || config.contactEmail;
        const res = await emailService.sendForm(
            activeForm.title, 
            processedData, 
            config.integrations as any, 
            activeForm.pdfTemplate || 'NONE', 
            activeForm.sendClientEmail || false,
            officeEmail
        );

        if (res) {
            alert("הטופס נשלח בהצלחה!");
            setActiveDynamicFormId(null);
        }
    } catch (e) {
        alert("שגיאה בשליחת הטופס.");
    } finally {
        setIsSubmittingDynamic(false);
    }
  };

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
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        )}

        {/* Dynamic Form Rendering */}
        {activeForm && (
            <div ref={dynamicFormRef} className="container mx-auto px-4 py-20 animate-fade-in-up">
                <div className={`max-w-2xl mx-auto rounded-3xl shadow-2xl p-8 md:p-12 border-t-4 border-[#2EB0D9] ${theme.cardBg}`}>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className={`text-3xl font-black ${theme.textTitle}`}>{activeForm.title}</h3>
                            <p className="text-xs text-slate-500 mt-1">אנא מלא את כל השדות</p>
                        </div>
                        <button onClick={() => setActiveDynamicFormId(null)} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X/></button>
                    </div>
                    <div className="space-y-8">
                        {(activeForm.fields || []).map(field => (
                            <div key={field.id} className="space-y-3">
                                {field.type === 'composite_name_id' && (
                                    <div className="p-6 rounded-2xl bg-black/5 border border-slate-700/20 space-y-4">
                                        <label className="block text-sm font-bold opacity-70 flex items-center gap-2"><UserPlus size={16} className="text-[#2EB0D9]"/> {field.label}</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input type="text" placeholder="שם פרטי" className={`p-3 rounded-xl border text-sm ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_first`]: e.target.value})} />
                                            <input type="text" placeholder="שם משפחה" className={`p-3 rounded-xl border text-sm ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_last`]: e.target.value})} />
                                            <input type="text" placeholder="ת.ז." className={`p-3 rounded-xl border text-sm font-mono ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_id`]: e.target.value.replace(/[^0-9]/g, '')})} />
                                        </div>
                                    </div>
                                )}
                                
                                {field.type === 'boolean' && (
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/5 border border-slate-700/10">
                                        <label className="text-sm font-bold opacity-80">{field.label}</label>
                                        <button 
                                            onClick={() => setDynamicFormValues({...dynamicFormValues, [field.id]: !dynamicFormValues[field.id]})}
                                            className={`relative w-14 h-8 rounded-full transition-colors duration-300 flex items-center px-1 ${dynamicFormValues[field.id] ? 'bg-[#2EB0D9]' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${dynamicFormValues[field.id] ? 'translate-x-0' : '-translate-x-6'}`} />
                                            <span className={`absolute left-2 text-[10px] font-black text-white ${dynamicFormValues[field.id] ? 'opacity-100' : 'opacity-0'}`}>כן</span>
                                            <span className={`absolute right-2 text-[10px] font-black text-white ${!dynamicFormValues[field.id] ? 'opacity-100' : 'opacity-0'}`}>לא</span>
                                        </button>
                                    </div>
                                )}

                                {['text', 'email', 'phone', 'number', 'select', 'long_text'].includes(field.type) && (
                                    <>
                                        <label className="block text-sm font-bold opacity-70 text-right">{field.label} {field.required && '*'}</label>
                                        {field.type === 'text' && <input type="text" className={`w-full p-4 rounded-xl border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'long_text' && <textarea className={`w-full p-4 rounded-xl border h-32 text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'email' && <input type="email" className={`w-full p-4 rounded-xl border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'phone' && <input type="tel" className={`w-full p-4 rounded-xl border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'number' && <input type="number" className={`w-full p-4 rounded-xl border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                        {field.type === 'select' && (
                                            <select className={`w-full p-4 rounded-xl border text-right ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}>
                                                <option value="">בחר...</option>
                                                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                        <Button className="w-full h-16 text-xl font-black shadow-2xl shine-effect" variant="secondary" onClick={handleFormSubmit}>
                            {isSubmittingDynamic ? <Loader2 className="animate-spin" /> : (activeForm.submitButtonText || 'שלח טופס')}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Other Sections */}
        <section className="py-20 container mx-auto px-4">
            <SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} />
            <div ref={timelineScrollRef} className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x" dir="rtl">
                {(mixedTimelineItems || []).map(item => (
                    <div key={item.id} onClick={() => handleTimelineClick(item)} className={`flex-shrink-0 w-80 rounded-3xl p-8 shadow-xl border border-transparent cursor-pointer hover:-translate-y-2 transition-all ${item.type === 'calculator' ? 'bg-gradient-to-br from-[#2EB0D9] to-blue-700 text-white' : theme.cardBg}`}>
                        <div className="p-3 bg-white/10 rounded-xl w-fit mb-6">{item.type === 'calculator' ? <Calculator size={24}/> : <ClipboardList size={24}/>}</div>
                        <h4 className="text-2xl font-black mb-3 text-right">{item.title}</h4>
                        <p className="text-sm opacity-80 line-clamp-3 text-right leading-relaxed">{item.description}</p>
                    </div>
                ))}
            </div>
        </section>

        <section className={`py-20 ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
            <div className="container mx-auto px-4 text-right">
                <SectionTitle title="מאמרים ומדריכים" isDark={isDark} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(filteredArticles || []).map(article => <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />)}
                </div>
            </div>
        </section>

        {selectedArticle && <ArticleOverlay article={selectedArticle} onClose={() => setSelectedArticle(null)} theme={theme} isDark={isDark} relatedArticles={(articles || []).filter(a => a.id !== selectedArticle.id).slice(0, 3)} />}
        {selectedMember && <TeamOverlay member={selectedMember} theme={theme} onClose={() => setSelectedMember(null)} />}

        <footer className={`bg-black text-slate-500 py-20 border-t ${theme.border}`}>
            <div className="container mx-auto px-4 text-center">
                <p className="text-xs uppercase tracking-widest opacity-40">© {new Date().getFullYear()} {config?.officeName}. ALL RIGHTS RESERVED.</p>
                {onAdminClick && <button onClick={onAdminClick} className="mt-10 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:text-[#2EB0D9] flex items-center gap-2 mx-auto"><Settings size={12}/> Site Administration</button>}
            </div>
        </footer>
      </main>
      <FloatingWidgets dataVersion={dataVersion} />
    </div>
  );
};
