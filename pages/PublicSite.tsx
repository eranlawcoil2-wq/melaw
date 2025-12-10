
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx'; 
import { emailService, storeService } from '../services/api.ts'; 
import { Search, Phone, MapPin, Mail, Menu, X, ArrowLeft, Navigation, FileText, Settings, ChevronLeft, ChevronRight, Loader2, Scale, BookOpen, ClipboardList, Newspaper, AlertOctagon, HelpCircle, Printer, MessageCircle } from 'lucide-react';

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = "", delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setTimeout(() => setIsVisible(true), delay); observer.disconnect(); } }, { threshold: 0.1 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [delay]);
    return <div ref={ref} className={`reveal ${isVisible ? 'active' : ''} ${className}`}>{children}</div>;
};

const SectionTitle: React.FC<{ title: string; isDark: boolean }> = ({ title, isDark }) => (
    <div className="mb-6 md:mb-10 relative z-10">
        <h3 className={`text-3xl md:text-4xl font-black inline-block tracking-tight leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
    </div>
);

interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: WillsFormData) => void;
  onAdminClick?: () => void;
  version?: string;
  dataVersion?: string;
}

// Utility to generate short unique ID
const generateSubmissionId = () => {
    return 'REF-' + Math.random().toString(36).substr(2, 5).toUpperCase();
};

export const PublicSite: React.FC<PublicSiteProps> = ({ state, onCategoryChange, onWillsFormSubmit, onAdminClick, version, dataVersion }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<TimelineItem | null>(null); // New state for Timeline Modal
  const [showWillsModal, setShowWillsModal] = useState(false); 
  const [isSubmittingWill, setIsSubmittingWill] = useState(false); 
  const [activeArticleTab, setActiveArticleTab] = useState(0); 
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  const [isSubmittingDynamic, setIsSubmittingDynamic] = useState(false);
  const [showFormsListModal, setShowFormsListModal] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  
  const isDark = state.config.theme === 'dark'; 
  const theme = {
      bgMain: isDark ? 'bg-slate-950' : 'bg-slate-50',
      textMain: isDark ? 'text-slate-200' : 'text-slate-800',
      headerBg: isDark ? 'bg-slate-950/80 shadow-black/20 border-slate-800' : 'bg-white/80 shadow-slate-200/50 border-slate-200',
      cardBg: isDark ? 'bg-slate-900/90 border-slate-700/50 backdrop-blur-md' : 'bg-white/90 border-slate-200 backdrop-blur-md shadow-sm',
      cardHover: isDark ? 'hover:border-[#2EB0D9]/50 hover:shadow-[0_0_30px_rgba(46,176,217,0.15)]' : 'hover:border-[#2EB0D9]/50 hover:shadow-2xl',
      inputBg: isDark ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
      modalBg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100',
      textTitle: isDark ? 'text-white' : 'text-slate-900',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
      border: isDark ? 'border-slate-800' : 'border-slate-200',
  };

  const dynamicFormRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const teamScrollRef = useRef<HTMLDivElement>(null);
  const articlesScrollRef = useRef<HTMLDivElement>(null);
  const articleContentTopRef = useRef<HTMLDivElement>(null);

  // Sorting Logic: Sort all content by order field
  const currentSlides = state.slides.filter(s => s.category === state.currentCategory || s.category === Category.HOME).sort((a, b) => (a.order || 99) - (b.order || 99));
  const currentArticles = state.articles.filter(a => state.currentCategory === Category.HOME || state.currentCategory === Category.STORE ? true : a.categories.includes(state.currentCategory)).sort((a, b) => (a.order || 99) - (b.order || 99));
  const currentTimelines = state.timelines.filter(t => state.currentCategory === Category.HOME || state.currentCategory === Category.STORE || t.category.includes(state.currentCategory)).sort((a, b) => (a.order || 99) - (b.order || 99));
  const currentCategoryForms = state.forms.filter(f => f.categories && f.categories.includes(state.currentCategory)).sort((a, b) => (a.order || 99) - (b.order || 99));
  const teamMembers = state.teamMembers.sort((a, b) => (a.order || 99) - (b.order || 99));
  
  // Updated Product Logic
  const storeProducts = (state.products || []).filter(p => {
      if (p.categories) {
          return state.currentCategory === Category.STORE || p.categories.includes(state.currentCategory);
      }
      return state.currentCategory === Category.STORE || (p as any).category === state.currentCategory;
  }).sort((a, b) => (a.order || 99) - (b.order || 99));

  useEffect(() => {
    const interval = setInterval(() => { setActiveSlide((prev) => (prev + 1) % currentSlides.length); }, 6000); 
    return () => clearInterval(interval);
  }, [currentSlides.length]);

  useEffect(() => {
      if(selectedArticle) {
          setActiveArticleTab(0);
          if(articleContentTopRef.current) articleContentTopRef.current.scrollTop = 0;
      }
  }, [selectedArticle]);

  // Handle Timeline Click - Updated to open modal for content items
  const handleTimelineClick = (item: TimelineItem) => {
    if (item.linkTo === 'wills-generator') {
        setShowWillsModal(true); 
    } else if (item.linkTo && item.linkTo.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setTimeout(() => { dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } else {
        // Open the Timeline Modal
        setSelectedTimelineItem(item);
        setActiveArticleTab(0); // reuse tab state for timeline
    }
  };

  const handleSliderClick = (slide: any) => {
    if (slide.linkTo) {
        if (slide.linkTo.startsWith('form:')) {
            const formId = slide.linkTo.split(':')[1];
            setActiveDynamicFormId(formId);
            setDynamicFormValues({});
            setTimeout(() => { dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
        } else if (slide.linkTo.startsWith('http')) {
            window.open(slide.linkTo, '_blank');
        } else if (Object.values(Category).includes(slide.linkTo)) {
            onCategoryChange(slide.linkTo);
        } else {
             onCategoryChange(slide.category); // Default fallback
        }
    } else {
        onCategoryChange(slide.category);
    }
  };
  
  const handleProductClick = (product: any) => {
      if (product.paymentLink) {
          window.open(product.paymentLink, '_blank');
      } else {
          alert(`לרכישת "${product.title}" אנא צור קשר.`);
      }
  };
  
  const handleContactSubmit = async () => {
      setContactSending(true);
      try {
          const submissionId = generateSubmissionId();
          await emailService.sendForm('General Contact Form', { ...contactForm, submissionId }, state.config.integrations);
          alert(`הודעתך נשלחה בהצלחה! מספר פנייה: ${submissionId}\nניצור קשר בהקדם.`);
          setContactForm({ name: '', phone: '', message: '' });
      } catch (e) { alert('שגיאה בשליחה.'); } finally { setContactSending(false); }
  };

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
      if (ref.current) { const scrollAmount = 350; ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' }); }
  };

  const [willsData, setWillsData] = useState<WillsFormData>({ fullName: '', spouseName: '', childrenCount: 0, childrenNames: [], equalDistribution: true, assets: [], contactEmail: '', contactPhone: '' });
  const [formStep, setFormStep] = useState(0);
  const handleChildrenCountChange = (count: number) => { setWillsData(prev => ({ ...prev, childrenCount: count, childrenNames: Array(count).fill('') })); };
  
  const handleRealWillsSubmit = async () => {
      setIsSubmittingWill(true);
      try {
          // Pass the full config object, not just integrations
          await emailService.sendWillsForm(willsData, state.config);
          onWillsFormSubmit(willsData);
          
          // Updated success message for server-side generation
          if (state.config.integrations.googleSheetsUrl) {
              alert("הפרטים נקלטו בהצלחה במערכת! טיוטת הצוואה תופק ותשלח אליך למייל בהקדם."); 
          } else {
              alert("הנתונים נשלחו אך לא הוגדר חיבור ל-Google Sheets."); 
          }
          
          setShowWillsModal(false); setFormStep(0);
      } catch (error) { alert("אירעה שגיאה, אנא נסה שנית."); } finally { setIsSubmittingWill(false); }
  };

  const currentDynamicForm = state.forms.find(f => f.id === activeDynamicFormId);
  const activeTabContent = selectedArticle?.tabs?.[activeArticleTab]?.content || "";
  
  const relatedArticles = selectedArticle ? state.articles.filter(a => a.id !== selectedArticle.id && a.categories.some(c => selectedArticle.categories.includes(c))).slice(0, 4) : [];

  const isContactPage = state.currentCategory === Category.CONTACT;
  const isStorePage = state.currentCategory === Category.STORE;
  const isHomePage = state.currentCategory === Category.HOME;
  const isLegalPage = !isHomePage && !isStorePage && !isContactPage;

  const showTeamSection = isHomePage;
  const showTimelineSection = !isContactPage;
  const showProductsSection = (isLegalPage || isStorePage);
  const showArticlesGrid = !isContactPage;
  const showGlobalFooter = !isContactPage;

  const hasWillsGenerator = state.currentCategory === Category.WILLS;
  const hasDynamicForms = currentCategoryForms.length > 0;

  const openHelpArticle = (articleId: string) => {
      const article = state.articles.find(a => a.id === articleId);
      if (article) {
          setSelectedArticle(article);
      }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-[#2EB0D9] selection:text-white ${theme.bgMain} ${theme.textMain}`}>
      
      {/* Background */}
      <div className={`fixed inset-0 pointer-events-none z-0 ${isDark ? 'opacity-30' : 'opacity-60'} overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#2EB0D9]/20 via-transparent to-purple-500/20 animate-gradient-xy"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#2EB0D9]/20 rounded-full blur-[100px] animate-float-slow"></div>
          <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* --- Article Modal --- */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fade-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedArticle(null)}></div>
            <div className={`md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                <div className={`hidden md:block w-1/4 h-full relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <img src={selectedArticle.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover animate-ken-burns opacity-70" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-slate-900' : 'from-white'} to-transparent`}></div>
                </div>
                <div className={`flex-1 flex flex-col h-full relative ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className={`p-4 border-b flex justify-between items-start flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div><h2 className={`text-xl md:text-2xl font-black leading-tight ${theme.textTitle}`}>{selectedArticle.title}</h2></div>
                        <button onClick={() => setSelectedArticle(null)} className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${theme.textMuted}`}><X size={20} /></button>
                    </div>
                    <div className={`px-4 pt-4 flex-shrink-0 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                        <div className={`flex gap-2 border-b overflow-x-auto scrollbar-hide ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            {selectedArticle.tabs.map((tab, idx) => (
                                <button key={idx} onClick={() => setActiveArticleTab(idx)} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeArticleTab === idx ? 'bg-[#2EB0D9] text-white shadow-lg' : `${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}`}>{tab.title}</button>
                            ))}
                        </div>
                    </div>
                    <div ref={articleContentTopRef} className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                        <div className="p-6 md:p-8 flex-1 flex flex-col min-h-full">
                            <div className={`prose max-w-none leading-relaxed text-lg mb-8 flex-1 ${theme.textMain}`}>
                                {activeTabContent.split('\n').map((paragraph, i) => (<p key={i} className="mb-4">{paragraph}</p>))}
                            </div>
                            {relatedArticles.length > 0 && (
                                <div className="mt-auto pt-8 border-t border-dashed border-slate-700">
                                    <h4 className="font-bold text-lg mb-4 text-[#2EB0D9]">מאמרים נוספים בנושא</h4>
                                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                        {relatedArticles.map(rel => (
                                            <div key={rel.id} onClick={() => setSelectedArticle(rel)} className={`flex-shrink-0 w-64 h-32 rounded-lg overflow-hidden relative cursor-pointer border ${theme.border} group`}>
                                                <img src={rel.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"/>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3 flex items-end">
                                                    <span className="text-white text-sm font-bold leading-tight line-clamp-2">{rel.title}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- Timeline Modal (Simpler Article) --- */}
      {selectedTimelineItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedTimelineItem(null)}></div>
            <div className={`rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col relative z-10 animate-fade-in-up border ${theme.modalBg}`}>
                <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div>
                        <h2 className={`text-xl font-black ${theme.textTitle}`}>{selectedTimelineItem.title}</h2>
                        <span className="text-xs text-[#2EB0D9] uppercase tracking-wider">עדכון / פסיקה</span>
                    </div>
                    <button onClick={() => setSelectedTimelineItem(null)} className={`p-2 rounded-full hover:bg-black/10 transition-colors ${theme.textMuted}`}><X size={24} /></button>
                </div>
                
                {/* Tabs for Timeline */}
                {selectedTimelineItem.tabs && selectedTimelineItem.tabs.length > 0 ? (
                    <>
                        <div className={`px-4 pt-4 flex-shrink-0 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                            <div className={`flex gap-2 border-b overflow-x-auto scrollbar-hide ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                {selectedTimelineItem.tabs.map((tab, idx) => (
                                    <button key={idx} onClick={() => setActiveArticleTab(idx)} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeArticleTab === idx ? 'bg-[#2EB0D9] text-white' : `${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}`}>{tab.title}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className={`prose max-w-none leading-relaxed text-lg ${theme.textMain}`}>
                                {selectedTimelineItem.tabs[activeArticleTab]?.content?.split('\n').map((p, i) => <p key={i} className="mb-3">{p}</p>)}
                            </div>
                        </div>
                    </>
                ) : (
                    // Fallback if no tabs
                    <div className="flex-1 overflow-y-auto p-6">
                        <p className={`text-lg leading-relaxed ${theme.textMain}`}>{selectedTimelineItem.description}</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {showWillsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fade-in">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowWillsModal(false)}></div>
             <div className={`md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[85vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                 <div className="hidden md:flex w-1/3 bg-black text-white flex-col justify-between p-8 relative overflow-hidden">
                     <img src="https://picsum.photos/id/452/800/1200" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 animate-ken-burns" />
                     <div className="relative z-10"><div className="w-12 h-12 bg-[#2EB0D9] rounded-lg flex items-center justify-center mb-6"><FileText size={28} className="text-white"/></div><h2 className="text-3xl font-black mb-4">מחולל הצוואות הדיגיטלי</h2></div>
                 </div>
                 <div className={`flex-1 flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                     <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}><span className={`text-sm font-bold ${theme.textMuted}`}>שלב {formStep + 1} מתוך 3</span><button onClick={() => setShowWillsModal(false)} className={`p-2 rounded-full hover:bg-black/10 ${theme.textMuted}`}><X size={24}/></button></div>
                     <div className={`flex-1 overflow-y-auto p-8 md:p-12 ${theme.textMain}`}>
                         {formStep === 0 && <div className="space-y-6"><h3 className={`text-2xl font-bold mb-2 ${theme.textTitle}`}>פרטים אישיים</h3><div className="space-y-4"><input type="text" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={willsData.fullName} onChange={e => setWillsData({...willsData, fullName: e.target.value})} placeholder="שם מלא" /><input type="text" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={willsData.spouseName} onChange={e => setWillsData({...willsData, spouseName: e.target.value})} placeholder="שם בן/בת הזוג" /></div><Button size="lg" onClick={() => setFormStep(1)} className="w-full mt-8">המשך</Button></div>}
                         {formStep === 1 && <div className="space-y-6"><h3 className={`text-2xl font-bold mb-2 ${theme.textTitle}`}>ילדים</h3><div className={`flex items-center gap-4 p-4 rounded-lg border ${theme.cardBg}`}><label className={`font-bold ${theme.textTitle}`}>מספר ילדים:</label><div className="flex items-center gap-2"><button onClick={() => handleChildrenCountChange(Math.max(0, willsData.childrenCount - 1))} className={`w-8 h-8 rounded-full border flex items-center justify-center ${theme.textTitle}`}>-</button><span className={`w-8 text-center font-bold ${theme.textTitle}`}>{willsData.childrenCount}</span><button onClick={() => handleChildrenCountChange(Math.min(10, willsData.childrenCount + 1))} className={`w-8 h-8 rounded-full border flex items-center justify-center ${theme.textTitle}`}>+</button></div></div><div className="space-y-3 max-h-60 overflow-y-auto">{willsData.childrenNames.map((name, idx) => (<input key={idx} placeholder={`שם הילד/ה ${idx+1}`} className={`w-full p-3 border rounded-lg ${theme.inputBg}`} value={name} onChange={e => { const newNames = [...willsData.childrenNames]; newNames[idx] = e.target.value; setWillsData({...willsData, childrenNames: newNames}); }}/>))}</div><div className="flex gap-3 pt-4"><Button variant="outline" onClick={() => setFormStep(0)} className="flex-1">חזור</Button><Button onClick={() => setFormStep(2)} className="flex-1">המשך</Button></div></div>}
                         {formStep === 2 && <div className="space-y-6"><h3 className={`text-2xl font-bold ${theme.textTitle}`}>סיום</h3><input type="tel" className={`w-full p-3 border rounded-lg ${theme.inputBg}`} value={willsData.contactPhone} onChange={e => setWillsData({...willsData, contactPhone: e.target.value})} placeholder="טלפון"/><input type="email" className={`w-full p-3 border rounded-lg ${theme.inputBg}`} value={willsData.contactEmail} onChange={e => setWillsData({...willsData, contactEmail: e.target.value})} placeholder="אימייל"/><div className="flex gap-3 mt-4"><Button variant="outline" onClick={() => setFormStep(1)} className="flex-1">חזור</Button><Button variant="secondary" onClick={handleRealWillsSubmit} className="flex-[2]" disabled={isSubmittingWill}>{isSubmittingWill ? 'מעבד...' : 'צור צוואה'}</Button></div></div>}
                     </div>
                 </div>
             </div>
        </div>
      )}

      {selectedTeamMember && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedTeamMember(null)}></div>
             {/* UPDATED TEAM MEMBER MODAL for better mobile scrolling and actions */}
             <div className={`rounded-2xl shadow-2xl w-full max-w-3xl h-full md:h-auto md:max-h-[85vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                 <button onClick={() => setSelectedTeamMember(null)} className="absolute top-4 left-4 z-20 p-2 bg-black/50 rounded-full hover:bg-black/70 text-white"><X size={20} /></button>
                 <div className="md:w-2/5 h-64 md:h-auto relative flex-shrink-0"><img src={selectedTeamMember.imageUrl} className="w-full h-full object-cover opacity-90" /></div>
                 
                 {/* Main Content Area - Scrollable */}
                 <div className={`flex-1 flex flex-col overflow-hidden`}>
                     <div className={`p-8 overflow-y-auto ${theme.textMain}`}>
                         <span className="text-[#2EB0D9] font-bold text-sm mb-1">{selectedTeamMember.role}</span>
                         <h2 className={`text-3xl font-black mb-2 ${theme.textTitle}`}>{selectedTeamMember.fullName}</h2>
                         <p className={`leading-relaxed text-sm p-4 rounded-lg border mb-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>{selectedTeamMember.bio || 'אין מידע נוסף.'}</p>
                         
                         {/* Action Buttons for Mobile */}
                         <div className="space-y-3 mt-auto">
                             <a href={`mailto:${selectedTeamMember.email}`} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[#2EB0D9]/10 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                 <div className="p-2 bg-[#2EB0D9]/20 rounded-full text-[#2EB0D9]"><Mail size={18}/></div>
                                 <div className="flex flex-col">
                                     <span className="text-xs text-slate-500">שלח מייל</span>
                                     <span className="font-bold text-sm">{selectedTeamMember.email}</span>
                                 </div>
                             </a>
                             <a href={`tel:${selectedTeamMember.phone}`} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[#2EB0D9]/10 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                 <div className="p-2 bg-[#2EB0D9]/20 rounded-full text-[#2EB0D9]"><Phone size={18}/></div>
                                 <div className="flex flex-col">
                                     <span className="text-xs text-slate-500">חייג ישירות</span>
                                     <span className="font-bold text-sm" dir="ltr">{selectedTeamMember.phone}</span>
                                 </div>
                             </a>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      )}

      {/* LEGAL DISCLAIMER MODAL */}
      {showLegalDisclaimer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLegalDisclaimer(false)}></div>
              <div className={`relative z-10 max-w-3xl w-full p-8 rounded-2xl shadow-2xl border border-slate-700 bg-slate-900 max-h-[90vh] flex flex-col`}>
                  <button onClick={() => setShowLegalDisclaimer(false)} className="absolute top-4 left-4 text-slate-400 hover:text-white"><X size={24}/></button>
                  <div className="flex items-center gap-3 mb-6 text-yellow-500 flex-shrink-0">
                      <AlertOctagon size={32} />
                      <h2 className="text-2xl font-black">תנאי שימוש והצהרת פרטיות</h2>
                  </div>
                  <div className="space-y-4 text-slate-300 leading-relaxed text-sm overflow-y-auto pr-2 custom-scrollbar flex-1">
                      <p className="font-bold text-white">1. כללי</p>
                      <p>השימוש באתר זה ("האתר") ובשירותים המוצעים בו, לרבות מחולל הצוואות והטפסים המקוונים, כפוף לתנאי השימוש המפורטים להלן. הגלישה באתר ושימוש בשירותיו מהווה הסכמה מלאה ובלתי מסויגת לתנאים אלו.</p>
                      
                      <p className="font-bold text-white">2. היעדר ייעוץ משפטי מחייב</p>
                      <p>התכנים, המאמרים, והמידע המופיעים באתר נועדו למטרות אינפורמטיביות בלבד ואינם מהווים ייעוץ משפטי, חוות דעת מקצועית או תחליף להתייעצות עם עורך דין. כל שימוש במידע זה נעשה על אחריות המשתמש בלבד. אין להסתמך על המידע באת לצורך קבלת החלטות משפטיות או אחרות ללא קבלת ייעוץ אישי המתחשב בנסיבות הספציפיות.</p>
                      
                      <p className="font-bold text-white">3. אחריות על מסמכים אוטומטיים</p>
                      <p>מחולל הצוואות והטפסים באתר מפיק מסמכים על בסיס הנתונים המוזנים על ידי המשתמש. משרד עורכי הדין ו/או מפעילי האתר אינם בודקים את הנתונים המוזנים ואינם אחראים לנכונותם, חוקיותם או תקפותם המשפטית של המסמכים המופקים באופן זה. האחריות על בדיקת המסמך הסופי מוטלת על המשתמש.</p>
                      
                      <p className="font-bold text-white">4. קניין רוחני</p>
                      <p>כל זכויות הקניין הרוחני באתר, לרבות עיצובו, קוד המקור, תכנים טקסטואליים, לוגו ושם המשרד, שמורות למשרד {state.config.officeName}. אין להעתיק, לשכפל, להפיץ או לעשות כל שימוש מסחרי בתכנים ללא אישור בכתב ומראש.</p>
                      
                      <p className="font-bold text-white">5. הגבלת אחריות</p>
                      <p>מפעילי האתר לא יישאו בכל אחריות לכל נזק, ישיר או עקיף, שייגרם למשתמש או לצד שלישי כלשהו כתוצאה משימוש באתר, אי-זמינות האתר, או הסתמכות על תכניו.</p>
                      
                      <p className="font-bold text-white">6. מדיניות פרטיות</p>
                      <p>אנו מכבדים את פרטיותך. המידע האישי שיימסר על ידך (כגון שם, טלפון, דוא"ל) יישמר במאגרי המידע של המשרד וישמש לצורך יצירת קשר ומתן השירותים המבוקשים בלבד. המשרד נוקט באמצעי אבטחה מקובלים אך אינו יכול להבטיח חסינות מוחלטת מפני חדירה למחשביו.</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800 text-center flex-shrink-0">
                      <Button onClick={() => setShowLegalDisclaimer(false)} className="w-full">קראתי ואני מסכים</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Header, Main, Footer sections same as before, just rendering `selectedTimelineItem` logic added above */}
      <header className={`fixed top-0 left-0 right-0 backdrop-blur-md shadow-lg z-40 h-20 transition-all border-b ${theme.headerBg}`}>
        {/* ... Header content ... */}
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4"><h1 className="text-lg md:text-xl font-black tracking-wide cursor-pointer leading-none" onClick={() => onCategoryChange(Category.HOME)} style={{ fontFamily: "'MyLogoFont', Cambria, serif" }}><span className="block text-[#2EB0D9] drop-shadow-md">MOR ERAN KAGAN</span><span className={`${theme.textMuted} text-sm tracking-widest font-sans font-normal`}>& CO</span></h1></div>
          <nav className="hidden md:flex items-center gap-6">{state.menuItems.map(item => (<button key={item.id} onClick={() => onCategoryChange(item.cat)} className={`text-sm font-medium transition-colors border-b-2 hover:text-[#2EB0D9] ${state.currentCategory === item.cat ? 'text-[#2EB0D9] border-[#2EB0D9]' : `${theme.textMuted} border-transparent`}`}>{item.label}</button>))}<div className={`w-px h-6 mx-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div><button className={`${theme.textMuted} hover:text-[#2EB0D9]`}><Search size={20}/></button></nav>
          <button className={`md:hidden ${theme.textTitle}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
        {mobileMenuOpen && (<div className={`md:hidden absolute top-20 left-0 w-full shadow-xl border-t p-4 flex flex-col gap-4 animate-fade-in-up ${theme.modalBg}`}>{state.menuItems.map(item => (<button key={item.id} onClick={() => { onCategoryChange(item.cat); setMobileMenuOpen(false); }} className={`text-right p-2 rounded-lg font-medium hover:bg-black/5 ${theme.textMain}`}>{item.label}</button>))}</div>)}
      </header>

      <main className="flex-1 pt-20 relative z-10">
        <section className="relative h-[45vh] md:h-[55vh] overflow-hidden bg-black group">
          <div className="absolute left-8 top-[15%] z-30 hidden lg:block opacity-90 hover:opacity-100 transition-opacity animate-float"><img src={state.config.logoUrl} alt="Logo" className="h-28 w-auto object-contain drop-shadow-2xl" style={{ filter: "drop-shadow(0 10px 8px rgb(0 0 0 / 0.8))" }}/></div>
          {currentSlides.map((slide, index) => (
             <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-full h-full overflow-hidden"><img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover opacity-50 animate-ken-burns" /></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex items-center pb-20">
                    <div className="container mx-auto px-6 md:px-12">
                        <div className="max-w-4xl text-white space-y-4 animate-fade-in-up">
                            <span className="inline-block px-4 py-1 bg-[#2EB0D9]/90 text-xs font-bold uppercase tracking-widest rounded-full mb-1 text-white shadow-lg">{slide.category === Category.HOME ? 'המשרד המוביל בישראל' : CATEGORY_LABELS[slide.category]}</span>
                            <h2 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-2xl text-white">{slide.title}</h2>
                            <p className="hidden md:block text-lg text-slate-300 md:w-3/4 border-r-4 border-[#2EB0D9] pr-4 leading-relaxed font-light">{slide.subtitle}</p>
                            
                            {/* NEW: CUSTOM SLIDER LINK LOGIC */}
                            <div className="pt-4 flex gap-3">
                                <Button onClick={() => handleSliderClick(slide)} variant="secondary" size="md" className="shine-effect">{slide.buttonText || 'קרא עוד'}</Button>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          ))}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-3 z-20">{currentSlides.map((_, idx) => (<button key={idx} onClick={() => setActiveSlide(idx)} className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'bg-[#2EB0D9] w-12' : 'bg-white/30 w-3 hover:bg-white'}`} />))}</div>
        </section>

        {/* TEAM SECTION - HOME ONLY */}
        {showTeamSection && (
            <Reveal className="relative z-20 -mt-20 container mx-auto px-4">
                 <div className={`shadow-2xl rounded-2xl p-6 border ${theme.cardBg}`}>
                     <div className="flex justify-between items-center mb-6"><SectionTitle title="הנבחרת שלנו" isDark={isDark} /><div className="hidden md:flex gap-2"><button onClick={() => scrollContainer(teamScrollRef, 'right')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronRight size={24}/></button><button onClick={() => scrollContainer(teamScrollRef, 'left')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronLeft size={24}/></button></div></div>
                     <div ref={teamScrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x mx-auto w-full">{teamMembers.map(member => (<div key={member.id} onClick={() => setSelectedTeamMember(member)} className={`flex-shrink-0 w-[200px] md:w-[calc(25%-18px)] snap-center lg:snap-start group cursor-pointer rounded-xl overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-2 border ${theme.cardBg} ${theme.cardHover}`}><div className="h-32 md:h-48 w-full overflow-hidden relative"><img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover animate-ken-burns grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2"><span className="text-white font-bold text-xs bg-[#2EB0D9] px-2 py-0.5 rounded-full">פרטים</span></div></div><div className="p-3 text-center"><h4 className={`font-bold text-base md:text-lg mb-1 group-hover:text-[#2EB0D9] transition-colors ${theme.textTitle}`}>{member.fullName}</h4><p className={`text-[10px] md:text-xs font-medium uppercase tracking-wide line-clamp-1 ${theme.textMuted}`}>{member.role}</p></div></div>))}</div>
                 </div>
            </Reveal>
        )}

        {/* PRODUCTS / PAYMENTS SECTION - REPLACES TEAM ON LEGAL & STORE PAGES */}
        {showProductsSection && (
            <Reveal className="relative z-20 -mt-20 container mx-auto px-4 mb-20">
                 <div className={`shadow-2xl rounded-2xl p-6 border ${theme.cardBg}`}>
                     <div className="flex justify-between items-center mb-6"><SectionTitle title={isStorePage ? "החנות המשפטית" : "שירותים לרכישה אונליין"} isDark={isDark} /></div>
                     <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x mx-auto w-full">
                         {storeProducts.length > 0 ? storeProducts.map((product) => (
                             <div key={product.id} className={`flex-shrink-0 w-[200px] md:w-[calc(25%-18px)] snap-center lg:snap-start group rounded-xl overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-2 border ${theme.cardBg} ${theme.cardHover} flex flex-col`}>
                                 <div className={`h-32 md:h-48 w-full flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                     <div className="absolute inset-0 flex items-center justify-center"><div className="bg-white/10 backdrop-blur-sm p-3 rounded-full border border-white/20 group-hover:scale-110 transition-transform duration-500"><FileText size={24} className="text-white"/></div></div>
                                 </div>
                                 <div className="p-3 text-center flex-1 flex flex-col">
                                     <div className="mb-1 flex flex-wrap justify-center gap-1">
                                         {product.categories && product.categories.slice(0, 1).map(cat => (
                                             <span key={cat} className="text-[10px] font-bold text-[#2EB0D9] bg-[#2EB0D9]/10 px-2 py-0.5 rounded border border-[#2EB0D9]/20 uppercase tracking-wide">{CATEGORY_LABELS[cat]}</span>
                                         ))}
                                     </div>
                                     <h4 className={`font-bold text-base md:text-lg mb-1 line-clamp-1 ${theme.textTitle}`}>{product.title}</h4>
                                     <p className="text-slate-400 text-xs mb-2 line-clamp-2">{product.description}</p>
                                     <div className={`text-lg font-black mb-3 ${theme.textMuted} flex-1 flex items-center justify-center`}>₪{product.price}</div>
                                     <Button onClick={() => handleProductClick(product)} className="w-full shine-effect text-xs py-1.5 h-8" variant="secondary">רכוש כעת</Button>
                                 </div>
                             </div>
                         )) : <div className="p-8 text-center w-full text-slate-500">לא נמצאו מוצרים בקטגוריה זו.</div>}
                     </div>
                 </div>
            </Reveal>
        )}

        {/* NEWS & UPDATES (TIMELINE) - HOME & LEGAL PAGES */}
        {showTimelineSection && (
            <Reveal className={`py-20 relative border-b ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`} delay={200}>
               {/* UPDATED TITLE */}
               <div className="container mx-auto px-4 mb-8 flex justify-between items-end"><SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} /><div className="hidden md:flex gap-2"><button onClick={() => scrollContainer(timelineScrollRef, 'right')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronRight size={24}/></button><button onClick={() => scrollContainer(timelineScrollRef, 'left')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronLeft size={24}/></button></div></div>
               <div className="container mx-auto px-4"><div ref={timelineScrollRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x">{currentTimelines.map((item, index) => { const isGenerator = item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-')); const brandGradients = ['from-[#2EB0D9] to-[#1F8CAD]', 'from-[#2EB0D9] to-[#0EA5E9]', 'from-[#06B6D4] to-[#2EB0D9]', 'from-[#22D3EE] to-[#0090B0]']; const selectedGradient = brandGradients[index % brandGradients.length]; const bgClass = isGenerator ? `bg-gradient-to-br ${selectedGradient} text-white shadow-xl shadow-cyan-500/20 transform hover:-translate-y-2` : `${theme.cardBg} ${theme.cardHover} transition-all duration-300 transform hover:-translate-y-2`; const textClass = isGenerator ? 'text-white' : theme.textTitle; const descClass = isGenerator ? 'text-white/90' : theme.textMuted; return (<div key={item.id} onClick={() => handleTimelineClick(item)} className={`flex-shrink-0 w-[140px] md:w-[calc(25%-18px)] rounded-2xl shadow-lg overflow-hidden cursor-pointer group snap-start flex flex-col h-[200px] md:h-[240px] border border-transparent ${bgClass}`}><div className="p-4 md:p-6 flex flex-col h-full relative"><div className={`absolute top-4 left-4 p-2 rounded-full shadow-sm ${isGenerator ? 'bg-white/20' : `${isDark ? 'bg-slate-800' : 'bg-slate-100'} text-[#2EB0D9]`}`}>{isGenerator ? <FileText size={16} className="text-white"/> : (item.imageUrl ? <Newspaper size={16}/> : <ArrowLeft size={16}/>)}</div><div className="mt-8"><h4 className={`text-sm md:text-xl font-black mb-2 leading-tight ${textClass} line-clamp-2`}>{item.title}</h4><p className={`text-[10px] md:text-xs leading-relaxed line-clamp-3 ${descClass}`}>{item.description}</p></div><div className="mt-auto pt-2 flex items-center justify-between"><span className={`text-[10px] md:text-xs font-bold flex items-center gap-1 ${isGenerator ? 'text-white' : 'text-[#2EB0D9] group-hover:translate-x-[-4px] transition-transform'}`}>{isGenerator ? 'התחל עכשיו' : 'קרא עוד'} <ArrowLeft size={12}/></span></div></div></div>);})}</div></div>
            </Reveal>
        )}

        {/* DYNAMIC FORM RENDERER */}
        {currentDynamicForm && (
            <div ref={dynamicFormRef} className={`mb-20 container mx-auto px-4 rounded-2xl p-8 md:p-12 shadow-2xl border-t-4 border-[#2EB0D9] animate-fade-in-up border-x border-b ${theme.cardBg}`}>
                 {/* ... Form Content ... */}
                 <div className="max-w-2xl mx-auto">
                     <div className="flex justify-between items-start mb-6"><div><h3 className={`text-3xl font-bold mb-2 ${theme.textTitle}`}>{currentDynamicForm.title}</h3><p className={theme.textMuted}>נא למלא את כל השדות הנדרשים</p></div><button onClick={() => setActiveDynamicFormId(null)} className={`${theme.textMuted} hover:opacity-70`}><X size={32}/></button></div>
                     <div className={`space-y-6 p-8 rounded-xl border shadow-inner ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         {currentDynamicForm.fields.map(field => (
                             <div key={field.id} className="space-y-2">
                                 <div className="flex items-center gap-2">
                                     <label className={`block text-sm font-bold ${theme.textMuted}`}>{field.label}</label>
                                     {field.helpArticleId && (
                                         <button onClick={() => openHelpArticle(field.helpArticleId!)} className="text-[#2EB0D9] hover:text-[#259cc0] transition-colors" title="לחץ לעזרה">
                                             <HelpCircle size={16} />
                                         </button>
                                     )}
                                 </div>
                                 
                                 {field.type === 'text' && <input type="text" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                 {field.type === 'number' && <input type="number" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                 {field.type === 'boolean' && (
                                     <div className="flex gap-4">
                                         <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                                             <input type="radio" name={field.id} checked={dynamicFormValues[field.id] === 'yes'} onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: 'yes'})} className="accent-[#2EB0D9]"/>
                                             כן
                                         </label>
                                         <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                                             <input type="radio" name={field.id} checked={dynamicFormValues[field.id] === 'no'} onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: 'no'})} className="accent-[#2EB0D9]"/>
                                             לא
                                         </label>
                                     </div>
                                 )}
                                 {field.type === 'select' && <select className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}><option value="">בחר...</option>{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>}
                             </div>
                         ))}
                         <Button className="w-full mt-6 py-4 text-lg font-bold shine-effect" variant="secondary" disabled={isSubmittingDynamic} onClick={async () => { 
                             setIsSubmittingDynamic(true); 
                             
                             // 1. Generate Unique Submission ID
                             const submissionId = generateSubmissionId();

                             // 2. Map numeric IDs to human-readable labels
                             const mappedData: any = { submissionId };
                             Object.keys(dynamicFormValues).forEach(key => {
                                 const fieldDef = currentDynamicForm.fields.find(f => f.id === key);
                                 const label = fieldDef ? fieldDef.label : key;
                                 mappedData[label] = dynamicFormValues[key];
                             });

                             // 3. Add Submit Email if defined in form
                             if (currentDynamicForm.submitEmail) {
                                 mappedData.submitEmail = currentDynamicForm.submitEmail;
                             } else {
                                 mappedData.submitEmail = state.config.contactEmail; // Fallback to office email
                             }

                             try { 
                                 await emailService.sendForm(currentDynamicForm.title, mappedData, state.config.integrations, currentDynamicForm.pdfTemplate); 
                                 
                                 if (state.config.integrations.googleSheetsUrl) {
                                     alert(`נשלח בהצלחה למערכת!\nמספר אסמכתא: ${submissionId}\nמסמך ה-PDF (אם רלוונטי) יישלח למייל המוגדר.`);
                                 } else {
                                     alert("נשלח בהצלחה! (מצב ללא חיבור לשרת).");
                                 }

                                 setActiveDynamicFormId(null); 
                                 setDynamicFormValues({}); 
                             } catch { alert("שגיאה"); } finally { setIsSubmittingDynamic(false); } 
                         }}>{isSubmittingDynamic ? 'שולח...' : 'שלח טופס'}</Button>
                     </div>
                 </div>
            </div>
        )}

        {/* ARTICLES GRID - HOME, LEGAL, STORE */}
        {showArticlesGrid && (
            <Reveal delay={300} className="py-20 container mx-auto px-4">
                     <SectionTitle title={state.currentCategory === Category.HOME ? "מאמרים נבחרים" : "מאמרים נוספים"} isDark={isDark} />
                     <div ref={articlesScrollRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x">
                        {currentArticles.map(article => (<div key={article.id} className="flex-shrink-0 w-[220px] md:w-[calc(25%-18px)] h-[300px] md:h-[380px] snap-start"><ArticleCard article={article} onClick={() => setSelectedArticle(article)} /></div>))}
                     </div>
            </Reveal>
        )}

        {/* CONTACT PAGE - UNIQUE LAYOUT */}
        {isContactPage && (
            <Reveal className="relative z-20 -mt-20 container mx-auto px-4 mb-20">
                <SectionTitle title="צור קשר" isDark={isDark} />
                <div className={`rounded-3xl overflow-hidden shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-8 md:p-12">
                           <h3 className={`text-2xl font-bold mb-6 ${theme.textTitle}`}>שלחו לנו הודעה</h3>
                           <div className="space-y-4"><div><label className={`block text-sm font-bold mb-2 ${theme.textMuted}`}>שם מלא</label><input type="text" className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition ${theme.inputBg}`} value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} placeholder="שם מלא"/></div><div><label className={`block text-sm font-bold mb-2 ${theme.textMuted}`}>טלפון</label><input type="tel" className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition ${theme.inputBg}`} value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} placeholder="050-0000000"/></div><div><label className={`block text-sm font-bold mb-2 ${theme.textMuted}`}>הודעה</label><textarea className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition h-32 ${theme.inputBg}`} value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} placeholder="כיצד נוכל לעזור?"></textarea></div><Button className="w-full py-4 text-lg font-bold shine-effect" variant="secondary" onClick={handleContactSubmit} disabled={contactSending}>{contactSending ? <Loader2 className="animate-spin inline ml-2"/> : null}{contactSending ? 'שולח...' : 'שלח הודעה'}</Button></div>
                        </div>
                        <div className="bg-slate-950 p-8 md:p-12 text-slate-300 flex flex-col justify-between border-t md:border-t-0 md:border-r border-slate-800" dir="rtl"><div className="space-y-8"><div><h2 className="text-3xl font-black text-white mb-2 leading-tight" style={{ fontFamily: "'MyLogoFont', Cambria, serif" }}><span className="text-[#2EB0D9]">MOR ERAN KAGAN</span><br/>& CO</h2><p className="text-slate-500 text-sm">משרד עורכי דין מוביל המעניק ליווי משפטי מקיף, מקצועי ואישי.</p></div><ul className="space-y-6"><li className="flex items-start gap-4"><MapPin size={24} className="text-[#2EB0D9] shrink-0"/> <div><span className="block text-white font-bold">כתובת</span><span className="text-slate-400">{state.config.address}</span></div></li><li className="flex items-center gap-4"><Phone size={24} className="text-[#2EB0D9] shrink-0"/> <div><span className="block text-white font-bold">טלפון</span><span className="text-slate-400" dir="ltr">{state.config.phone}</span></div></li><li className="flex items-center gap-4"><Mail size={24} className="text-[#2EB0D9] shrink-0"/> <div><span className="block text-white font-bold">דוא"ל</span><span className="text-slate-400">{state.config.contactEmail}</span></div></li></ul></div><div className="mt-8"><div className="flex gap-3"><Button className="flex-1 gap-2 text-xs" variant="outline" onClick={() => window.open(`https://waze.com/ul?q=${state.config.address}`)}><Navigation size={14}/> נווט עם Waze</Button><Button className="flex-1 gap-2 text-xs" variant="outline" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${state.config.address}`)}><MapPin size={14}/> Google Maps</Button></div></div></div>
                    </div>
                </div>
            </Reveal>
        )}

        {showFormsListModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowFormsListModal(false)}></div>
                <div className={`rounded-xl shadow-2xl w-full max-w-lg relative z-10 animate-fade-in-up border p-6 ${theme.modalBg}`}>
                    <div className="flex justify-between items-center mb-4"><h3 className={`text-xl font-bold ${theme.textTitle}`}>טפסים זמינים</h3><button onClick={() => setShowFormsListModal(false)}><X className={theme.textMuted}/></button></div>
                    <div className="space-y-3">
                        {hasWillsGenerator && (
                            <button onClick={() => { setShowWillsModal(true); setShowFormsListModal(false); }} className={`w-full p-4 rounded-lg border flex items-center justify-between group transition-colors bg-gradient-to-r from-[#2EB0D9]/20 to-transparent border-[#2EB0D9]/50`}>
                                <span className={`font-bold ${theme.textTitle}`}>מחולל צוואות דיגיטלי</span><FileText className={`text-[#2EB0D9]`}/>
                            </button>
                        )}
                        {currentCategoryForms.map(form => (
                            <button key={form.id} onClick={() => { setActiveDynamicFormId(form.id); setDynamicFormValues({}); setShowFormsListModal(false); setTimeout(() => dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 300); }} className={`w-full p-4 rounded-lg border flex items-center justify-between group transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:border-[#2EB0D9]' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
                                <span className={`font-bold ${theme.textTitle}`}>{form.title}</span><ChevronLeft className={`text-[#2EB0D9] opacity-0 group-hover:opacity-100 transition-opacity`}/>
                            </button>
                        ))}
                        {!hasWillsGenerator && currentCategoryForms.length === 0 && <p className={theme.textMuted}>אין טפסים זמינים בקטגוריה זו כרגע.</p>}
                    </div>
                </div>
            </div>
        )}

        {/* GLOBAL FOOTER */}
        {showGlobalFooter && (
            <footer className="bg-black text-slate-400 pt-20 pb-10 relative z-10 border-t border-slate-900">
                <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 items-start text-right" dir="rtl">
                    <div className="col-span-1 flex flex-col items-start">
                        <h2 className="text-2xl font-black text-white mb-6 leading-tight" style={{ fontFamily: "'MyLogoFont', Cambria, serif" }}><span className="text-[#2EB0D9]">MOR ERAN KAGAN</span><br/>& CO</h2>
                        <p className="mb-6 text-sm leading-relaxed max-w-xs text-slate-500">משרד עורכי דין מוביל המעניק ליווי משפטי מקיף, מקצועי ואישי.</p>
                        {onAdminClick && <button onClick={onAdminClick} className="p-2 border border-slate-800 rounded-full"><Settings size={16}/></button>}
                    </div>
                    
                    <div className="col-span-1 flex flex-col items-start">
                        <h4 className="text-white font-bold mb-6 text-lg border-r-4 border-[#2EB0D9] pr-4">פרטי התקשרות</h4>
                        <ul className="space-y-4 w-full">
                            <li className="flex items-start gap-4 hover:text-white transition-colors">
                                <MapPin size={22} className="text-[#2EB0D9]"/> 
                                <a href={`https://waze.com/ul?q=${encodeURIComponent(state.config.address)}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">{state.config.address}</a>
                            </li>
                            <li className="flex items-center gap-4 hover:text-white transition-colors">
                                <Phone size={22} className="text-[#2EB0D9]"/> 
                                <a href={`tel:${state.config.phone}`} className="text-slate-400 hover:text-white transition-colors" dir="ltr">{state.config.phone}</a>
                            </li>
                            <li className="flex items-center gap-4 hover:text-white transition-colors">
                                <Mail size={22} className="text-[#2EB0D9]"/> 
                                <a href={`mailto:${state.config.contactEmail}`} className="text-slate-400 hover:text-white transition-colors">{state.config.contactEmail}</a>
                            </li>
                            
                            {/* FAX & WHATSAPP FROM CONFIG */}
                            {state.config.fax && (
                                <li className="flex items-center gap-4">
                                    <Printer size={22} className="text-[#2EB0D9]"/> 
                                    <span className="text-slate-400">{state.config.fax}</span>
                                </li>
                            )}
                            {state.config.whatsapp && (
                                <li className="flex items-center gap-4 hover:text-white transition-colors">
                                    <MessageCircle size={22} className="text-[#2EB0D9]"/> 
                                    <a href={`https://wa.me/${state.config.whatsapp}`} target="_blank" className="text-slate-400 hover:text-white transition-colors" dir="ltr">{state.config.whatsapp}</a>
                                </li>
                            )}
                        </ul>
                    </div>
                    
                    <div className="col-span-1">
                        <div className="w-full h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-800"><iframe width="100%" height="100%" frameBorder="0" style={{ border: 0, opacity: 0.6, filter: 'invert(90%) hue-rotate(180deg)' }} src={`https://maps.google.com/maps?q=${encodeURIComponent(state.config.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe></div>
                    </div>
                </div>
                <div className="container mx-auto px-4 pt-8 border-t border-slate-900 text-center text-sm text-slate-600 flex flex-col items-center gap-2">
                    <p>&copy; {new Date().getFullYear()} MOR ERAN KAGAN & CO.</p>
                    <button onClick={() => setShowLegalDisclaimer(true)} className="text-xs text-slate-500 hover:text-[#2EB0D9] underline transition-colors">תנאי שימוש והצהרת פרטיות</button>
                    <div className="text-[10px] text-slate-800 mt-2">{version}</div>
                </div>
            </footer>
        )}
      </main>
      <FloatingWidgets version={version} dataVersion={dataVersion} />
    </div>
  );
};
