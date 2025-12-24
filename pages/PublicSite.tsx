
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS, CalculatorDefinition } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx';
import { emailService } from '../services/api.ts'; 
import { Search, Phone, MapPin, Mail, Menu, X, ArrowLeft, Navigation, FileText, Settings, ChevronLeft, ChevronRight, Loader2, Scale, BookOpen, ClipboardList, Newspaper, AlertOctagon, HelpCircle, Printer, MessageCircle, Calculator, ChevronDown, Filter, Tag, ArrowRightCircle } from 'lucide-react';

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
    if (!calculator || !calculator.scenarios || calculator.scenarios.length === 0) return null;

    const initialScenarioId = calculator.scenarios[0].id;
    const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenarioId);
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

  useEffect(() => {
      let pageTitle = "MeLaw - משרד עורכי דין ונוטריון";
      if (selectedArticle) {
          pageTitle = `${selectedArticle.title} | MeLaw`;
      } else if (state.currentCategory !== Category.HOME) {
          pageTitle = `${CATEGORY_LABELS[state.currentCategory]} | MeLaw`;
      }
      document.title = pageTitle;
  }, [state.currentCategory, selectedArticle]);

  const currentSlides = state.slides.filter(s => {
      if (!s.categories && (s as any).category) return (s as any).category === state.currentCategory || (s as any).category === Category.HOME;
      if (state.currentCategory === Category.HOME) return s.categories?.includes(Category.HOME);
      return s.categories?.includes(state.currentCategory) || s.categories?.includes(Category.HOME); 
  }).sort((a, b) => (a.order || 99) - (b.order || 99));

  const currentArticles = state.articles.filter(a => state.currentCategory === Category.HOME || state.currentCategory === Category.STORE ? true : a.categories.includes(state.currentCategory)).sort((a, b) => (a.order || 99) - (b.order || 99));
  const currentCategoryForms = state.forms.filter(f => f.categories && f.categories.includes(state.currentCategory)).sort((a, b) => (a.order || 99) - (b.order || 99));
  const currentCategoryCalculators = (state.calculators || []).filter(c => c.categories && c.categories.includes(state.currentCategory));
  
  const teamMembers = state.teamMembers.sort((a, b) => (a.order || 99) - (b.order || 99));
  
  const currentTimelines = state.timelines.filter(t => {
      if (!t.category || t.category.length === 0) return state.currentCategory === Category.HOME;
      if (state.currentCategory === Category.HOME || state.currentCategory === Category.STORE) return true;
      return t.category.includes(state.currentCategory);
  });

  const storeProducts = (state.products || []).filter(p => {
      if (p.categories) return state.currentCategory === Category.STORE || p.categories.includes(state.currentCategory);
      return state.currentCategory === Category.STORE || (p as any).category === state.currentCategory;
  }).sort((a, b) => (a.order || 99) - (b.order || 99));

  const STORE_PAGE_SIZE = 8;
  const uniqueTags = Array.from(new Set(storeProducts.flatMap(p => p.tags || []))).sort();
  const filteredStoreProducts = storeProducts.filter(p => {
      if (selectedStoreTags.length === 0) return true;
      return p.tags?.some(tag => selectedStoreTags.includes(tag));
  });
  const totalStorePages = Math.ceil(filteredStoreProducts.length / STORE_PAGE_SIZE);
  const visibleStoreProducts = filteredStoreProducts.slice(storePage * STORE_PAGE_SIZE, (storePage + 1) * STORE_PAGE_SIZE);

  const toggleStoreTag = (tag: string) => {
      setStorePage(0);
      if (selectedStoreTags.includes(tag)) setSelectedStoreTags(selectedStoreTags.filter(t => t !== tag));
      else setSelectedStoreTags([...selectedStoreTags, tag]);
  };

  const mixedTimelineItems = [
      ...currentTimelines.map(item => ({ ...item, type: 'timeline', sortOrder: item.order || 99 })),
      ...currentCategoryCalculators.map(calc => ({
          id: calc.id,
          title: calc.title,
          description: 'חישוב מהיר ומדויק של מדרגות המס בהתאם לשווי העסקה.',
          imageUrl: '', 
          category: [],
          type: 'calculator', 
          linkTo: '',
          sortOrder: calc.order || 99 
      }))
  ].sort((a,b) => a.sortOrder - b.sortOrder);

  const getCardVariant = (index: number) => {
      const variants = isDark ? ['bg-slate-900 border-slate-800', 'bg-[#0f172a] border-slate-800', 'bg-slate-800/50 border-slate-700', 'bg-[#0B1120] border-[#1e293b]'] : ['bg-white border-slate-200', 'bg-[#F0F9FF] border-blue-100', 'bg-[#F8FAFC] border-slate-200', 'bg-[#eff6ff] border-blue-50'];
      return variants[index % variants.length];
  };

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
        } else if (slide.categories?.length > 0) {
            onCategoryChange(slide.categories[0]);
        }
    } else if (slide.categories?.length > 0) {
        onCategoryChange(slide.categories[0]);
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
          await emailService.sendForm('General Contact Form', { ...contactForm, submissionId }, state.config.integrations as any, undefined, false, state.config.contactEmail);
          alert(`הודעתך נשלחה בהצלחה! מספר פנייה: ${submissionId}\nניצור קשר בהקדם.`);
          setContactForm({ name: '', phone: '', message: '' });
      } catch (e: any) {
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
          alert("הפרטים נקלטו בהצלחה במערכת! טיוטת הצוואה תופק ותשלח אליך למייל בהקדם."); 
          setShowWillsModal(false); setFormStep(0);
      } catch (error: any) { 
          alert("אירעה שגיאה, אנא נסה שנית."); 
      } finally { 
          setIsSubmittingWill(false); 
      }
  };

  const currentDynamicForm = state.forms.find(f => f.id === activeDynamicFormId);
  const currentCalculator = state.calculators?.find(c => c.id === activeCalculatorId);
  const isContactPage = state.currentCategory === Category.CONTACT;
  const isStorePage = state.currentCategory === Category.STORE;
  const isHomePage = state.currentCategory === Category.HOME;
  const hasWillsGenerator = state.currentCategory === Category.WILLS;

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-[#2EB0D9] selection:text-white ${theme.bgMain} ${theme.textMain}`}>
      <div className={`fixed inset-0 pointer-events-none z-0 ${isDark ? 'opacity-30' : 'opacity-60'} overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#2EB0D9]/20 via-transparent to-purple-500/20 animate-gradient-xy"></div>
      </div>

      <header className={`fixed top-0 left-0 right-0 backdrop-blur-md shadow-lg z-40 h-20 transition-all border-b ${theme.headerBg}`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4"><h1 className="text-lg md:text-xl font-black tracking-wide cursor-pointer leading-none" onClick={() => onCategoryChange(Category.HOME)} style={{ fontFamily: "'MyLogoFont', Cambria, serif" }}><span className="block text-[#2EB0D9] drop-shadow-md">MOR ERAN KAGAN</span><span className={`${theme.textMuted} text-sm tracking-widest font-sans font-normal`}>& CO</span></h1></div>
          <nav className="hidden md:flex items-center gap-6">{state.menuItems.map(item => (<button key={item.id} onClick={() => onCategoryChange(item.cat)} className={`text-sm font-medium transition-colors border-b-2 hover:text-[#2EB0D9] ${state.currentCategory === item.cat ? 'text-[#2EB0D9] border-[#2EB0D9]' : `${theme.textMuted} border-transparent`}`}>{item.label}</button>))}<div className={`w-px h-6 mx-2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div><button className={`${theme.textMuted} hover:text-[#2EB0D9]`}><Search size={20}/></button></nav>
          <button className={`md:hidden ${theme.textTitle}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
      </header>

      <main className="flex-1 pt-20 relative z-10">
        
        {currentSlides.length > 0 && (
        <section className="relative h-[45vh] md:h-[55vh] overflow-hidden bg-black group">
          {currentSlides.map((slide, index) => (
             <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-full h-full overflow-hidden"><img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover opacity-50 animate-ken-burns" /></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex items-center pb-20">
                    <div className="container mx-auto px-6 md:px-12">
                        <div className="max-w-4xl text-white space-y-4 animate-fade-in-up">
                            <span className="inline-block px-4 py-1 bg-[#2EB0D9]/90 text-xs font-bold uppercase tracking-widest rounded-full mb-1 text-white shadow-lg">{CATEGORY_LABELS[state.currentCategory]}</span>
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

        {isHomePage && (
            <Reveal className="relative z-20 -mt-20 container mx-auto px-4">
                 <div className={`shadow-2xl rounded-2xl p-6 border ${theme.cardBg}`}>
                     <div className="flex justify-between items-center mb-6"><SectionTitle title="הנבחרת שלנו" isDark={isDark} /><div className="hidden md:flex gap-2"><button onClick={() => scrollContainer(teamScrollRef, 'right')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronRight size={24}/></button><button onClick={() => scrollContainer(teamScrollRef, 'left')} className={`p-2 rounded-full border hover:opacity-80 transition-all ${theme.cardBg} ${theme.textMain} ${theme.border}`}><ChevronLeft size={24}/></button></div></div>
                     <div ref={teamScrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x mx-auto w-full">{teamMembers.map(member => (<div key={member.id} onClick={() => setSelectedTeamMember(member)} className={`flex-shrink-0 w-[200px] md:w-[calc(25%-18px)] snap-center lg:snap-start group cursor-pointer rounded-xl overflow-hidden shadow-lg transition-all duration-500 hover:-translate-y-2 border ${theme.cardBg} ${theme.cardHover}`}><div className="h-32 md:h-48 w-full overflow-hidden relative"><img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover animate-ken-burns grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100" /></div><div className="p-3 text-center"><h4 className={`font-bold text-base md:text-lg mb-1 group-hover:text-[#2EB0D9] transition-colors ${theme.textTitle}`}>{member.fullName}</h4><p className={`text-[10px] md:text-xs font-medium uppercase tracking-wide line-clamp-1 ${theme.textMuted}`}>{member.role}</p></div></div>))}</div>
                 </div>
            </Reveal>
        )}

        {/* DYNAMIC FORM RENDERING */}
        {currentDynamicForm && (
            <div ref={dynamicFormRef} className={`mb-20 mt-10 container mx-auto px-4 rounded-2xl p-8 md:p-12 shadow-2xl border-t-4 border-[#2EB0D9] animate-fade-in-up border-x border-b ${theme.cardBg}`}>
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
                                 {field.type === 'composite_name_id' ? (
                                     <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                                         <label className={`block text-sm font-bold ${theme.textMuted}`}>{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                         <div className="grid grid-cols-2 gap-3">
                                             <input
                                                 type="text"
                                                 placeholder="שם פרטי"
                                                 className={`w-full p-3 border rounded-lg text-sm ${theme.inputBg}`}
                                                 value={dynamicFormValues[`${field.id}_first`] || ''}
                                                 onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_first`]: e.target.value})}
                                             />
                                             <input
                                                 type="text"
                                                 placeholder="שם משפחה"
                                                 className={`w-full p-3 border rounded-lg text-sm ${theme.inputBg}`}
                                                 value={dynamicFormValues[`${field.id}_last`] || ''}
                                                 onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_last`]: e.target.value})}
                                             />
                                         </div>
                                         <input
                                             type="tel"
                                             placeholder="מספר תעודת זהות (9 ספרות)"
                                             maxLength={9}
                                             className={`w-full p-3 border rounded-lg text-sm ${theme.inputBg}`}
                                             value={dynamicFormValues[`${field.id}_idNum`] || ''}
                                             onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_idNum`]: e.target.value.replace(/[^0-9]/g, '')})}
                                         />
                                     </div>
                                 ) : (
                                     <>
                                         <label className={`block text-sm font-bold ${theme.textMuted}`}>{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                         {field.type === 'text' && <input type="text" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                         {field.type === 'email' && <input type="email" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                         {field.type === 'number' && <input type="number" className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                         {field.type === 'boolean' && (
                                             <div className="flex gap-4">
                                                 <label className="flex items-center gap-2 cursor-pointer text-slate-400"><input type="radio" name={field.id} checked={dynamicFormValues[field.id] === 'yes'} onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: 'yes'})} /> כן</label>
                                                 <label className="flex items-center gap-2 cursor-pointer text-slate-400"><input type="radio" name={field.id} checked={dynamicFormValues[field.id] === 'no'} onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: 'no'})} /> לא</label>
                                             </div>
                                         )}
                                         {field.type === 'select' && <select className={`w-full p-4 border rounded-lg ${theme.inputBg}`} value={dynamicFormValues[field.id] || ''} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}><option value="">בחר...</option>{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>}
                                     </>
                                 )}
                             </div>
                         ))}
                         <Button className="w-full mt-6 py-4 text-lg font-bold shine-effect flex justify-center items-center gap-2" variant="secondary" disabled={isSubmittingDynamic} onClick={async () => { 
                             setIsSubmittingDynamic(true); 
                             for (const field of currentDynamicForm.fields) {
                                 if (field.required) {
                                     if (field.type === 'composite_name_id') {
                                         if (!dynamicFormValues[`${field.id}_first`] || !dynamicFormValues[`${field.id}_last`] || !dynamicFormValues[`${field.id}_idNum`]) {
                                             alert(`אנא מלא את כל הפרטים בשדה "${field.label}"`);
                                             setIsSubmittingDynamic(false); return;
                                         }
                                     } else if (!dynamicFormValues[field.id]) {
                                         alert(`השדה "${field.label}" הוא שדה חובה.`);
                                         setIsSubmittingDynamic(false); return;
                                     }
                                 }
                             }
                             const submissionId = generateSubmissionId();
                             const mappedData: any = { submissionId };
                             currentDynamicForm.fields.forEach(field => {
                                 if (field.type === 'composite_name_id') {
                                     const f = dynamicFormValues[`${field.id}_first`] || "";
                                     const l = dynamicFormValues[`${field.id}_last`] || "";
                                     const i = dynamicFormValues[`${field.id}_idNum`] || "";
                                     mappedData[field.label] = `${f} ${l} (ת.ז: ${i})`;
                                     mappedData[`${field.label} (פרטי)`] = f;
                                     mappedData[`${field.label} (משפחה)`] = l;
                                     mappedData[`${field.label} (ת.ז)`] = i;
                                 } else mappedData[field.label] = dynamicFormValues[field.id] || "";
                             });
                             try { 
                                 await emailService.sendForm(currentDynamicForm.title, mappedData, state.config.integrations as any, currentDynamicForm.pdfTemplate, currentDynamicForm.sendClientEmail, currentDynamicForm.submitEmail || state.config.contactEmail); 
                                 alert(`נשלח בהצלחה! מספר אסמכתא: ${submissionId}`); 
                                 if (currentDynamicForm.nextFormId) {
                                     setActiveDynamicFormId(currentDynamicForm.nextFormId);
                                     setDynamicFormValues({});
                                 } else setActiveDynamicFormId(null);
                             } catch (e) { alert("שגיאה בשליחה"); } finally { setIsSubmittingDynamic(false); } 
                         }}>
                             {isSubmittingDynamic ? 'שולח...' : (currentDynamicForm.submitButtonText || 'שלח טופס')}
                             {!isSubmittingDynamic && currentDynamicForm.nextFormId && <ArrowRightCircle size={20} />}
                         </Button>
                     </div>
                 </div>
            </div>
        )}

        {/* REST OF CONTENT */}
        {!isContactPage && (
            <Reveal delay={200} className="py-20 container mx-auto px-4">
                 <div className="flex justify-between items-end mb-8"><SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} /><div className="hidden md:flex gap-2"><button onClick={() => scrollContainer(timelineScrollRef, 'right')} className={`p-2 rounded-full border ${theme.cardBg}`}><ChevronRight/></button><button onClick={() => scrollContainer(timelineScrollRef, 'left')} className={`p-2 rounded-full border ${theme.cardBg}`}><ChevronLeft/></button></div></div>
                 <div ref={timelineScrollRef} className="flex gap-4 md:gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x">
                     {mixedTimelineItems.map((item, index) => (
                         <div key={item.id} onClick={() => handleTimelineClick(item)} className={`flex-shrink-0 w-[140px] md:w-[calc(25%-18px)] rounded-2xl shadow-lg overflow-hidden cursor-pointer group snap-start flex flex-col h-[200px] md:h-[240px] border border-transparent ${item.type === 'calculator' || item.linkTo ? 'bg-gradient-to-br from-[#2EB0D9] to-[#1F8CAD] text-white' : theme.cardBg}`}>
                             <div className="p-4 md:p-6 flex flex-col h-full relative">
                                 <div className="mt-8"><h4 className="text-sm md:text-xl font-black mb-2 leading-tight line-clamp-2">{item.title}</h4><p className="text-[10px] md:text-xs leading-relaxed line-clamp-3 opacity-80">{item.description}</p></div>
                                 <div className="mt-auto pt-2 flex items-center justify-between"><span className="text-[10px] md:text-xs font-bold flex items-center gap-1">התחל עכשיו <ArrowLeft size={12}/></span></div>
                             </div>
                         </div>
                     ))}
                 </div>
            </Reveal>
        )}

        <footer className="bg-black text-slate-400 pt-20 pb-10 relative z-10 border-t border-slate-900">
            <div className="container mx-auto px-4 text-center text-sm flex flex-col items-center gap-2">
                <p>&copy; {new Date().getFullYear()} MOR ERAN KAGAN & CO. {dataVersion}</p>
                {onAdminClick && <button onClick={onAdminClick} className="text-xs text-slate-700 hover:text-white mt-4">Settings</button>}
            </div>
        </footer>
      </main>

      <FloatingWidgets dataVersion={dataVersion} />
      
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fade-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedArticle(null)}></div>
            <div className={`md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                <div className="flex-1 flex flex-col h-full relative p-8 overflow-y-auto">
                    <button onClick={() => setSelectedArticle(null)} className="absolute top-4 left-4"><X/></button>
                    <h2 className={`text-3xl font-black mb-6 ${theme.textTitle}`}>{selectedArticle.title}</h2>
                    <div className="prose prose-lg max-w-none">
                        {selectedArticle.tabs[activeArticleTab]?.content.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* (Other Modals: Wills, Team, etc.) */}
      {selectedTeamMember && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setSelectedTeamMember(null)}></div>
             <div className={`rounded-2xl shadow-2xl w-full max-w-3xl h-full md:h-auto md:max-h-[85vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up border ${theme.modalBg}`}>
                 <button onClick={() => setSelectedTeamMember(null)} className="absolute top-4 left-4 z-20 p-2 bg-black/50 rounded-full hover:bg-black/70 text-white"><X size={20} /></button>
                 <div className="md:w-2/5 h-64 md:h-auto relative flex-shrink-0"><img src={selectedTeamMember.imageUrl} className="w-full h-full object-cover opacity-90" /></div>
                 <div className={`flex-1 p-8 overflow-y-auto ${theme.textMain}`}>
                     <span className="text-[#2EB0D9] font-bold text-sm mb-1">{selectedTeamMember.role}</span>
                     <h2 className={`text-3xl font-black mb-2 ${theme.textTitle}`}>{selectedTeamMember.fullName}</h2>
                     <p className="leading-relaxed text-sm p-4 rounded-lg border mb-4 bg-black/5">{selectedTeamMember.bio}</p>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};
