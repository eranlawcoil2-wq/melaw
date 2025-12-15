

import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS, CalculatorDefinition } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx';
import { emailService } from '../services/api.ts'; 
import { Search, Phone, MapPin, Mail, Menu, X, ArrowLeft, Navigation, FileText, Settings, ChevronLeft, ChevronRight, Loader2, Scale, BookOpen, ClipboardList, Newspaper, AlertOctagon, HelpCircle, Printer, MessageCircle, Calculator, ChevronDown, Filter } from 'lucide-react';

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
        
        // Fallback
        const timeout = setTimeout(() => setIsVisible(true), 1000);
        
        return () => {
            observer.disconnect();
            clearTimeout(timeout);
        };
    }, [delay]);
    
    return <div ref={ref} className={`reveal ${isVisible ? 'active' : ''} ${className}`}>{children}</div>;
};

const SectionTitle: React.FC<{ title: string; isDark: boolean }> = ({ title, isDark }) => (
    <div className="mb-6 md:mb-10 relative z-10">
        <h3 className={`text-3xl md:text-4xl font-black inline-block tracking-tight leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
    </div>
);

// --- TAX CALCULATOR COMPONENT ---
interface TaxCalculatorProps {
    calculator: CalculatorDefinition;
    theme: any;
    onClose: () => void;
}

const TaxCalculatorWidget: React.FC<TaxCalculatorProps> = ({ calculator, theme, onClose }) => {
    const [selectedScenarioId, setSelectedScenarioId] = useState(calculator.scenarios[0]?.id || '');
    const [price, setPrice] = useState<string>('');
    const [result, setResult] = useState<{ total: number, steps: { threshold: number, rate: number, tax: number, amountInBracket: number, isLast: boolean, dealValue: number }[] } | null>(null);

    const scenario = calculator.scenarios.find(s => s.id === selectedScenarioId);
    const shareUrl = `${window.location.origin}${window.location.pathname}#calc:${calculator.id}`;

    const formatNumberWithCommas = (value: string) => {
        const cleanVal = value.replace(/,/g, '');
        if (!cleanVal) return '';
        return parseInt(cleanVal).toLocaleString('en-US');
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, ''); 
        setPrice(formatNumberWithCommas(val));
        setResult(null); 
    };

    const formatCurrency = (num: number) => {
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num);
    };

    const calculate = () => {
        if (!scenario || !price) return;
        const amount = parseFloat(price.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return;

        let remaining = amount;
        let previousThreshold = 0;
        let totalTax = 0;
        const steps = [];
        const sortedBrackets = [...scenario.brackets].sort((a,b) => a.threshold - b.threshold);

        for (const bracket of sortedBrackets) {
            if (remaining <= 0) break;
            const span = bracket.threshold - previousThreshold;
            const taxableInBracket = Math.min(remaining, span);
            
            if (taxableInBracket > 0) {
                const tax = taxableInBracket * (bracket.rate / 100);
                totalTax += tax;
                remaining -= taxableInBracket;
                const isLast = remaining <= 0;
                steps.push({ threshold: bracket.threshold, rate: bracket.rate, amountInBracket: taxableInBracket, tax: tax, isLast: isLast, dealValue: amount });
                previousThreshold = bracket.threshold;
            }
        }
        setResult({ total: totalTax, steps });
    };

    return (
        <div className={`mb-20 container mx-auto px-4 rounded-2xl shadow-2xl animate-fade-in-up border-x border-b overflow-hidden relative ${theme.cardBg} border-t-0`}>
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#2EB0D9] to-[#0EA5E9]"></div>
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-[#2EB0D9]/10 via-[#2EB0D9]/5 to-transparent pointer-events-none"></div>
            <div className="p-4 md:p-12 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-start mb-6 md:mb-8 border-b border-[#2EB0D9]/20 pb-4 md:pb-6">
                        <div>
                            <h3 className={`text-2xl md:text-4xl font-black mb-2 flex items-center gap-3 ${theme.textTitle}`}>
                                <div className="bg-[#2EB0D9]/20 p-2 rounded-lg text-[#2EB0D9]"><Calculator size={24} className="md:w-8 md:h-8"/></div> 
                                {calculator.title}
                            </h3>
                            <p className="text-slate-400 text-sm md:text-lg">מחשבון משפטי מקצועי לחישוב מדרגות מס בזמן אמת</p>
                        </div>
                        <div className="flex gap-2">
                            <ShareMenu variant="inline" title={calculator.title} text="מחשבון מס מעולה שמצאתי באתר:" url={shareUrl} colorClass={theme.textMuted} />
                            <button onClick={onClose} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"><X size={20} className={`md:w-6 md:h-6 ${theme.textMuted}`}/></button>
                        </div>
                    </div>
                    <div className={`p-4 md:p-8 rounded-2xl border shadow-inner space-y-6 md:space-y-8 ${theme.bgMain} ${theme.border}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            <div>
                                <label className={`block text-xs md:text-sm font-bold mb-2 md:mb-3 ${theme.textMuted}`}>סוג העסקה</label>
                                <div className="relative">
                                    <select className={`w-full p-3 md:p-4 pr-8 md:pr-10 border rounded-xl appearance-none font-bold text-base md:text-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition-shadow ${theme.inputBg}`} value={selectedScenarioId} onChange={(e) => { setSelectedScenarioId(e.target.value); setResult(null); }}>
                                        {calculator.scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                    <ChevronDown className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 w-4 h-4 md:w-6 md:h-6"/>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-xs md:text-sm font-bold mb-2 md:mb-3 ${theme.textMuted}`}>שווי הנכס (בש"ח)</label>
                                <div className="relative">
                                    <input type="text" inputMode="numeric" className={`w-full p-3 md:p-4 border rounded-xl font-mono text-lg md:text-xl font-bold focus:ring-2 focus:ring-[#2EB0D9] outline-none transition-shadow ${theme.inputBg}`} value={price} onChange={handlePriceChange} placeholder="0" onKeyDown={(e) => e.key === 'Enter' && calculate()}/>
                                </div>
                            </div>
                        </div>
                        <Button onClick={calculate} size="lg" className="w-full py-3 md:py-5 text-lg md:text-xl font-black tracking-wide shine-effect shadow-xl shadow-[#2EB0D9]/20"><Calculator className="ml-2 w-5 h-5 md:w-6 md:h-6"/> בצע חישוב</Button>
                        {result && (
                            <div className="mt-6 md:mt-8 animate-fade-in-up">
                                <div className="bg-gradient-to-r from-[#2EB0D9]/20 to-[#0EA5E9]/10 border border-[#2EB0D9]/30 rounded-2xl p-6 md:p-8 mb-6 md:mb-8 text-center relative overflow-hidden">
                                    <div className="relative z-10">
                                        <span className="text-xs md:text-sm font-bold block mb-2 text-[#2EB0D9] uppercase tracking-widest">סה"כ מס לתשלום</span>
                                        <span className="text-4xl md:text-6xl font-black text-white drop-shadow-lg">{formatCurrency(result.total)}</span>
                                    </div>
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                                    <table className={`w-full text-xs md:text-sm border-collapse ${theme.textMain}`}>
                                        <thead className="bg-slate-900/50">
                                            <tr className={`border-b ${theme.border}`}><th className="p-2 md:p-4 text-right font-bold text-slate-400">מדרגה</th><th className="p-2 md:p-4 text-center font-bold text-slate-400">שיעור מס</th><th className="p-2 md:p-4 text-center font-bold text-slate-400">סכום במדרגה</th><th className="p-2 md:p-4 text-left font-bold text-slate-400">מס לתשלום</th></tr>
                                        </thead>
                                        <tbody>
                                            {result.steps.map((step, idx) => {
                                                let bracketLabel = step.isLast ? `עד ${formatCurrency(step.dealValue)}` : (step.threshold > 999999999 ? 'מעל הסכום המרבי' : `עד ${formatCurrency(step.threshold)}`);
                                                return (<tr key={idx} className={`border-b border-slate-800/50 hover:bg-white/5 transition-colors`}><td className="p-2 md:p-4 font-mono text-slate-400 border-l border-slate-800/50">{bracketLabel}</td><td className="p-2 md:p-4 text-center font-bold text-[#2EB0D9] border-l border-slate-800/50">{step.rate}%</td><td className="p-2 md:p-4 text-center border-l border-slate-800/50">{formatCurrency(step.amountInBracket)}</td><td className="p-2 md:p-4 text-left font-bold">{formatCurrency(step.tax)}</td></tr>);
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 md:mt-6 text-[10px] md:text-xs text-slate-500 text-center flex items-center justify-center gap-2"><AlertOctagon size={12}/><span>החישוב הינו להערכה בלבד ואינו מהווה תחליף לייעוץ משפטי או שומה סופית של רשות המיסים.</span></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: WillsFormData) => void;
  onAdminClick?: () => void;
  version?: string;
  dataVersion?: string;
}

const generateSubmissionId = () => {
    return 'REF-' + Math.random().toString(36).substr(2, 5).toUpperCase();
};

export const PublicSite: React.FC<PublicSiteProps> = ({ state, onCategoryChange, onWillsFormSubmit, onAdminClick, version, dataVersion }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<TimelineItem | null>(null);
  const [showWillsModal, setShowWillsModal] = useState(false); 
  const [isSubmittingWill, setIsSubmittingWill] = useState(false); 
  const [activeArticleTab, setActiveArticleTab] = useState(0); 
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
  const [activeCalculatorId, setActiveCalculatorId] = useState<string | null>(null); 
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  const [isSubmittingDynamic, setIsSubmittingDynamic] = useState(false);
  const [showFormsListModal, setShowFormsListModal] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  
  // STORE PAGINATION & FILTERING STATES
  const [storePage, setStorePage] = useState(0);
  const [selectedStoreTags, setSelectedStoreTags] = useState<string[]>([]);
  
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
  const calculatorRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const teamScrollRef = useRef<HTMLDivElement>(null);
  const articlesScrollRef = useRef<HTMLDivElement>(null);
  const articleContentTopRef = useRef<HTMLDivElement>(null);

  // UPDATED: Slider Filtering Logic (Array inclusion)
  const currentSlides = state.slides.filter(s => {
      // Support legacy 'category' if 'categories' is missing
      if (!s.categories && (s as any).category) return (s as any).category === state.currentCategory || (s as any).category === Category.HOME;
      
      // New array logic
      if (state.currentCategory === Category.HOME) return s.categories?.includes(Category.HOME);
      return s.categories?.includes(state.currentCategory) || s.categories?.includes(Category.HOME); // Show HOME slides everywhere + specific slides
  }).sort((a, b) => (a.order || 99) - (b.order || 99));

  const currentArticles = state.articles.filter(a => state.currentCategory === Category.HOME || state.currentCategory === Category.STORE ? true : a.categories.includes(state.currentCategory)).sort((a, b) => (a.order || 99) - (b.order || 99));
  const currentCategoryForms = state.forms.filter(f => f.categories && f.categories.includes(state.currentCategory)).sort((a, b) => (a.order || 99) - (b.order || 99));
  // Filter Calculators
  const currentCategoryCalculators = (state.calculators || []).filter(c => c.categories && c.categories.includes(state.currentCategory));
  
  const teamMembers = state.teamMembers.sort((a, b) => (a.order || 99) - (b.order || 99));
  
  const currentTimelines = state.timelines.filter(t => {
      if (!t.category || t.category.length === 0) return state.currentCategory === Category.HOME;
      if (state.currentCategory === Category.HOME || state.currentCategory === Category.STORE) return true;
      return t.category.includes(state.currentCategory);
  });

  // Base store products for current category
  const storeProducts = (state.products || []).filter(p => {
      if (p.categories) {
          return state.currentCategory === Category.STORE || p.categories.includes(state.currentCategory);
      }
      return state.currentCategory === Category.STORE || (p as any).category === state.currentCategory;
  }).sort((a, b) => (a.order || 99) - (b.order || 99));

  // --- FILTER & PAGINATION LOGIC FOR STORE ---
  const STORE_PAGE_SIZE = 8;
  
  // 1. Get unique tags
  const uniqueTags = Array.from(new Set(storeProducts.flatMap(p => p.tags || []))).sort();

  // 2. Filter products based on selected tags (OR Logic)
  const filteredStoreProducts = storeProducts.filter(p => {
      if (selectedStoreTags.length === 0) return true;
      // Show if product has AT LEAST ONE of the selected tags
      return p.tags?.some(tag => selectedStoreTags.includes(tag));
  });

  // 3. Paginate
  const totalStorePages = Math.ceil(filteredStoreProducts.length / STORE_PAGE_SIZE);
  const visibleStoreProducts = filteredStoreProducts.slice(storePage * STORE_PAGE_SIZE, (storePage + 1) * STORE_PAGE_SIZE);

  const toggleStoreTag = (tag: string) => {
      setStorePage(0); // Reset to first page on filter change
      if (selectedStoreTags.includes(tag)) {
          setSelectedStoreTags(selectedStoreTags.filter(t => t !== tag));
      } else {
          setSelectedStoreTags([...selectedStoreTags, tag]);
      }
  };

  // --- MERGE CALCULATORS INTO TIMELINE ITEMS AND SORT ---
  const mixedTimelineItems = [
      ...currentTimelines.map(item => ({ ...item, type: 'timeline', sortOrder: item.order || 99 })),
      ...currentCategoryCalculators.map(calc => ({
          id: calc.id,
          title: calc.title,
          description: 'חישוב מהיר ומדויק של מדרגות המס בהתאם לשווי העסקה.',
          imageUrl: '', // Calculators use icon
          category: [],
          type: 'calculator', // Marker
          linkTo: '',
          sortOrder: calc.order || 99 // Use the order from calculator definition
      }))
  ].sort((a,b) => {
      return a.sortOrder - b.sortOrder;
  });

  // DEEP LINKING HANDLER (useEffect remains same as previous code)
  useEffect(() => {
    const handleHash = () => {
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;
        const decodedHash = decodeURIComponent(hash);
        const [type, id] = decodedHash.split(':');
        
        if (!type || !id) return;

        if (type === 'article') {
            const item = state.articles.find(a => a.id === id);
            if (item) setSelectedArticle(item);
        } else if (type === 'calc') {
            const item = state.calculators?.find(c => c.id === id);
            if (item) {
                setActiveCalculatorId(id);
                setTimeout(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
            }
        } else if (type === 'update') {
            const item = state.timelines.find(t => t.id === id);
            if (item) setSelectedTimelineItem(item);
        } else if (type === 'form') {
            const item = state.forms.find(f => f.id === id);
            if (item) {
                setActiveDynamicFormId(id);
                setTimeout(() => dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
            }
        }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [state.articles, state.calculators, state.timelines, state.forms]);

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

  // Handlers (same as before)
  const handleTimelineClick = (item: any) => {
    if (item.type === 'calculator') {
        setActiveCalculatorId(item.id);
        setTimeout(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        return;
    }
    if (item.linkTo === 'wills-generator') {
        setShowWillsModal(true); 
    } else if (item.linkTo && item.linkTo.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setTimeout(() => { dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } else {
        setSelectedTimelineItem(item);
        setActiveArticleTab(0);
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
             if (slide.categories && slide.categories.length > 0) onCategoryChange(slide.categories[0]);
        }
    } else {
        if (slide.categories && slide.categories.length > 0) onCategoryChange(slide.categories[0]);
    }
  };
  
  const handleProductClick = (product: any) => {
      if (product.paymentLink) window.open(product.paymentLink, '_blank');
      else alert(`לרכישת "${product.title}" אנא צור קשר.`);
  };
  
  const handleContactSubmit = async () => {
      setContactSending(true);
      try {
          const submissionId = generateSubmissionId();
          await emailService.sendForm('General Contact Form', { ...contactForm, submissionId }, state.config.integrations, undefined, false, state.config.contactEmail);
          alert(`הודעתך נשלחה בהצלחה! מספר פנייה: ${submissionId}\nניצור קשר בהקדם.`);
          setContactForm({ name: '', phone: '', message: '' });
      } catch (e) {
          alert('שגיאה בשליחה.'); 
      } finally { 
          setContactSending(false); 
      }
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
          await emailService.sendWillsForm(willsData, state.config);
          onWillsFormSubmit(willsData);
          if (state.config.integrations.googleSheetsUrl) alert("הפרטים נקלטו בהצלחה במערכת! טיוטת הצוואה תופק ותשלח אליך למייל בהקדם."); 
          else alert("הנתונים נשלחו אך לא הוגדר חיבור ל-Google Sheets."); 
          setShowWillsModal(false); setFormStep(0);
      } catch (error) { 
          alert("אירעה שגיאה, אנא נסה שנית."); 
      } finally { 
          setIsSubmittingWill(false); 
      }
  };

  const currentDynamicForm = state.forms.find(f => f.id === activeDynamicFormId);
  const currentCalculator = state.calculators?.find(c => c.id === activeCalculatorId);

  const activeTabContent = selectedArticle?.tabs?.[activeArticleTab]?.content || "";
  const relatedArticles = selectedArticle ? state.articles.filter(a => a.id !== selectedArticle.id && a.categories.some(c => selectedArticle.categories.includes(c))).slice(0, 4) : [];

  const isContactPage = state.currentCategory === Category.CONTACT;
  const isStorePage = state.currentCategory === Category.STORE;
  const isHomePage = state.currentCategory === Category.HOME;
  
  const showTeamSection = isHomePage;
  const showTimelineSection = !isContactPage;
  const showProductsSection = (isStorePage || (!isHomePage && !isContactPage));
  const showArticlesGrid = !isContactPage;
  const showGlobalFooter = !isContactPage;
  const hasWillsGenerator = state.currentCategory === Category.WILLS;

  const openHelpArticle = (articleId: string) => {
      const article = state.articles.find(a => a.id === articleId);
      if (article) setSelectedArticle(article);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-[#2EB0D9] selection:text-white ${theme.bgMain} ${theme.textMain}`}>
      <div className={`fixed inset-0 pointer-events-none z-0 ${isDark ? 'opacity-30' : 'opacity-60'} overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#2EB0D9]/20 via-transparent to-purple-500/20 animate-gradient-xy"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#2EB0D9]/20 rounded-full blur-[100px] animate-float-slow"></div>
          <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <header className={`fixed top-0 left-0 right-0 backdrop-blur-md shadow-lg z-40 h-20 transition-all border-b ${theme.headerBg}`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4"><h1 className="text-lg md:text-xl font-black tracking-wide cursor-pointer leading-none" onClick={() => onCategoryChange(Category.HOME)} style={{ fontFamily: "'MyLogoFont', Cambria, serif" }}><span className="block text-[#2EB0D9] drop-shadow-md">MOR ERAN KAGAN</span><span className={`${theme.textMuted} text-sm tracking-widest font-sans font-normal`}>& CO</span></h1></div>
          <nav className="hidden md:flex items-center gap-6">{state.menuItems.map(item => (<button key={item.id} onClick={() => onCategoryChange(item.cat)} className={`text-sm font-medium transition-colors border-b-2 hover:text-[#2EB0D9] ${state.currentCategory === item.cat ? 'text-[#2EB0D9] border-[#2EB0D9]' : `${theme.textMuted} border-transparent`}`}>{item.label}</button>))}<div className={`w-px h-6 mx-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div><button className={`${theme.textMuted} hover:text-[#2EB0D9]`}><Search size={20}/></button></nav>
          <button className={`md:hidden ${theme.textTitle}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
        {mobileMenuOpen && (<div className={`md:hidden absolute top-20 left-0 w-full shadow-xl border-t p-4 flex flex-col gap-4 animate-fade-in-up ${theme.modalBg}`}>{state.menuItems.map(item => (<button key={item.id} onClick={() => { onCategoryChange(item.cat); setMobileMenuOpen(false); }} className={`text-right p-2 rounded-lg font-medium hover:bg-black/5 ${theme.textMain}`}>{item.label}</button>))}</div>)}
      </header>

      <main className="flex-1 pt-20 relative z-10">
        
        {/* SLIDER - SHOW ON ALL PAGES IF SLIDES EXIST */}
        {currentSlides.length > 0 && (
        <section className="relative h-[45vh] md:h-[55vh] overflow-hidden bg-black group">
          {currentSlides.map((slide, index) => (
             <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-full h-full overflow-hidden"><img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover opacity-50 animate-ken-burns" /></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex items-center pb-20">
                    <div className="container mx-auto px-6 md:px-12">
                        <div className="max-w-4xl text-white space-y-4 animate-fade-in-up">
                            <span className="inline-block px-4 py-1 bg-[#2EB0D9]/90 text-xs font-bold uppercase tracking-widest rounded-full mb-1 text-white shadow-lg">{slide.categories?.includes(Category.HOME) ? 'המשרד המוביל בישראל' : (CATEGORY_LABELS[state.currentCategory] || CATEGORY_LABELS[Category.HOME])}</span>
                            <h2 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-2xl text-white">{slide.title}</h2>
                            <p className="hidden md:block text-lg text-slate-300 md:w-3/4 border-r-4 border-[#2EB0D9] pr-4 leading-relaxed font-light">{slide.subtitle}</p>
                            <div className="pt-4 flex gap-3"><Button onClick={() => handleSliderClick(slide)} variant="secondary" size="md" className="shine-effect">{slide.buttonText || 'קרא עוד'}</Button></div>
                        </div>
                    </div>
                </div>
             </div>
          ))}
          {currentSlides.length > 1 && (
            <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-3 z-20">{currentSlides.map((_, idx) => (<button key={idx} onClick={() => setActiveSlide(idx)} className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'bg-[#2EB0D9] w-12' : 'bg-white/30 w-3 hover:bg-white'}`} />))}</div>
          )}
        </section>
        )}

        {/* TEAM */}
        {showTeamSection && (
            <Reveal className="relative z-20 -mt-20 container mx-auto px-4">
                 <div className={`shadow-2xl rounded-2xl p-6 border ${theme.cardBg}`}>
                     <div className="flex justify-between items-center mb-6"><SectionTitle title="הנבחרת שלנו" isDark={isDark} /><div className="hidden md:flex gap-2"><button onClick={() => scrollContainer(teamScrollRef, 'right')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronRight size={24}/></button><button onClick={() => scrollContainer(teamScrollRef, 'left')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronLeft size={24}/></button></div></div>
                     <div ref={teamScrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x mx-auto w-full">{teamMembers.map(member => (<div key={member.id} onClick={() => setSelectedTeamMember(member)} className={`flex-shrink-0 w-[200px] md:w-[calc(25%-18px)] snap-center lg:snap-start group cursor-pointer rounded-xl overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-2 border ${theme.cardBg} ${theme.cardHover}`}><div className="h-32 md:h-48 w-full overflow-hidden relative"><img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover animate-ken-burns grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2"><span className="text-white font-bold text-xs bg-[#2EB0D9] px-2 py-0.5 rounded-full">פרטים</span></div></div><div className="p-3 text-center"><h4 className={`font-bold text-base md:text-lg mb-1 group-hover:text-[#2EB0D9] transition-colors ${theme.textTitle}`}>{member.fullName}</h4><p className={`text-[10px] md:text-xs font-medium uppercase tracking-wide line-clamp-1 ${theme.textMuted}`}>{member.role}</p></div></div>))}</div>
                 </div>
            </Reveal>
        )}

        {/* PRODUCTS / STORE */}
        {showProductsSection && (
            <Reveal className="relative z-20 -mt-20 container mx-auto px-4 mb-20">
                 <div className={`shadow-2xl rounded-2xl p-6 border ${theme.cardBg}`}>
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                         <SectionTitle title={isStorePage ? "החנות המשפטית" : "שירותים לרכישה אונליין"} isDark={isDark} />
                         
                         {/* Tag Filter */}
                         {uniqueTags.length > 0 && (
                             <div className="flex flex-wrap gap-2 items-center">
                                 <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter size={12}/> סנן לפי:</span>
                                 {uniqueTags.map(tag => (
                                     <button 
                                        key={tag} 
                                        onClick={() => toggleStoreTag(tag)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${selectedStoreTags.includes(tag) ? 'bg-[#2EB0D9] text-white border-[#2EB0D9] shadow-md' : 'bg-transparent text-slate-500 border-slate-700 hover:border-slate-500'}`}
                                     >
                                         {tag}
                                     </button>
                                 ))}
                                 {selectedStoreTags.length > 0 && (
                                     <button onClick={() => setSelectedStoreTags([])} className="text-[10px] text-red-400 hover:underline">נקה הכל</button>
                                 )}
                             </div>
                         )}
                     </div>

                     <div className="relative">
                         {/* PAGINATION ARROWS */}
                         {totalStorePages > 1 && (
                             <>
                                <button 
                                    onClick={() => setStorePage(p => Math.max(0, p - 1))}
                                    disabled={storePage === 0}
                                    className={`absolute top-1/2 -left-4 md:-left-6 transform -translate-y-1/2 z-20 p-3 rounded-full shadow-xl transition-all ${storePage === 0 ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-[#2EB0D9] text-white hover:bg-[#259cc0] hover:scale-110'}`}
                                >
                                    <ChevronLeft size={24}/>
                                </button>
                                <button 
                                    onClick={() => setStorePage(p => Math.min(totalStorePages - 1, p + 1))}
                                    disabled={storePage === totalStorePages - 1}
                                    className={`absolute top-1/2 -right-4 md:-right-6 transform -translate-y-1/2 z-20 p-3 rounded-full shadow-xl transition-all ${storePage === totalStorePages - 1 ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-[#2EB0D9] text-white hover:bg-[#259cc0] hover:scale-110'}`}
                                >
                                    <ChevronRight size={24}/>
                                </button>
                             </>
                         )}

                         {/* GRID LAYOUT (8 ITEMS) */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 min-h-[400px]">
                             {visibleStoreProducts.length > 0 ? visibleStoreProducts.map((product) => (
                                 <div key={product.id} className={`group rounded-xl overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-2 border ${theme.cardBg} ${theme.cardHover} flex flex-col relative h-full animate-fade-in`}>
                                     {/* Only show the top image/placeholder if there is an actual image URL */}
                                     {product.imageUrl && (
                                         <div className={`h-32 md:h-40 w-full flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                             <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                             <div className="absolute inset-0 flex items-center justify-center"><div className="bg-white/10 backdrop-blur-sm p-3 rounded-full border border-white/20 group-hover:scale-110 transition-transform duration-500"><FileText size={24} className="text-white"/></div></div>
                                         </div>
                                     )}
                                     
                                     <div className="absolute top-2 left-2 z-10">
                                         <ShareMenu variant="inline" title={product.title} text="מצאתי מוצר משפטי באתר:" url={`${window.location.origin}${window.location.pathname}#product:${product.id}`} colorClass="bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"/>
                                     </div>

                                     <div className="p-4 text-center flex-1 flex flex-col">
                                         <div className="mb-2 flex flex-wrap justify-center gap-1">
                                             {product.categories && product.categories.slice(0, 1).map(cat => (
                                                 <span key={cat} className="text-[10px] font-bold text-[#2EB0D9] bg-[#2EB0D9]/10 px-2 py-0.5 rounded border border-[#2EB0D9]/20 uppercase tracking-wide">{CATEGORY_LABELS[cat]}</span>
                                             ))}
                                         </div>
                                         <h4 className={`font-bold text-base md:text-lg mb-2 leading-tight ${theme.textTitle}`}>{product.title}</h4>
                                         <p className="text-slate-400 text-xs mb-3 line-clamp-3 leading-relaxed">{product.description}</p>
                                         
                                         {/* Tags Display */}
                                         {product.tags && product.tags.length > 0 && (
                                             <div className="flex flex-wrap justify-center gap-1 mb-3">
                                                 {product.tags.slice(0, 3).map(tag => (
                                                     <span key={tag} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{tag}</span>
                                                 ))}
                                             </div>
                                         )}

                                         {product.installments && <div className="text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full mb-2 inline-block self-center">{product.installments}</div>}
                                         
                                         <div className="mt-auto pt-3 border-t border-slate-700/50 w-full">
                                             <div className={`text-lg font-black mb-3 ${theme.textMuted}`}>₪{product.price}</div>
                                             <Button onClick={() => handleProductClick(product)} className="w-full shine-effect text-xs py-2" variant="secondary">רכוש כעת</Button>
                                         </div>
                                     </div>
                                 </div>
                             )) : (
                                 <div className="col-span-full p-12 text-center w-full text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                     <p>לא נמצאו מוצרים תואמים לסינון זה.</p>
                                     <button onClick={() => setSelectedStoreTags([])} className="text-[#2EB0D9] underline text-sm mt-2">נקה סינון</button>
                                 </div>
                             )}
                         </div>
                         
                         {/* Page Indicator */}
                         {totalStorePages > 1 && (
                             <div className="flex justify-center gap-2 mt-6">
                                 {Array.from({ length: totalStorePages }).map((_, i) => (
                                     <button 
                                        key={i} 
                                        onClick={() => setStorePage(i)}
                                        className={`w-2 h-2 rounded-full transition-all ${storePage === i ? 'bg-[#2EB0D9] w-6' : 'bg-slate-700 hover:bg-slate-500'}`}
                                     />
                                 ))}
                             </div>
                         )}
                     </div>
                 </div>
            </Reveal>
        )}

        {/* TIMELINE & TOOLS - NOW INCLUDES CALCULATORS */}
        {showTimelineSection && (
            <Reveal className={`py-20 relative border-b ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`} delay={200}>
               {/* ... (Existing Timeline Content) ... */}
               <div className="container mx-auto px-4 mb-8 flex justify-between items-end"><SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} /><div className="hidden md:flex gap-2"><button onClick={() => scrollContainer(timelineScrollRef, 'right')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronRight size={24}/></button><button onClick={() => scrollContainer(timelineScrollRef, 'left')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronLeft size={24}/></button></div></div>
               <div className="container mx-auto px-4"><div ref={timelineScrollRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x">
                   {mixedTimelineItems.map((item, index) => { 
                       // Check if item is a special generator/calculator
                       const isGenerator = item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-')) || item.type === 'calculator'; 
                       
                       const brandGradients = ['from-[#2EB0D9] to-[#1F8CAD]', 'from-[#2EB0D9] to-[#0EA5E9]', 'from-[#06B6D4] to-[#2EB0D9]', 'from-[#22D3EE] to-[#0090B0]']; 
                       const selectedGradient = brandGradients[index % brandGradients.length]; 
                       
                       const bgClass = isGenerator ? `bg-gradient-to-br ${selectedGradient} text-white shadow-xl shadow-cyan-500/20 transform hover:-translate-y-2` : `${theme.cardBg} ${theme.cardHover} transition-all duration-300 transform hover:-translate-y-2`; 
                       const textClass = isGenerator ? 'text-white' : theme.textTitle; 
                       const descClass = isGenerator ? 'text-white/90' : theme.textMuted; 
                       
                       return (
                       <div key={item.id} onClick={() => handleTimelineClick(item)} className={`flex-shrink-0 w-[140px] md:w-[calc(25%-18px)] rounded-2xl shadow-lg overflow-hidden cursor-pointer group snap-start flex flex-col h-[200px] md:h-[240px] border border-transparent ${bgClass}`}>
                           <div className="p-4 md:p-6 flex flex-col h-full relative">
                               <div className={`absolute top-4 left-4 p-2 rounded-full shadow-sm ${isGenerator ? 'bg-white/20' : `${isDark ? 'bg-slate-800' : 'bg-slate-100'} text-[#2EB0D9]`}`}>
                                   {item.type === 'calculator' ? <Calculator size={16} className={isGenerator ? "text-white" : ""}/> : (isGenerator ? <FileText size={16} className="text-white"/> : (item.imageUrl ? <Newspaper size={16}/> : <ArrowLeft size={16}/>))}
                               </div>
                               <div className="mt-8">
                                   <h4 className={`text-sm md:text-xl font-black mb-2 leading-tight ${textClass} line-clamp-2`}>{item.title}</h4>
                                   <p className={`text-[10px] md:text-xs leading-relaxed line-clamp-3 ${descClass}`}>{item.description}</p>
                               </div>
                               <div className="mt-auto pt-2 flex items-center justify-between">
                                   <span className={`text-[10px] md:text-xs font-bold flex items-center gap-1 ${isGenerator ? 'text-white' : 'text-[#2EB0D9] group-hover:translate-x-[-4px] transition-transform'}`}>{isGenerator ? 'התחל עכשיו' : 'קרא עוד'} <ArrowLeft size={12}/></span>
                               </div>
                           </div>
                       </div>
                       );
                   })}
               </div></div>
            </Reveal>
        )}
        
        {/* ... Rest of the components (Calculator, Dynamic Form, Articles, Contact, Footer) ... */}
        {/* ... (Existing Modal Logic) ... */}
        
        {/* ACTIVE CALCULATOR */}
        {currentCalculator && (
            <div ref={calculatorRef}>
                <TaxCalculatorWidget calculator={currentCalculator} theme={theme} onClose={() => setActiveCalculatorId(null)} />
            </div>
        )}

        {/* DYNAMIC FORM */}
        {currentDynamicForm && (
            <div ref={dynamicFormRef} className={`mb-20 container mx-auto px-4 rounded-2xl p-8 md:p-12 shadow-2xl border-t-4 border-[#2EB0D9] animate-fade-in-up border-x border-b ${theme.cardBg}`}>
                 {/* ... Form Content ... */}
                 <div className="max-w-2xl mx-auto">
                     <div className="flex justify-between items-start mb-6">
                         <div>
                             <h3 className={`text-3xl font-bold mb-2 ${theme.textTitle}`}>{currentDynamicForm.title}</h3>
                             <p className={theme.textMuted}>נא למלא את כל השדות הנדרשים</p>
                         </div>
                         <div className="flex gap-2">
                             <ShareMenu variant="inline" title={currentDynamicForm.title} text="טופס משפטי למילוי:" url={`${window.location.origin}${window.location.pathname}#form:${currentDynamicForm.id}`} colorClass={theme.textMuted}/>
                             <button onClick={() => setActiveDynamicFormId(null)} className={`${theme.textMuted} hover:opacity-70`}><X size={32}/></button>
                         </div>
                     </div>
                     <div className={`space-y-6 p-8 rounded-xl border shadow-inner ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                         {currentDynamicForm.fields.map(field => (
                             <div key={field.id} className="space-y-2">
                                 <div className="flex items-center gap-2">
                                     <label className={`block text-sm font-bold ${theme.textMuted}`}>{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                     {field.helpArticleId && <button onClick={() => openHelpArticle(field.helpArticleId!)} className="text-[#2EB0D9] hover:text-[#259cc0] transition-colors"><HelpCircle size={16} /></button>}
                                 </div>
                                 {field.type === 'text' && <input type="text" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                 {field.type === 'email' && <input type="email" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                 {field.type === 'number' && <input type="number" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                 {field.type === 'boolean' && (
                                     <div className="flex gap-4">
                                         <label className="flex items-center gap-2 cursor-pointer text-slate-400"><input type="radio" name={field.id} checked={dynamicFormValues[field.id] === 'yes'} onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: 'yes'})} className="accent-[#2EB0D9]"/> כן</label>
                                         <label className="flex items-center gap-2 cursor-pointer text-slate-400"><input type="radio" name={field.id} checked={dynamicFormValues[field.id] === 'no'} onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: 'no'})} className="accent-[#2EB0D9]"/> לא</label>
                                     </div>
                                 )}
                                 {field.type === 'select' && <select className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}><option value="">בחר...</option>{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>}
                             </div>
                         ))}
                         <Button className="w-full mt-6 py-4 text-lg font-bold shine-effect" variant="secondary" disabled={isSubmittingDynamic} onClick={async () => { 
                             setIsSubmittingDynamic(true); 
                             for (const field of currentDynamicForm.fields) {
                                 if (field.required && !dynamicFormValues[field.id]) {
                                     alert(`השדה "${field.label}" הוא שדה חובה.`);
                                     setIsSubmittingDynamic(false);
                                     return;
                                 }
                             }
                             const submissionId = generateSubmissionId();
                             const mappedData: any = { submissionId };
                             if (currentDynamicForm.emailSubject) mappedData['customEmailSubject'] = currentDynamicForm.emailSubject;
                             if (currentDynamicForm.emailBody) mappedData['customEmailBody'] = currentDynamicForm.emailBody;
                             
                             let explicitClientEmail = '';
                             // Map ALL fields (even empty ones) to ensure column consistency in DB
                             currentDynamicForm.fields.forEach(field => {
                                 const val = dynamicFormValues[field.id];
                                 mappedData[field.label] = (val !== undefined && val !== null && val !== '') ? val : "";
                                 if (field.isClientEmail && val) explicitClientEmail = String(val as any);
                             });
                             
                             if (!explicitClientEmail) explicitClientEmail = String(dynamicFormValues['email'] || dynamicFormValues['אימייל'] || '');
                             if (explicitClientEmail) mappedData['email'] = explicitClientEmail;

                             try { 
                                 await emailService.sendForm(currentDynamicForm.title, mappedData, state.config.integrations, currentDynamicForm.pdfTemplate, currentDynamicForm.sendClientEmail, currentDynamicForm.submitEmail || state.config.contactEmail); 
                                 if (state.config.integrations.googleSheetsUrl) alert(`נשלח בהצלחה למערכת!\nמספר אסמכתא: ${submissionId}`); else alert("נשלח בהצלחה! (מצב ללא חיבור לשרת).");
                                 setActiveDynamicFormId(null); 
                                 // REMOVED: setDynamicFormValues({}); -- Data is preserved per user request
                             } catch (e) { alert("שגיאה"); } finally { setIsSubmittingDynamic(false); } 
                         }}>{isSubmittingDynamic ? 'שולח...' : 'שלח טופס'}</Button>
                     </div>
                 </div>
            </div>
        )}

        {/* ARTICLES */}
        {showArticlesGrid && (
            <Reveal delay={300} className="py-20 container mx-auto px-4">
                     <SectionTitle title={state.currentCategory === Category.HOME ? "מאמרים נבחרים" : "מאמרים נוספים"} isDark={isDark} />
                     <div ref={articlesScrollRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x">
                        {currentArticles.map(article => (<div key={article.id} className="flex-shrink-0 w-[220px] md:w-[calc(25%-18px)] h-[300px] md:h-[380px] snap-start"><ArticleCard article={article} onClick={() => setSelectedArticle(article)} /></div>))}
                     </div>
            </Reveal>
        )}

        {/* CONTACT PAGE */}
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

      </main>

      {/* FOOTER */}
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
                            <li className="flex items-center gap-4 hover:text-white transition-colors">
                                <Phone size={22} className="text-[#2EB0D9]"/> 
                                <a href={`tel:${state.config.phone}`} className="text-slate-400 hover:text-white transition-colors" dir="ltr">{state.config.phone}</a>
                            </li>
                            {state.config.fax && (
                                <li className="flex items-center gap-4">
                                    <Printer size={22} className="text-[#2EB0D9]"/> 
                                    <span className="text-slate-400">{state.config.fax}</span>
                                </li>
                            )}
                            <li className="flex items-center gap-4 hover:text-white transition-colors">
                                <Mail size={22} className="text-[#2EB0D9]"/> 
                                <a href={`mailto:${state.config.contactEmail}`} className="text-slate-400 hover:text-white transition-colors">{state.config.contactEmail}</a>
                            </li>
                            <li className="flex items-start gap-4 hover:text-white transition-colors">
                                <MapPin size={22} className="text-[#2EB0D9]"/> 
                                <div>
                                    <a href={`https://waze.com/ul?q=${encodeURIComponent(state.config.address)}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">{state.config.address}</a>
                                    {/* WAZE BUTTON FOR MOBILE */}
                                    <a href={`https://waze.com/ul?q=${encodeURIComponent(state.config.address)}`} target="_blank" rel="noopener noreferrer" className="md:hidden mt-2 inline-flex items-center gap-2 bg-[#2EB0D9]/20 text-[#2EB0D9] px-3 py-1 rounded-full text-xs font-bold border border-[#2EB0D9]/50 hover:bg-[#2EB0D9] hover:text-white transition-colors">
                                        <Navigation size={12} /> נווט עם Waze
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="col-span-1">
                        <div className="w-full h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-800"><iframe width="100%" height="100%" frameBorder="0" style={{ border: 0, opacity: 0.6, filter: 'invert(90%) hue-rotate(180deg)' }} src={`https://maps.google.com/maps?q=${encodeURIComponent(state.config.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe></div>
                    </div>
                </div>
                <div className="container mx-auto px-4 pt-8 border-t border-slate-900 text-center text-sm text-slate-600 flex flex-col items-center gap-2">
                    <p>&copy; {new Date().getFullYear()} MOR ERAN KAGAN & CO.</p>
                    <button onClick={() => setShowLegalDisclaimer(true)} className="text-xs text-slate-500 hover:text-[#2EB0D9] underline transition-colors">תנאי שימוש והצהרת פרטיות</button>
                    <div className="text-[10px] text-slate-600 mt-2">{dataVersion}</div>
                </div>
            </footer>
      )}

      {/* Floating Widgets & Modals */}
      <FloatingWidgets version={version} dataVersion={dataVersion} />
      
      {/* (Modal Rendering code - same as original) */}
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
                        <div className="flex gap-2">
                            <ShareMenu variant="inline" title={selectedArticle.title} text="מאמר משפטי מעניין שקראתי:" url={`${window.location.origin}${window.location.pathname}#article:${selectedArticle.id}`} colorClass={theme.textMuted}/>
                            <button onClick={() => setSelectedArticle(null)} className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${theme.textMuted}`}><X size={20} /></button>
                        </div>
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

      {/* Other Modals (Timeline, Wills, Team, Forms, Legal) remain as is... */}
      {selectedTimelineItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedTimelineItem(null)}></div>
            <div className={`rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col relative z-10 animate-fade-in-up border ${theme.modalBg}`}>
                <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div>
                        <h2 className={`text-xl font-black ${theme.textTitle}`}>{selectedTimelineItem.title}</h2>
                        <span className="text-xs text-[#2EB0D9] uppercase tracking-wider">עדכון / פסיקה</span>
                    </div>
                    <div className="flex gap-2">
                        <ShareMenu variant="inline" title={selectedTimelineItem.title} text="עדכון משפטי חשוב:" url={`${window.location.origin}${window.location.pathname}#update:${selectedTimelineItem.id}`} colorClass={theme.textMuted}/>
                        <button onClick={() => setSelectedTimelineItem(null)} className={`p-2 rounded-full hover:bg-black/10 transition-colors ${theme.textMuted}`}><X size={24} /></button>
                    </div>
                </div>
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
                    <div className="flex-1 overflow-y-auto p-6"><p className={`text-lg leading-relaxed ${theme.textMain}`}>{selectedTimelineItem.description}</p></div>
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
             <div className={`rounded-2xl shadow-2xl w-full max-w-3xl h-full md:h-auto md:max-h-[85vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                 <button onClick={() => setSelectedTeamMember(null)} className="absolute top-4 left-4 z-20 p-2 bg-black/50 rounded-full hover:bg-black/70 text-white"><X size={20} /></button>
                 <div className="md:w-2/5 h-64 md:h-auto relative flex-shrink-0"><img src={selectedTeamMember.imageUrl} className="w-full h-full object-cover opacity-90" /></div>
                 <div className={`flex-1 flex flex-col overflow-hidden`}>
                     <div className={`p-8 overflow-y-auto ${theme.textMain}`}>
                         <span className="text-[#2EB0D9] font-bold text-sm mb-1">{selectedTeamMember.role}</span>
                         <h2 className={`text-3xl font-black mb-2 ${theme.textTitle}`}>{selectedTeamMember.fullName}</h2>
                         <p className={`leading-relaxed text-sm p-4 rounded-lg border mb-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>{selectedTeamMember.bio || 'אין מידע נוסף.'}</p>
                         <div className="space-y-3 mt-auto">
                             <a href={`mailto:${selectedTeamMember.email}`} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[#2EB0D9]/10 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><div className="p-2 bg-[#2EB0D9]/20 rounded-full text-[#2EB0D9]"><Mail size={18}/></div><div className="flex flex-col"><span className="text-xs text-slate-500">שלח מייל</span><span className="font-bold text-sm">{selectedTeamMember.email}</span></div></a>
                             <a href={`tel:${selectedTeamMember.phone}`} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-[#2EB0D9]/10 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><div className="p-2 bg-[#2EB0D9]/20 rounded-full text-[#2EB0D9]"><Phone size={18}/></div><div className="flex flex-col"><span className="text-xs text-slate-500">חייג ישירות</span><span className="font-bold text-sm" dir="ltr">{selectedTeamMember.phone}</span></div></a>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
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

      {showLegalDisclaimer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowLegalDisclaimer(false)}></div>
                <div className={`rounded-xl shadow-2xl w-full max-w-2xl relative z-10 animate-fade-in-up border p-8 max-h-[80vh] overflow-y-auto ${theme.modalBg}`}>
                    <div className="flex justify-between items-center mb-6"><h3 className={`text-2xl font-bold ${theme.textTitle}`}>תנאי שימוש והצהרת פרטיות</h3><button onClick={() => setShowLegalDisclaimer(false)}><X size={24} className={theme.textMuted}/></button></div>
                    <div className={`prose ${isDark ? 'prose-invert' : ''} max-w-none text-sm leading-relaxed`}>
                         <p><strong>כללי:</strong> האתר מנוהל ע"י משרד עורכי הדין מור ערן כגן ושות'. השימוש באתר כפוף לתנאים אלו.</p>
                         <p><strong>העדר ייעוץ משפטי:</strong> התוכן באתר הינו למטרות מידע בלבד ואינו מהווה ייעוץ משפטי. כל הסתמכות על המידע הינה באחריות המשתמש בלבד.</p>
                         <p><strong>פרטיות:</strong> אנו מכבדים את פרטיותך. פרטים אישיים שתמסור בטפסים ישמשו אך ורק לצורך יצירת קשר או מתן השירות המבוקש ולא יועברו לצד ג' ללא אישור.</p>
                    </div>
                    <div className="mt-6 text-center">
                        <Button onClick={() => setShowLegalDisclaimer(false)}>סגור</Button>
                    </div>
                </div>
            </div>
      )}

    </div>
  );
};
