
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS, CalculatorDefinition, Product } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx';
import { emailService } from '../services/api.ts'; 
import { Search, Phone, MapPin, Mail, Menu, X, ArrowLeft, Navigation, FileText, Settings, ChevronLeft, ChevronRight, Loader2, Scale, BookOpen, ClipboardList, Newspaper, AlertOctagon, HelpCircle, Printer, MessageCircle, Calculator, ChevronDown, Filter, Tag, ArrowRightCircle, UserPlus, Users } from 'lucide-react';

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
    const [result, setResult] = useState<{ total: number, steps: any[] } | null>(null);

    const scenario = calculator.scenarios.find(s => s.id === selectedScenarioId);
    const shareUrl = `${window.location.origin}${window.location.pathname}#calc:${calculator.id}`;

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, ''); 
        if (!val) { setPrice(''); return; }
        setPrice(parseInt(val).toLocaleString('en-US'));
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
                steps.push({ threshold: bracket.threshold, rate: bracket.rate, amountInBracket: taxableInBracket, tax: tax, isLast: remaining <= 0, dealValue: amount });
                previousThreshold = bracket.threshold;
            }
        }
        setResult({ total: totalTax, steps });
    };

    return (
        <div className={`mb-20 container mx-auto px-4 rounded-2xl shadow-2xl animate-fade-in-up border-x border-b overflow-hidden relative ${theme.cardBg} border-t-0`}>
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#2EB0D9]"></div>
            <div className="p-4 md:p-12 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-start mb-6 border-b border-[#2EB0D9]/20 pb-4">
                        <div>
                            <h3 className={`text-2xl md:text-4xl font-black mb-2 flex items-center gap-3 ${theme.textTitle}`}>
                                <Calculator className="text-[#2EB0D9]"/> {calculator.title}
                            </h3>
                            <p className="text-slate-400 text-sm">חישוב מדרגות מס רכישה מעודכן</p>
                        </div>
                        <div className="flex gap-2">
                            <ShareMenu variant="inline" title={calculator.title} text="מחשבון מס מומלץ:" url={shareUrl} colorClass={theme.textMuted} />
                            <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={20} className={theme.textMuted}/></button>
                        </div>
                    </div>
                    <div className={`p-4 md:p-8 rounded-2xl border shadow-inner space-y-6 ${theme.bgMain} ${theme.border}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs font-bold mb-2 ${theme.textMuted}`}>סוג העסקה</label>
                                <select className={`w-full p-4 border rounded-xl font-bold ${theme.inputBg}`} value={selectedScenarioId} onChange={(e) => { setSelectedScenarioId(e.target.value); setResult(null); }}>
                                    {calculator.scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-xs font-bold mb-2 ${theme.textMuted}`}>שווי הנכס (בש"ח)</label>
                                <input type="text" className={`w-full p-4 border rounded-xl font-bold ${theme.inputBg}`} value={price} onChange={handlePriceChange} placeholder="0" />
                            </div>
                        </div>
                        <Button onClick={calculate} size="lg" className="w-full shadow-xl shadow-[#2EB0D9]/20">בצע חישוב</Button>
                        {result && (
                            <div className="mt-8 animate-fade-in">
                                <div className="p-6 rounded-xl bg-[#2EB0D9]/10 border border-[#2EB0D9]/30 text-center">
                                    <div className={`text-sm mb-1 ${theme.textMuted}`}>סה"כ מס לתשלום</div>
                                    <div className="text-4xl font-black text-[#2EB0D9]">{formatCurrency(result.total)}</div>
                                </div>
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
  onAdminClick: () => void;
  dataVersion: string;
}

const generateSubmissionId = () => 'REF-' + Math.random().toString(36).substr(2, 5).toUpperCase();

export const PublicSite: React.FC<PublicSiteProps> = ({ state, onCategoryChange, onWillsFormSubmit, onAdminClick, dataVersion }) => {
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeCalc, setActiveCalc] = useState<string | null>(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
    const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
    const [isSubmittingDynamic, setIsSubmittingDynamic] = useState(false);
    
    const isDark = state.config.theme === 'dark';
    const theme = {
        bgMain: isDark ? 'bg-slate-950' : 'bg-slate-50',
        cardBg: isDark ? 'bg-slate-900' : 'bg-white',
        textTitle: isDark ? 'text-white' : 'text-slate-900',
        textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
        border: isDark ? 'border-slate-800' : 'border-slate-200',
        inputBg: isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'
    };

    const dynamicFormRef = useRef<HTMLDivElement>(null);
    const teamScrollRef = useRef<HTMLDivElement>(null);

    const filteredSlides = (state.slides || [])
        .filter(s => s.categories?.includes(state.currentCategory) || state.currentCategory === Category.HOME)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const filteredArticles = (state.articles || [])
        .filter(a => a.categories?.includes(state.currentCategory))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const filteredTeam = (state.teamMembers || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const filteredProducts = (state.products || [])
        .filter(p => p.categories?.includes(state.currentCategory))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentCategoryCalculators = (state.calculators || []).filter(c => c.categories?.includes(state.currentCategory));
    const currentCategoryForms = (state.forms || []).filter(f => f.categories?.includes(state.currentCategory));

    useEffect(() => {
        if (filteredSlides.length > 1) {
            const interval = setInterval(() => {
                setActiveSlide(prev => (prev + 1) % filteredSlides.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [filteredSlides.length]);

    const handleFormClick = (formId: string) => {
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setTimeout(() => dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (ref.current) { const scrollAmount = 350; ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' }); }
    };

    return (
        <div className={`min-h-screen ${theme.bgMain} ${theme.textTitle} font-sans`} dir="rtl">
            {/* Header */}
            <header className={`sticky top-0 z-50 backdrop-blur-lg border-b ${theme.border} ${isDark ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <img src={state.config.logoUrl} alt={state.config.officeName} className="h-10 md:h-12 object-contain" />
                        <nav className="hidden lg:flex gap-6">
                            {(state.menuItems || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => onCategoryChange(item.cat)}
                                    className={`font-bold transition-colors ${state.currentCategory === item.cat ? 'text-[#2EB0D9]' : 'hover:text-[#2EB0D9]'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-black/10 rounded-full"><Search size={22} /></button>
                        <button className="lg:hidden" onClick={() => setIsMenuOpen(true)}><Menu size={28} /></button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900 p-8 flex flex-col gap-6 animate-fade-in">
                    <button className="self-end" onClick={() => setIsMenuOpen(false)}><X size={32} /></button>
                    {(state.menuItems || []).map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => { onCategoryChange(item.cat); setIsMenuOpen(false); }}
                            className="text-2xl font-black text-right"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Hero Slider */}
            {filteredSlides.length > 0 && (
                <section className="relative h-[60vh] md:h-[75vh] overflow-hidden bg-black">
                    {filteredSlides.map((slide, idx) => (
                        <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${idx === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                            <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent flex items-center pr-8 md:pr-24">
                                <div className="max-w-2xl text-white">
                                    <span className="text-[#2EB0D9] font-bold mb-4 block animate-fade-in">הבית המשפטי שלך</span>
                                    <h1 className="text-4xl md:text-7xl font-black mb-6 leading-tight animate-fade-in-up">{slide.title}</h1>
                                    <p className="text-lg md:text-2xl opacity-90 mb-8 animate-fade-in-up delay-100">{slide.subtitle}</p>
                                    {slide.buttonText && <Button size="lg" variant="secondary" className="animate-fade-in-up delay-200">{slide.buttonText}</Button>}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Timeline / Team Section */}
            <section className="relative -mt-16 md:-mt-24 z-20 pb-20">
                <div className="container mx-auto px-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 flex flex-nowrap overflow-x-auto gap-6 no-scrollbar border border-slate-100">
                        {state.currentCategory === Category.HOME ? (
                            filteredTeam.map(member => (
                                <div key={member.id} className="min-w-[200px] text-center flex-shrink-0">
                                    <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full overflow-hidden border-4 border-[#2EB0D9] mb-4">
                                        <img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover" />
                                    </div>
                                    <h4 className="font-bold text-slate-900">{member.fullName}</h4>
                                    <p className="text-xs text-slate-500">{member.role}</p>
                                </div>
                            ))
                        ) : (
                            filteredProducts.map(prod => (
                                <div key={prod.id} className="min-w-[250px] bg-slate-50 p-6 rounded-2xl flex-shrink-0 border border-slate-200 relative group">
                                    <div className="absolute top-4 left-4"><ShareMenu variant="inline" /></div>
                                    <h4 className="font-black text-slate-900 mb-2">{prod.title}</h4>
                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{prod.description}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xl font-bold text-[#2EB0D9]">₪{prod.price}</span>
                                        <Button size="sm">רכישה</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Dynamic Form Rendering */}
            {activeDynamicFormId && (
                <div ref={dynamicFormRef} className="container mx-auto px-4 py-20 animate-fade-in-up">
                    <div className={`max-w-2xl mx-auto rounded-2xl shadow-2xl p-8 md:p-12 border-t-4 border-[#2EB0D9] ${theme.cardBg}`}>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className={`text-3xl font-black ${theme.textTitle}`}>{state.forms.find(f => f.id === activeDynamicFormId)?.title}</h3>
                                <p className="text-sm text-slate-500">נא למלא את כל השדות הנדרשים</p>
                            </div>
                            <button onClick={() => setActiveDynamicFormId(null)} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X/></button>
                        </div>
                        <div className="space-y-8">
                            {state.forms.find(f => f.id === activeDynamicFormId)?.fields.map(field => (
                                <div key={field.id} className="space-y-3">
                                    {/* Composite Field: Name + ID */}
                                    {field.type === 'composite_name_id' && (
                                        <div className={`p-5 rounded-xl border-2 space-y-4 ${theme.bgMain} ${theme.border}`}>
                                            <label className="block text-sm font-black opacity-80 flex items-center gap-2"><UserPlus size={16} className="text-[#2EB0D9]"/> {field.label}</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input type="text" placeholder="שם פרטי" className={`p-3 rounded-lg border w-full ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_first`]: e.target.value})} />
                                                <input type="text" placeholder="שם משפחה" className={`p-3 rounded-lg border w-full ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_last`]: e.target.value})} />
                                            </div>
                                            <input type="text" placeholder="מספר תעודת זהות (9 ספרות)" maxLength={9} className={`w-full p-3 rounded-lg border font-mono ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_id`]: e.target.value.replace(/[^0-9]/g, '')})} />
                                        </div>
                                    )}

                                    {/* CHILDREN LIST CONTROL */}
                                    {field.type === 'children_list' && (
                                        <div className={`p-5 rounded-xl border-2 space-y-6 ${theme.bgMain} ${theme.border}`}>
                                            <label className="block text-sm font-black opacity-80 flex items-center gap-2"><Users size={16} className="text-[#2EB0D9]"/> {field.label}</label>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-2">כמה ילדים תרצו לציין בטופס?</p>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="20"
                                                    className={`w-24 p-3 rounded-lg border font-bold ${theme.inputBg}`}
                                                    value={dynamicFormValues[`${field.id}_count`] || 0}
                                                    onChange={e => {
                                                        const count = parseInt(e.target.value) || 0;
                                                        setDynamicFormValues({...dynamicFormValues, [`${field.id}_count`]: count});
                                                    }}
                                                />
                                            </div>

                                            {Array.from({ length: dynamicFormValues[`${field.id}_count`] || 0 }).map((_, childIdx) => (
                                                <div key={childIdx} className={`p-4 rounded-lg border border-dashed ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-300 bg-slate-100'} animate-fade-in-up`}>
                                                    <h5 className="text-xs font-bold text-[#2EB0D9] mb-3">פרטי ילד #{childIdx + 1}</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <input 
                                                            type="text" 
                                                            placeholder="שם פרטי" 
                                                            className={`p-2 text-sm rounded border ${theme.inputBg}`} 
                                                            onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_child_${childIdx}_first`]: e.target.value})}
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="שם משפחה" 
                                                            className={`p-2 text-sm rounded border ${theme.inputBg}`} 
                                                            onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_child_${childIdx}_last`]: e.target.value})}
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="ת.ז" 
                                                            className={`p-2 text-sm rounded border font-mono ${theme.inputBg}`} 
                                                            onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_child_${childIdx}_id`]: e.target.value.replace(/[^0-9]/g, '')})}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Standard Fields */}
                                    {['text', 'email', 'phone', 'number', 'select', 'boolean'].includes(field.type) && (
                                        <>
                                            <label className="block text-sm font-bold opacity-70">{field.label} {field.required && '*'}</label>
                                            {field.type === 'text' && <input type="text" className={`w-full p-4 rounded-lg border ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                            {field.type === 'email' && <input type="email" className={`w-full p-4 rounded-lg border ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                            {field.type === 'phone' && <input type="tel" className={`w-full p-4 rounded-lg border ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                            {field.type === 'number' && <input type="number" className={`w-full p-4 rounded-lg border ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />}
                                            {field.type === 'select' && (
                                                <select className={`w-full p-4 rounded-lg border ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}>
                                                    <option value="">בחר...</option>
                                                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                            <Button className="w-full h-14 text-lg font-bold shadow-xl shine-effect" variant="secondary" disabled={isSubmittingDynamic} onClick={async () => {
                                setIsSubmittingDynamic(true);
                                const currentForm = state.forms.find(f => f.id === activeDynamicFormId);
                                const submissionId = generateSubmissionId();
                                const mappedData: any = { submissionId };
                                
                                currentForm?.fields.forEach(f => {
                                    if (f.type === 'composite_name_id') {
                                        mappedData[f.label] = `${dynamicFormValues[`${f.id}_first`] || ''} ${dynamicFormValues[`${f.id}_last`] || ''} (ת.ז: ${dynamicFormValues[`${f.id}_id`] || ''})`;
                                    } else if (f.type === 'children_list') {
                                        const count = dynamicFormValues[`${f.id}_count`] || 0;
                                        let childrenDetails = [];
                                        for (let i = 0; i < count; i++) {
                                            childrenDetails.push(`${dynamicFormValues[`${f.id}_child_${i}_first`] || ''} ${dynamicFormValues[`${f.id}_child_${i}_last`] || ''} (${dynamicFormValues[`${f.id}_child_${i}_id`] || ''})`);
                                        }
                                        mappedData[f.label] = childrenDetails.join(' | ');
                                    } else {
                                        mappedData[f.label] = dynamicFormValues[f.id] || "";
                                    }
                                });

                                try {
                                    await emailService.sendForm(currentForm?.title || "Form", mappedData, state.config.integrations);
                                    alert("הטופס נשלח בהצלחה! אסמכתא: " + submissionId);
                                    setActiveDynamicFormId(null);
                                } catch (e) {
                                    alert("שגיאה בשליחה. נסה שוב מאוחר יותר.");
                                } finally {
                                    setIsSubmittingDynamic(false);
                                }
                            }}>
                                {isSubmittingDynamic ? <Loader2 className="animate-spin" /> : (state.forms.find(f => f.id === activeDynamicFormId)?.submitButtonText || 'שלח טופס')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Updates & Calculators */}
            <section className="py-20 container mx-auto px-4">
                <SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {currentCategoryCalculators.map(calc => (
                        <div key={calc.id} className={`${theme.cardBg} p-8 rounded-2xl border ${theme.border} shadow-lg hover:border-[#2EB0D9] transition-all cursor-pointer group`} onClick={() => setActiveCalc(calc.id)}>
                            <div className="p-3 bg-[#2EB0D9]/10 rounded-xl w-fit mb-6 group-hover:bg-[#2EB0D9] group-hover:text-white transition-colors">
                                <Calculator size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-2">{calc.title}</h4>
                            <p className={`${theme.textMuted} text-sm mb-6`}>חשב בקליק את חבות המס הצפויה בעסקה שלך.</p>
                            <span className="text-[#2EB0D9] font-bold flex items-center gap-2">להפעלה <ArrowLeft size={16} /></span>
                        </div>
                    ))}
                    {currentCategoryForms.map(form => (
                        <div key={form.id} className="bg-[#2EB0D9] p-8 rounded-2xl shadow-lg shadow-[#2EB0D9]/20 group cursor-pointer hover:-translate-y-1 transition-transform" onClick={() => handleFormClick(form.id)}>
                            <div className="p-3 bg-white/20 rounded-xl w-fit mb-6 text-white">
                                <ClipboardList size={28} />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">{form.title}</h4>
                            <p className="text-white/80 text-sm mb-6">מילוי טופס דיגיטלי מהיר ושליחה למשרד.</p>
                            <span className="text-white font-bold flex items-center gap-2">למילוי <ArrowLeft size={16} /></span>
                        </div>
                    ))}
                </div>

                {activeCalc && (
                    <div className="mt-12">
                        <TaxCalculatorWidget 
                            calculator={state.calculators.find(c => c.id === activeCalc)!} 
                            theme={theme} 
                            onClose={() => setActiveCalc(null)} 
                        />
                    </div>
                )}
            </section>

            {/* Articles Section */}
            <section className={`py-20 ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
                <div className="container mx-auto px-4">
                    <SectionTitle title="מאמרים ומדריכים" isDark={isDark} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredArticles.map(article => (
                            <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={`pt-20 pb-10 border-t ${theme.border} ${theme.cardBg}`}>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        <div>
                            <img src={state.config.logoUrl} alt="Logo" className="h-12 mb-6" />
                            <p className={`${theme.textMuted} text-sm leading-relaxed mb-8`}>
                                משרד עורכי הדין מור ערן כגן ושות' מעניק ליווי משפטי מקצועי וחדשני בתחומי המקרקעין, צוואות וירושות וייפוי כוח מתמשך.
                            </p>
                            <button onClick={onAdminClick} className="text-xs text-[#2EB0D9] hover:underline flex items-center gap-1">כניסה למערכת ניהול <Settings size={12}/></button>
                        </div>
                        <div>
                            <h5 className="font-bold text-lg mb-6">פרטי התקשרות</h5>
                            <ul className={`space-y-4 ${theme.textMuted}`}>
                                <li className="flex items-center gap-3"><Phone size={18} className="text-[#2EB0D9]"/> {state.config.phone}</li>
                                <li className="flex items-center gap-3"><Mail size={18} className="text-[#2EB0D9]"/> {state.config.contactEmail}</li>
                                <li className="flex items-center gap-3"><MapPin size={18} className="text-[#2EB0D9]"/> {state.config.address}</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold text-lg mb-6">מפת הגעה</h5>
                            <div className="rounded-2xl overflow-hidden h-48 border border-slate-700 bg-slate-200">
                                <div className="w-full h-full flex items-center justify-center text-slate-500">Google Map Placeholder</div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            <FloatingWidgets dataVersion={dataVersion} />
        </div>
    );
};
