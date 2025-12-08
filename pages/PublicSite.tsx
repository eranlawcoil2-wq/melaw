import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { emailService, storeService } from '../services/api.ts'; // IMPORT SERVICES
import { Search, Phone, MapPin, Mail, Menu, X, Check, ArrowLeft, Navigation, FileText, Quote, Lock, Settings, Briefcase, User, ArrowRight, ChevronLeft, ChevronRight, FileCheck, HelpCircle, Loader2, ShoppingBag } from 'lucide-react';

// --- Scroll Reveal Helper Component ---
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = "", delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setIsVisible(true), delay);
                    observer.disconnect(); // Only animate once
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [delay]);

    return (
        <div ref={ref} className={`reveal ${isVisible ? 'active' : ''} ${className}`}>
            {children}
        </div>
    );
};

// --- Reusable Section Title Component (Enhanced) ---
const SectionTitle: React.FC<{ title: string; isDark: boolean }> = ({ title, isDark }) => (
    <div className="mb-10">
        <h3 className={`text-4xl font-black inline-block relative z-10 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {title}
        </h3>
        <div className="h-1.5 w-24 bg-gradient-to-r from-[#2EB0D9] to-blue-600 mt-3 rounded-full"></div>
    </div>
);

interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: WillsFormData) => void;
  onAdminClick?: () => void;
}

export const PublicSite: React.FC<PublicSiteProps> = ({ state, onCategoryChange, onWillsFormSubmit, onAdminClick }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Modal State
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showWillsModal, setShowWillsModal] = useState(false); 
  const [isSubmittingWill, setIsSubmittingWill] = useState(false); // Loading state
  const [activeArticleTab, setActiveArticleTab] = useState(0); 
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);

  // Dynamic Form State
  const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  
  // Theme Helper Logic
  const isDark = state.config.theme === 'dark'; // Check theme preference
  
  // Theme Classes Mapping (Enhanced)
  const theme = {
      bgMain: isDark ? 'bg-slate-950' : 'bg-slate-50',
      textMain: isDark ? 'text-slate-200' : 'text-slate-800',
      headerBg: isDark ? 'bg-slate-950/80 shadow-black/20 border-slate-800' : 'bg-white/80 shadow-slate-200/50 border-slate-200',
      // Cards now have a more premium border/shadow
      cardBg: isDark ? 'bg-slate-900/90 border-slate-700/50 backdrop-blur-md' : 'bg-white/90 border-slate-200 backdrop-blur-md shadow-sm',
      cardHover: isDark ? 'hover:border-[#2EB0D9]/50 hover:shadow-[0_0_30px_rgba(46,176,217,0.15)]' : 'hover:border-[#2EB0D9]/50 hover:shadow-2xl',
      inputBg: isDark ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
      modalBg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100',
      textTitle: isDark ? 'text-white' : 'text-slate-900',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
      border: isDark ? 'border-slate-800' : 'border-slate-200',
  };

  // Refs
  const dynamicFormRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const teamScrollRef = useRef<HTMLDivElement>(null);
  const articlesScrollRef = useRef<HTMLDivElement>(null);
  const articleContentTopRef = useRef<HTMLDivElement>(null);

  // Filter content
  const currentSlides = state.slides.filter(s => s.category === state.currentCategory || s.category === Category.HOME);
  const currentArticles = state.articles.filter(a => a.category === state.currentCategory || state.currentCategory === Category.HOME);
  const currentTimelines = state.timelines.filter(t => t.category.includes(state.currentCategory) || state.currentCategory === Category.HOME);
  const teamMembers = state.teamMembers;

  // Slider Auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % currentSlides.length);
    }, 6000); 
    return () => clearInterval(interval);
  }, [currentSlides.length]);

  // Reset active tab and scroll when opening a new article
  useEffect(() => {
      if(selectedArticle) {
          setActiveArticleTab(0);
          if(articleContentTopRef.current) {
              articleContentTopRef.current.scrollTop = 0;
          }
      }
  }, [selectedArticle]);

  const handleTimelineClick = (item: any) => {
    if (item.linkTo === 'wills-generator') {
        setShowWillsModal(true); 
    } else if (item.linkTo && item.linkTo.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setTimeout(() => {
            dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else {
        console.log("Clicked timeline item", item.title);
    }
  };

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
      if (ref.current) {
          const scrollAmount = 350;
          ref.current.scrollBy({
              left: direction === 'left' ? -scrollAmount : scrollAmount,
              behavior: 'smooth'
          });
      }
  };

  // Wills Form State
  const [willsData, setWillsData] = useState<WillsFormData>({
    fullName: '', spouseName: '', childrenCount: 0, childrenNames: [], equalDistribution: true, assets: [], contactEmail: '', contactPhone: ''
  });
  const [formStep, setFormStep] = useState(0);

  const handleChildrenCountChange = (count: number) => {
    setWillsData(prev => ({
        ...prev,
        childrenCount: count,
        childrenNames: Array(count).fill('')
    }));
  };
  
  // Handle Wills Submission
  const handleRealWillsSubmit = async () => {
      setIsSubmittingWill(true);
      try {
          await emailService.sendWillsForm(willsData);
          onWillsFormSubmit(willsData);
          alert("הטופס נקלט בהצלחה! קובץ הצוואה יורד כעת למחשב שלך."); 
          setShowWillsModal(false);
          setFormStep(0);
      } catch (error) {
          alert("אירעה שגיאה, אנא נסה שנית.");
      } finally {
          setIsSubmittingWill(false);
      }
  };

  const currentDynamicForm = state.forms.find(f => f.id === activeDynamicFormId);
  const activeTabContent = selectedArticle?.tabs?.[activeArticleTab]?.content || "";
  
  const relatedArticles = selectedArticle 
    ? state.articles.filter(a => a.category === selectedArticle.category && a.id !== selectedArticle.id).slice(0, 3)
    : [];

  // --- STORE VIEW RENDERER ---
  if (state.currentCategory === Category.STORE) {
      const products = storeService.getProducts();
      return (
          <div className={`min-h-screen pt-24 pb-12 px-4 ${theme.bgMain} ${theme.textMain}`}>
              {/* Reuse Header logic for consistency */}
              <header className={`fixed top-0 left-0 right-0 backdrop-blur-md shadow-lg z-40 h-20 transition-all border-b ${theme.headerBg}`}>
                <div className="container mx-auto px-4 h-full flex items-center justify-between">
                  <h1 className="text-lg md:text-xl font-black tracking-wide cursor-pointer font-serif leading-none" onClick={() => onCategoryChange(Category.HOME)}>
                       <span className="block text-[#2EB0D9]">MOR ERAN KAGAN</span>
                       <span className={`${theme.textMuted} text-sm tracking-widest font-sans font-normal`}>& CO</span>
                  </h1>
                  <nav className="hidden md:flex items-center gap-6">
                    {state.menuItems.map(item => (
                      <button key={item.id} onClick={() => onCategoryChange(item.cat)} className={`text-sm font-medium transition-colors hover:text-[#2EB0D9] ${state.currentCategory === item.cat ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : theme.textMuted}`}>
                        {item.label}
                      </button>
                    ))}
                  </nav>
                  <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
                </div>
                {mobileMenuOpen && (
                   <div className={`md:hidden absolute top-20 left-0 w-full shadow-xl border-t p-4 flex flex-col gap-4 animate-fade-in-up ${theme.modalBg}`}>
                      {state.menuItems.map(item => (
                        <button key={item.id} onClick={() => { onCategoryChange(item.cat); setMobileMenuOpen(false); }} className={`text-right p-2 rounded-lg font-medium hover:bg-black/5 ${theme.textMain}`}>{item.label}</button>
                      ))}
                   </div>
                )}
              </header>

              <div className="container mx-auto max-w-6xl animate-fade-in-up">
                  <div className="text-center mb-16">
                      <div className="inline-block p-4 bg-[#2EB0D9]/10 rounded-full mb-4 border border-[#2EB0D9]/30">
                          <ShoppingBag size={48} className="text-[#2EB0D9]" />
                      </div>
                      <h2 className={`text-4xl font-black mb-4 ${theme.textTitle}`}>החנות המשפטית</h2>
                      <p className={`text-xl max-w-2xl mx-auto ${theme.textMuted}`}>רכשו שירותים משפטיים ומוצרים דיגיטליים בצורה מאובטחת, מהירה ונגישה.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                      {products.map(product => (
                          <div key={product.id} className={`${theme.cardBg} border rounded-2xl overflow-hidden transition-all hover:-translate-y-2 group ${theme.cardHover}`}>
                              <div className={`h-48 flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                  <div className="absolute inset-0 bg-[#2EB0D9]/5 group-hover:bg-[#2EB0D9]/10 transition-colors"></div>
                                  <FileText size={64} className="text-slate-500 group-hover:text-[#2EB0D9] transition-colors duration-500 transform group-hover:scale-110"/>
                              </div>
                              <div className="p-8">
                                  <div className="mb-4">
                                      <span className="text-xs font-bold text-[#2EB0D9] bg-[#2EB0D9]/10 px-2 py-1 rounded border border-[#2EB0D9]/20">
                                          {CATEGORY_LABELS[product.category]}
                                      </span>
                                  </div>
                                  <h3 className={`text-2xl font-bold mb-2 ${theme.textTitle}`}>{product.title}</h3>
                                  <p className={`${theme.textMuted} mb-6 text-sm`}>המוצר כולל ליווי ראשוני, הכנת מסמכים והגשה לגורמים הרלוונטיים.</p>
                                  <div className="flex items-center justify-between mt-auto">
                                      <span className={`text-3xl font-black ${theme.textTitle}`}>₪{product.price}</span>
                                      <Button onClick={() => {
                                          const link = storeService.getCheckoutLink(product.id);
                                          if (link && link !== "#" && !link.includes("buy.stripe.com/test")) {
                                              window.open(link, '_blank');
                                          } else {
                                              alert(`כאן יפתח חלון תשלום של Stripe עבור: ${product.title}\n(כרגע במצב דמו)`);
                                          }
                                      }} className="px-6 shine-effect">רכוש כעת</Button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <FloatingWidgets />
          </div>
      );
  }

  // --- REGULAR SITE RENDER ---
  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-[#2EB0D9] selection:text-white ${theme.bgMain} ${theme.textMain}`}>
      
      {/* Background Gradient Mesh Animation (The WOW factor) */}
      <div className={`fixed inset-0 pointer-events-none z-0 ${isDark ? 'opacity-30' : 'opacity-60'} overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#2EB0D9]/20 via-transparent to-purple-500/20 animate-gradient-xy"></div>
          {/* Floating Orbs */}
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#2EB0D9]/20 rounded-full blur-[100px] animate-float-slow"></div>
          <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] bg-cyan-400/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* --- Article Modal Overlay --- */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fade-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedArticle(null)}></div>
            <div className={`md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                <div className={`hidden md:block w-1/4 h-full relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <img src={selectedArticle.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover animate-ken-burns opacity-70" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-slate-900' : 'from-white'} to-transparent`}></div>
                    {selectedArticle.quote && (
                        <div className={`absolute bottom-8 left-4 right-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <Quote size={24} className="mb-2 text-[#2EB0D9] opacity-80" />
                            <p className="font-serif italic text-lg leading-relaxed shadow-sm">"{selectedArticle.quote}"</p>
                        </div>
                    )}
                </div>
                <div className={`flex-1 flex flex-col h-full relative ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className={`p-6 md:p-8 border-b flex justify-between items-start flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div>
                            {/* Category Label in Modal Header */}
                            <span className="text-xs font-bold text-[#2EB0D9] bg-[#2EB0D9]/10 px-2 py-1 rounded border border-[#2EB0D9]/20 mb-2 inline-block">
                                {CATEGORY_LABELS[selectedArticle.category]}
                            </span>
                            <h2 className={`text-2xl md:text-4xl font-black leading-tight ${theme.textTitle}`}>{selectedArticle.title}</h2>
                        </div>
                        <button onClick={() => setSelectedArticle(null)} className={`p-2 rounded-full hover:bg-black/10 transition-colors ${theme.textMuted}`}><X size={24} /></button>
                    </div>
                    <div className={`px-6 md:px-8 pt-6 flex-shrink-0 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                        <div className={`flex gap-2 border-b overflow-x-auto ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            {selectedArticle.tabs.map((tab, idx) => (
                                <button key={idx} onClick={() => setActiveArticleTab(idx)} className={`px-6 py-3 text-sm md:text-base font-bold rounded-t-lg transition-all whitespace-nowrap ${activeArticleTab === idx ? 'bg-[#2EB0D9] text-white shadow-lg shadow-[#2EB0D9]/20 translate-y-[1px]' : `${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} hover:opacity-80`}`}>{tab.title}</button>
                            ))}
                        </div>
                    </div>
                    {/* SCROLLBAR HIDDEN HERE */}
                    <div ref={articleContentTopRef} className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="p-6 md:p-12 min-h-full flex flex-col">
                            <div className="md:hidden mb-6 rounded-xl overflow-hidden h-48 relative flex-shrink-0">
                                <img src={selectedArticle.imageUrl} className="w-full h-full object-cover" alt=""/>
                            </div>
                            <div className={`prose max-w-none leading-relaxed text-lg md:text-xl mb-12 ${theme.textMain}`}>
                                {activeTabContent.split('\n').map((paragraph, i) => (
                                    <p key={i} className="mb-4">{paragraph}</p>
                                ))}
                            </div>
                            {relatedArticles.length > 0 && (
                                <div className={`mt-auto border-t pt-8 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                    <h4 className={`text-xl font-bold mb-6 flex items-center gap-2 ${theme.textTitle}`}>
                                        <span className="w-1 h-6 bg-[#2EB0D9] rounded-full"></span>
                                        עוד בנושא {CATEGORY_LABELS[selectedArticle.category]}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {relatedArticles.map(relArticle => (
                                            <div key={relArticle.id} onClick={() => setSelectedArticle(relArticle)} className={`group cursor-pointer flex gap-3 items-center p-2 rounded-lg hover:bg-black/5 transition-colors border ${theme.cardBg} hover:border-[#2EB0D9]/50`}>
                                                <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                                                    <img src={relArticle.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform opacity-80 group-hover:opacity-100" alt=""/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className={`font-bold text-sm leading-tight mb-1 truncate group-hover:text-[#2EB0D9] transition-colors ${theme.textTitle}`}>{relArticle.title}</h5>
                                                    <p className={`text-xs line-clamp-1 ${theme.textMuted}`}>לחץ לקריאה</p>
                                                </div>
                                                <ArrowLeft size={16} className={`group-hover:text-[#2EB0D9] group-hover:-translate-x-1 transition-all ${theme.textMuted}`}/>
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

      {/* --- Wills Generator Modal --- */}
      {showWillsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fade-in">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setShowWillsModal(false)}></div>
             <div className={`md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[85vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                 <div className="hidden md:flex w-1/3 bg-black text-white flex-col justify-between p-8 relative overflow-hidden">
                     <img src="https://picsum.photos/id/452/800/1200" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 animate-ken-burns" />
                     <div className="relative z-10">
                         <div className="w-12 h-12 bg-[#2EB0D9] rounded-lg flex items-center justify-center mb-6 shadow-lg shadow-[#2EB0D9]/30">
                             <FileText size={28} className="text-white"/>
                         </div>
                         <h2 className="text-3xl font-black mb-4">מחולל הצוואות הדיגיטלי</h2>
                         <p className="text-slate-400 leading-relaxed">ערוך צוואה חוקית ומקצועית ב-5 דקות באמצעות האלגוריתם המשפטי החכם שלנו.</p>
                     </div>
                     <div className="relative z-10 space-y-4">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"><Check size={16} className="text-[#2EB0D9]"/></div>
                             <span className="text-sm text-slate-300">חיסיון עורך דין מלא</span>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"><Check size={16} className="text-[#2EB0D9]"/></div>
                             <span className="text-sm text-slate-300">תקף משפטית</span>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"><Check size={16} className="text-[#2EB0D9]"/></div>
                             <span className="text-sm text-slate-300">ללא עלות ראשונית</span>
                         </div>
                     </div>
                 </div>

                 {/* Left Side - Form Wizard */}
                 <div className={`flex-1 flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                     <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                         <span className={`text-sm font-bold ${theme.textMuted}`}>שלב {formStep + 1} מתוך 3</span>
                         <button onClick={() => setShowWillsModal(false)} className={`p-2 rounded-full hover:bg-black/10 ${theme.textMuted}`}><X size={24}/></button>
                     </div>
                     <div className={`flex-1 overflow-y-auto p-8 md:p-12 ${theme.textMain}`}>
                         {formStep === 0 && (
                            <div className="space-y-6 animate-fade-in">
                               <div>
                                   <h3 className={`text-2xl font-bold mb-2 ${theme.textTitle}`}>נתחיל בפרטים אישיים</h3>
                                   <p className={theme.textMuted}>אנא מלא את פרטי המצווה</p>
                               </div>
                               <div className="space-y-4">
                                   <div>
                                       <label className={`block text-sm font-bold mb-2 ${theme.textMuted}`}>שם מלא</label>
                                       <input type="text" className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition ${theme.inputBg}`} value={willsData.fullName} onChange={e => setWillsData({...willsData, fullName: e.target.value})} placeholder="ישראל ישראלי" />
                                   </div>
                                   <div>
                                       <label className={`block text-sm font-bold mb-2 ${theme.textMuted}`}>שם בן/בת הזוג (אם יש)</label>
                                       <input type="text" className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition ${theme.inputBg}`} value={willsData.spouseName} onChange={e => setWillsData({...willsData, spouseName: e.target.value})} placeholder="פלונית אלמונית" />
                                   </div>
                               </div>
                               <Button size="lg" onClick={() => setFormStep(1)} className="w-full mt-8">המשך לשלב הבא</Button>
                            </div>
                         )}

                         {formStep === 1 && (
                            <div className="space-y-6 animate-fade-in">
                               <div>
                                   <h3 className={`text-2xl font-bold mb-2 ${theme.textTitle}`}>היורשים והילדים</h3>
                                   <p className={theme.textMuted}>מי הם היורשים החוקיים?</p>
                               </div>
                               <div className={`flex items-center gap-4 p-4 rounded-lg border ${theme.cardBg}`}>
                                  <label className={`font-bold ${theme.textTitle}`}>מספר ילדים:</label>
                                  <div className="flex items-center gap-2">
                                      <button onClick={() => handleChildrenCountChange(Math.max(0, willsData.childrenCount - 1))} className={`w-8 h-8 rounded-full border hover:opacity-80 flex items-center justify-center ${theme.textTitle} ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-300'}`}>-</button>
                                      <span className={`w-8 text-center font-bold ${theme.textTitle}`}>{willsData.childrenCount}</span>
                                      <button onClick={() => handleChildrenCountChange(Math.min(10, willsData.childrenCount + 1))} className={`w-8 h-8 rounded-full border hover:opacity-80 flex items-center justify-center ${theme.textTitle} ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-300'}`}>+</button>
                                  </div>
                               </div>
                               <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                  {willsData.childrenNames.map((name, idx) => (
                                      <div key={idx}>
                                          <label className={`block text-xs font-bold mb-1 ${theme.textMuted}`}>שם הילד/ה {idx+1}</label>
                                          <input 
                                            placeholder={`שם מלא`} 
                                            className={`w-full p-3 border rounded-lg ${theme.inputBg}`} 
                                            value={name} 
                                            onChange={e => {
                                              const newNames = [...willsData.childrenNames];
                                              newNames[idx] = e.target.value;
                                              setWillsData({...willsData, childrenNames: newNames});
                                          }}/>
                                      </div>
                                  ))}
                               </div>
                               <div className="flex gap-3 pt-4">
                                 <Button variant="outline" onClick={() => setFormStep(0)} className="flex-1">חזור</Button>
                                 <Button onClick={() => setFormStep(2)} className="flex-1">המשך</Button>
                               </div>
                            </div>
                         )}

                         {formStep === 2 && (
                            <div className="space-y-6 animate-fade-in flex flex-col h-full justify-center">
                               <div className="text-center mb-6">
                                   <div className="w-20 h-20 bg-[#2EB0D9]/20 text-[#2EB0D9] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow border border-[#2EB0D9]/30">
                                      {isSubmittingWill ? <Loader2 size={40} className="animate-spin"/> : <FileCheck size={40} />}
                                   </div>
                                   <h3 className={`text-2xl font-bold ${theme.textTitle}`}>הצוואה מוכנה להפקה!</h3>
                                   <p className={`max-w-sm mx-auto mt-2 ${theme.textMuted}`}>כדי לקבל את מסמך הצוואה הרשמי ולאשר אותו, אנא מלא את פרטי ההתקשרות הסופיים.</p>
                               </div>
                               <div className={`p-6 rounded-xl border space-y-4 ${theme.cardBg}`}>
                                   <h4 className={`font-bold border-b pb-2 mb-2 ${theme.textTitle} ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>טופס פרטי קשר וסיום</h4>
                                   <div>
                                       <label className={`block text-sm font-bold mb-1 ${theme.textMuted}`}>טלפון נייד</label>
                                       <input type="tel" className={`w-full p-3 border rounded-lg ${theme.inputBg}`} value={willsData.contactPhone} onChange={e => setWillsData({...willsData, contactPhone: e.target.value})} placeholder="050-0000000"/>
                                   </div>
                                   <div>
                                       <label className={`block text-sm font-bold mb-1 ${theme.textMuted}`}>דואר אלקטרוני (לשליחת המסמך)</label>
                                       <input type="email" className={`w-full p-3 border rounded-lg ${theme.inputBg}`} value={willsData.contactEmail} onChange={e => setWillsData({...willsData, contactEmail: e.target.value})} placeholder="name@example.com"/>
                                   </div>
                               </div>
                               <div className="flex gap-3 mt-auto">
                                   <Button variant="outline" onClick={() => setFormStep(1)} className="flex-1" disabled={isSubmittingWill}>חזור</Button>
                                   <Button 
                                    variant="secondary" 
                                    onClick={handleRealWillsSubmit} 
                                    className="flex-[2] font-bold text-lg shine-effect"
                                    disabled={isSubmittingWill}
                                   >
                                       {isSubmittingWill ? 'הורד צוואה למחשב' : 'הורד צוואה למחשב'}
                                   </Button>
                               </div>
                            </div>
                         )}
                     </div>
                 </div>
             </div>
        </div>
      )}

      {/* --- Team Member Modal --- */}
      {selectedTeamMember && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedTeamMember(null)}></div>
             <div className={`rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                 <button onClick={() => setSelectedTeamMember(null)} className="absolute top-4 left-4 z-20 p-2 bg-black/50 rounded-full hover:bg-black/70 text-white"><X size={20} /></button>
                 
                 <div className="md:w-2/5 h-64 md:h-auto relative">
                     <img src={selectedTeamMember.imageUrl} alt={selectedTeamMember.fullName} className="w-full h-full object-cover animate-ken-burns opacity-90" />
                 </div>
                 <div className={`md:w-3/5 p-8 flex flex-col justify-center ${theme.textMain}`}>
                     <span className="text-[#2EB0D9] font-bold text-sm mb-1">{selectedTeamMember.role}</span>
                     <h2 className={`text-3xl font-black mb-2 ${theme.textTitle}`}>{selectedTeamMember.fullName}</h2>
                     <div className="w-16 h-1 bg-[#2EB0D9] mb-6"></div>
                     
                     <div className={`space-y-4 mb-8 ${theme.textMuted}`}>
                         <div className="flex items-center gap-3">
                             <Briefcase size={18} className="text-[#2EB0D9]"/>
                             <span>{selectedTeamMember.specialization}</span>
                         </div>
                         <div className="flex items-center gap-3">
                             <Mail size={18} className="text-[#2EB0D9]"/>
                             <span>{selectedTeamMember.email}</span>
                         </div>
                         <div className="flex items-center gap-3">
                             <Phone size={18} className="text-[#2EB0D9]"/>
                             <span>{selectedTeamMember.phone}</span>
                         </div>
                     </div>
                     
                     <p className={`leading-relaxed text-sm p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                         {selectedTeamMember.bio}
                     </p>
                 </div>
             </div>
         </div>
      )}

      {/* --- Header --- */}
      <header className={`fixed top-0 left-0 right-0 backdrop-blur-md shadow-lg z-40 h-20 transition-all border-b ${theme.headerBg}`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Header Text Logo */}
            <h1 className="text-lg md:text-xl font-black tracking-wide cursor-pointer font-serif leading-none" onClick={() => onCategoryChange(Category.HOME)}>
               <span className="block text-[#2EB0D9] drop-shadow-md">MOR ERAN KAGAN</span>
               <span className={`${theme.textMuted} text-sm tracking-widest font-sans font-normal`}>& CO</span>
            </h1>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {state.menuItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => onCategoryChange(item.cat)}
                className={`text-sm font-medium transition-colors hover:text-[#2EB0D9] ${state.currentCategory === item.cat ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : theme.textMuted}`}
              >
                {item.label}
              </button>
            ))}
            <div className={`w-px h-6 mx-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            <button className={`${theme.textMuted} hover:text-[#2EB0D9]`}><Search size={20}/></button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button className={`md:hidden ${theme.textTitle}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
           <div className={`md:hidden absolute top-20 left-0 w-full shadow-xl border-t p-4 flex flex-col gap-4 animate-fade-in-up ${theme.modalBg}`}>
              {state.menuItems.map(item => (
                <button 
                    key={item.id}
                    onClick={() => { onCategoryChange(item.cat); setMobileMenuOpen(false); }}
                    className={`text-right p-2 rounded-lg font-medium hover:bg-black/5 ${theme.textMain}`}
                >
                    {item.label}
                </button>
              ))}
           </div>
        )}
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 pt-20 relative z-10">
        
        {/* HERO SECTION - KEN BURNS EFFECT ADDED */}
        <section className="relative h-[55vh] md:h-[65vh] overflow-hidden bg-black group">
          
          {/* Floating Logo (Left Side, Centered) - MOVED HIGHER AND LEFT AS REQUESTED */}
          <div className="absolute left-8 top-[15%] z-30 hidden lg:block opacity-90 hover:opacity-100 transition-opacity animate-float">
              <img 
                src={state.config.logoUrl} 
                alt="Logo" 
                className="h-28 w-auto object-contain drop-shadow-2xl" 
                style={{ filter: "drop-shadow(0 10px 8px rgb(0 0 0 / 0.8))" }}
              />
          </div>

          {currentSlides.map((slide, index) => (
             <div 
               key={slide.id}
               className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
             >
                {/* Apply Ken Burns Animation to Image */}
                <div className="w-full h-full overflow-hidden">
                    {/* Explicitly adding animate-ken-burns even if not activeSlide to handle re-renders, but opacity controls visibility */}
                    <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover opacity-50 animate-ken-burns" />
                </div>
                
                {/* Content Container - Padded bottom to push text UP */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex items-center pb-32">
                    <div className="container mx-auto px-6 md:px-12">
                        <div className="max-w-4xl text-white space-y-6 animate-fade-in-up">
                            <span className="inline-block px-4 py-1.5 bg-[#2EB0D9]/90 text-sm font-bold uppercase tracking-widest rounded-full mb-2 text-white shadow-lg shadow-[#2EB0D9]/30">
                                {slide.category === Category.HOME ? 'המשרד המוביל בישראל' : CATEGORY_LABELS[slide.category]}
                            </span>
                            {/* Adjusted Title: White, smaller than previous WOW version but still impactful */}
                            <h2 className="text-4xl md:text-6xl font-black leading-tight drop-shadow-2xl text-white">
                                {slide.title}
                            </h2>
                            <p className="text-2xl text-slate-300 md:w-3/4 border-r-4 border-[#2EB0D9] pr-6 leading-relaxed font-light">
                                {slide.subtitle}
                            </p>
                            
                            {/* CTA Button - Hidden on HOME, Show on others with dynamic props */}
                            {state.currentCategory !== Category.HOME && (
                                <div className="pt-8">
                                    <Button 
                                        onClick={() => {
                                            if (slide.buttonLink) {
                                                window.open(slide.buttonLink, '_blank');
                                            } else {
                                                // Default action if no specific link
                                                onCategoryChange(slide.category);
                                            }
                                        }} 
                                        variant="secondary" 
                                        size="lg" 
                                        className="shadow-2xl shadow-[#2EB0D9]/40 transition-transform hover:scale-105 border-none text-lg px-10 py-4 shine-effect"
                                    >
                                        {slide.buttonText || 'קבע פגישת ייעוץ'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             </div>
          ))}
          
          {/* Slider Dots */}
          <div className="absolute bottom-40 left-0 right-0 flex justify-center gap-3 z-20">
            {currentSlides.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'bg-[#2EB0D9] w-16' : 'bg-white/30 w-3 hover:bg-white'}`}
                />
            ))}
          </div>
        </section>

        {/* TEAM SECTION (HOME ONLY) - OVERLAPPING SLIDER */}
        {state.currentCategory === Category.HOME && (
            <Reveal className="relative z-20 -mt-32 container mx-auto px-4">
                 <div className={`shadow-2xl rounded-2xl p-8 border ${theme.cardBg}`}>
                     <div className="flex justify-between items-center mb-8">
                        {/* New Styled Title */}
                        <SectionTitle title="הנבחרת שלנו" isDark={isDark} />
                        
                        <div className="flex gap-2">
                            <button onClick={() => scrollContainer(teamScrollRef, 'right')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronRight size={24}/></button>
                            <button onClick={() => scrollContainer(teamScrollRef, 'left')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronLeft size={24}/></button>
                        </div>
                     </div>
                     
                     <div 
                        ref={teamScrollRef}
                        className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x mx-auto w-fit max-w-full"
                     >
                         {teamMembers.map(member => (
                             <div 
                                key={member.id} 
                                onClick={() => setSelectedTeamMember(member)}
                                className={`flex-shrink-0 w-[85vw] md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] snap-center lg:snap-start group cursor-pointer rounded-xl overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-2 border ${theme.cardBg} ${theme.cardHover}`}
                             >
                                 <div className="h-72 w-full overflow-hidden relative">
                                     {/* Added animation class here + Grayscale Logic */}
                                     <img 
                                        src={member.imageUrl} 
                                        alt={member.fullName} 
                                        className="w-full h-full object-cover animate-ken-burns grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100" 
                                     />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                                         <span className="text-white font-bold text-sm bg-[#2EB0D9] px-3 py-1 rounded-full">לחץ לפרטים</span>
                                     </div>
                                 </div>
                                 <div className="p-6 text-center">
                                     <h4 className={`font-bold text-2xl mb-1 group-hover:text-[#2EB0D9] transition-colors ${theme.textTitle}`}>{member.fullName}</h4>
                                     <p className={`text-sm font-medium uppercase tracking-wide ${theme.textMuted}`}>{member.role}</p>
                                 </div>
                             </div>
                         ))}
                         {/* Hidden fifth element simulation for scroll test */}
                         {teamMembers.length > 4 && (
                             <div className="flex-shrink-0 w-[20px]"></div>
                         )}
                     </div>
                 </div>
            </Reveal>
        )}

        {/* TIMELINE (SCROLLABLE) - RESTORED TO CARD STYLE WITHOUT TOP IMAGES */}
        <Reveal className={`py-20 relative border-b ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`} delay={200}>
           <div className="container mx-auto px-4 mb-8 flex justify-between items-end">
              <SectionTitle title={state.currentCategory === Category.HOME ? 'חדשות ועדכונים' : 'מדריכים ומידע מקצועי'} isDark={isDark} />
              
              <div className="flex gap-2">
                  <button onClick={() => scrollContainer(timelineScrollRef, 'right')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronRight size={24}/></button>
                  <button onClick={() => scrollContainer(timelineScrollRef, 'left')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronLeft size={24}/></button>
              </div>
           </div>
           
           <div className="container mx-auto px-4">
              <div 
                 ref={timelineScrollRef}
                 className="flex gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x"
              >
                  {currentTimelines.map((item, index) => {
                      const isGenerator = item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-'));
                      
                      // Define brand-aligned gradients (Shades of Cyan/Teal/Blue)
                      const brandGradients = [
                        'from-[#2EB0D9] to-[#1F8CAD]', // Brand to Darker Cyan
                        'from-[#2EB0D9] to-[#0EA5E9]', // Brand to Sky Blue
                        'from-[#06B6D4] to-[#2EB0D9]', // Cyan to Brand
                        'from-[#22D3EE] to-[#0090B0]'  // Light Cyan to Deep Teal
                      ];
                      
                      // Cycle through gradients for generator cards
                      const selectedGradient = brandGradients[index % brandGradients.length];

                      // Apply varied colored backgrounds for generator cards, clean style for others
                      const bgClass = isGenerator 
                        ? `bg-gradient-to-br ${selectedGradient} text-white shadow-xl shadow-cyan-500/20 transform hover:-translate-y-2` 
                        : `${theme.cardBg} ${theme.cardHover} transition-all duration-300 transform hover:-translate-y-2`;
                      
                      const textClass = isGenerator ? 'text-white' : theme.textTitle;
                      const descClass = isGenerator ? 'text-white/90' : theme.textMuted;

                      return (
                          <div 
                            key={item.id} 
                            onClick={() => handleTimelineClick(item)}
                            // Sizing adjusted to fit ~4 items on desktop (25% minus gap)
                            className={`flex-shrink-0 w-[300px] md:w-[calc(25%-18px)] rounded-2xl shadow-lg overflow-hidden cursor-pointer group snap-start flex flex-col h-[240px] border border-transparent ${bgClass}`}
                          >
                              <div className="p-8 flex flex-col h-full relative">
                                  {/* Icon - Positioned absolutely or in flow */}
                                   <div className={`absolute top-6 left-6 p-3 rounded-full shadow-sm ${isGenerator ? 'bg-white/20' : `${isDark ? 'bg-slate-800' : 'bg-slate-100'} text-[#2EB0D9]`}`}>
                                      {isGenerator ? <FileText size={24} className="text-white"/> : <ArrowLeft size={24} className=""/>}
                                   </div>

                                  {/* Content - No top image */}
                                  <div className="mt-10">
                                       <h4 className={`text-2xl font-black mb-3 leading-tight ${textClass} line-clamp-2`}>{item.title}</h4>
                                       <p className={`text-sm leading-relaxed line-clamp-3 ${descClass}`}>{item.description}</p>
                                  </div>
                                  
                                  {/* Footer link */}
                                  <div className="mt-auto pt-4 flex items-center justify-between">
                                       <span className={`text-sm font-bold flex items-center gap-2 ${isGenerator ? 'text-white' : 'text-[#2EB0D9] group-hover:translate-x-[-4px] transition-transform'}`}>
                                          {isGenerator ? 'התחל עכשיו' : 'קרא עוד'} <ArrowLeft size={16}/>
                                       </span>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
           </div>
        </Reveal>

        {/* DYNAMIC CONTENT SECTION (ARTICLES / FORMS) */}
        <section className="py-20 min-h-[600px] relative z-10">
           <div className="container mx-auto px-4">
              
              {/* --- DYNAMIC FORM RENDERER --- */}
              {currentDynamicForm && (
                  <div ref={dynamicFormRef} className={`mb-20 rounded-2xl p-8 md:p-12 shadow-2xl border-t-4 border-[#2EB0D9] animate-fade-in-up border-x border-b ${theme.cardBg}`}>
                       <div className="max-w-2xl mx-auto">
                           <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className={`text-3xl font-bold mb-2 ${theme.textTitle}`}>{currentDynamicForm.title}</h3>
                                    <p className={theme.textMuted}>נא למלא את כל השדות הנדרשים</p>
                                </div>
                                <button onClick={() => setActiveDynamicFormId(null)} className={`${theme.textMuted} hover:opacity-70`}><X size={32}/></button>
                           </div>

                           <div className={`space-y-6 p-8 rounded-xl border shadow-inner ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                               {currentDynamicForm.fields.map(field => (
                                   <div key={field.id} className="space-y-2">
                                       <div className="flex items-center gap-2">
                                           <label className={`block text-sm font-bold ${theme.textMuted}`}>
                                               {field.label} {field.required && <span className="text-red-400">*</span>}
                                           </label>
                                           {field.helpArticleId && (
                                               <button 
                                                    onClick={() => {
                                                        const article = state.articles.find(a => a.id === field.helpArticleId);
                                                        if (article) setSelectedArticle(article);
                                                        else alert("המאמר המקושר לא נמצא");
                                                    }}
                                                    className="text-[#2EB0D9] hover:text-[#259cc0] transition-colors"
                                                    title="לחץ להסבר נוסף"
                                               >
                                                   <HelpCircle size={16} />
                                               </button>
                                           )}
                                       </div>
                                       
                                       {field.type === 'text' && (
                                           <input 
                                             type="text" 
                                             className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition ${theme.inputBg}`} 
                                             value={dynamicFormValues[field.id] || ''}
                                             onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}
                                           />
                                       )}
                                       
                                       {field.type === 'boolean' && (
                                           <div className="flex gap-6 p-2">
                                               <label className={`flex items-center gap-2 cursor-pointer ${theme.textMain} text-lg`}>
                                                   <input 
                                                     type="radio" 
                                                     name={field.id} 
                                                     className="w-5 h-5 accent-[#2EB0D9]"
                                                     checked={dynamicFormValues[field.id] === true}
                                                     onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: true})}
                                                   /> כן
                                               </label>
                                               <label className={`flex items-center gap-2 cursor-pointer ${theme.textMain} text-lg`}>
                                                   <input 
                                                     type="radio" 
                                                     name={field.id} 
                                                     className="w-5 h-5 accent-[#2EB0D9]"
                                                     checked={dynamicFormValues[field.id] === false}
                                                     onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: false})}
                                                   /> לא
                                               </label>
                                           </div>
                                       )}

                                       {field.type === 'select' && (
                                           <select 
                                              className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition ${theme.inputBg}`}
                                              value={dynamicFormValues[field.id] || ''}
                                              onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}
                                           >
                                               <option value="">בחר...</option>
                                               {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                           </select>
                                       )}

                                       {field.type === 'repeater' && (
                                           <div className={`p-6 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                               <div className="space-y-3 mb-4">
                                                   {(dynamicFormValues[field.id] || []).map((val: string, i: number) => (
                                                       <div key={i} className="flex gap-2">
                                                           <input 
                                                             className={`flex-1 p-3 border rounded-lg text-sm ${theme.inputBg}`} 
                                                             value={val}
                                                             onChange={(e) => {
                                                                 const newArr = [...(dynamicFormValues[field.id] || [])];
                                                                 newArr[i] = e.target.value;
                                                                 setDynamicFormValues({...dynamicFormValues, [field.id]: newArr});
                                                             }}
                                                           />
                                                       </div>
                                                   ))}
                                               </div>
                                               <Button size="sm" variant="outline" onClick={() => {
                                                   const newArr = [...(dynamicFormValues[field.id] || []), ''];
                                                   setDynamicFormValues({...dynamicFormValues, [field.id]: newArr});
                                               }} className="">+ הוסף שורה</Button>
                                           </div>
                                       )}
                                   </div>
                               ))}

                               <Button className="w-full mt-6 py-4 text-lg font-bold shine-effect" variant="secondary" onClick={() => {
                                   console.log("Form Submitted", currentDynamicForm.submitEmail, dynamicFormValues);
                                   alert("הטופס נשלח בהצלחה! תודה רבה.");
                                   setActiveDynamicFormId(null);
                               }}>שלח טופס</Button>
                           </div>
                       </div>
                  </div>
              )}

              {/* Articles Grid / Carousel */}
              <Reveal delay={300}>
                  <div className="flex items-center justify-between mb-10">
                     <SectionTitle title="מאמרים נבחרים" isDark={isDark} />
                     <div className="flex gap-2">
                         <button onClick={() => scrollContainer(articlesScrollRef, 'right')} className={`p-3 border rounded-full hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMuted} ${theme.border}`}><ChevronRight size={24}/></button>
                         <button onClick={() => scrollContainer(articlesScrollRef, 'left')} className={`p-3 border rounded-full hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMuted} ${theme.border}`}><ChevronLeft size={24}/></button>
                     </div>
                  </div>

                  <div 
                     ref={articlesScrollRef}
                     className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x"
                  >
                     {currentArticles.map(article => (
                        <div 
                            key={article.id} 
                            className="flex-shrink-0 w-[320px] md:w-[calc(25%-18px)] h-[380px] snap-start"
                        >
                            <ArticleCard 
                                article={article} 
                                onClick={() => setSelectedArticle(article)}
                            />
                        </div>
                     ))}
                     {currentArticles.length === 0 && (
                         <div className={`w-full text-center py-20 rounded-2xl border border-dashed ${theme.cardBg} ${theme.textMuted}`}>
                             אין מאמרים להצגה בקטגוריה זו.
                         </div>
                     )}
                  </div>
              </Reveal>
           </div>
        </section>

        {/* CONTACT FOOTER - FIXED ALIGNMENT */}
        <footer className="bg-black text-slate-400 pt-20 pb-10 relative z-10 border-t border-slate-900">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 items-start text-right" dir="rtl">
                
                {/* Brand Column (Rightmost) */}
                <div className="col-span-1 flex flex-col items-start">
                    <h2 className="text-2xl font-black text-white mb-6 font-serif leading-tight">
                       <span className="text-[#2EB0D9]">MOR ERAN KAGAN</span><br/>& CO
                    </h2>
                    <p className="mb-6 text-sm leading-relaxed max-w-xs text-slate-500">משרד עורכי דין מוביל המעניק ליווי משפטי מקיף, מקצועי ואישי בכל תחומי המשפט האזרחי והמסחרי.</p>
                    <div className="flex gap-4">
                       <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] hover:text-white cursor-pointer transition-all hover:scale-110 transform border border-slate-800">f</div>
                       <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] hover:text-white cursor-pointer transition-all hover:scale-110 transform border border-slate-800">in</div>
                       {onAdminClick && (
                          <button 
                            onClick={onAdminClick}
                            className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] cursor-pointer transition-all text-slate-500 hover:text-white border border-slate-800"
                            title="ניהול אתר"
                          >
                             <Settings size={20} />
                          </button>
                       )}
                    </div>
                </div>
                
                {/* Navigation Column */}
                <div className="col-span-1 flex flex-col items-start">
                    <h4 className="text-white font-bold mb-6 text-lg border-r-4 border-[#2EB0D9] pr-4">ניווט מהיר</h4>
                    <ul className="space-y-3 w-full">
                        <li><button onClick={() => onCategoryChange(Category.WILLS)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">צוואות וירושות</button></li>
                        <li><button onClick={() => onCategoryChange(Category.REAL_ESTATE)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">מקרקעין ונדל"ן</button></li>
                        <li><button onClick={() => onCategoryChange(Category.POA)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">ייפוי כוח מתמשך</button></li>
                        <li><button onClick={() => onCategoryChange(Category.STORE)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">חנות משפטית</button></li>
                    </ul>
                </div>
                
                {/* Contact Column - Fixed Alignment */}
                <div className="col-span-1 flex flex-col items-start">
                    <h4 className="text-white font-bold mb-6 text-lg border-r-4 border-[#2EB0D9] pr-4">פרטי התקשרות</h4>
                    <ul className="space-y-4 w-full">
                        <li className="flex items-start gap-4">
                            <MapPin size={22} className="text-[#2EB0D9] mt-1 flex-shrink-0"/> 
                            <span className="leading-snug text-slate-400">{state.config.address}</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <Phone size={22} className="text-[#2EB0D9] flex-shrink-0"/> 
                            <span className="leading-snug text-slate-400" dir="ltr">{state.config.phone}</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <Mail size={22} className="text-[#2EB0D9] flex-shrink-0"/> 
                            <span className="leading-snug font-sans text-slate-400">{state.config.contactEmail}</span>
                        </li>
                    </ul>
                    {/* Waze Button Aligned Under Contact Info */}
                    <a 
                       href={`https://waze.com/ul?q=${encodeURIComponent(state.config.address)}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 bg-[#2EB0D9] hover:bg-[#259cc0] text-white px-6 py-3 rounded-lg font-bold transition-all mt-8 hover:shadow-lg transform hover:-translate-y-1 w-full justify-center shadow-lg shadow-[#2EB0D9]/10"
                    >
                        <Navigation size={20} /> נווט למשרד
                    </a>
                </div>
                
                {/* Map Column (Leftmost) */}
                <div className="col-span-1">
                     {/* Map container same height as content roughly */}
                    <div className="w-full h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl group hover:border-[#2EB0D9]/50 transition-colors">
                        <iframe 
                            title="Office Location"
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            style={{ border: 0, opacity: 0.6, filter: 'invert(90%) hue-rotate(180deg)' }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(state.config.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            allowFullScreen
                            className="group-hover:opacity-80 transition-opacity duration-500"
                        ></iframe>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-4 pt-8 border-t border-slate-900 text-center text-sm text-slate-600">
                &copy; {new Date().getFullYear()} MOR ERAN KAGAN & CO. כל הזכויות שמורות.
            </div>
        </footer>
      </main>

      <FloatingWidgets />
    </div>
  );
};