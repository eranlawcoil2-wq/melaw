import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition, TeamMember } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { Search, Phone, MapPin, Mail, Menu, X, Check, ArrowLeft, Navigation, FileText, Quote, Lock, Settings, Briefcase, User, ArrowRight, ChevronLeft, ChevronRight, FileCheck, HelpCircle } from 'lucide-react';

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

// --- Reusable Section Title Component ---
const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <div className="mb-8">
        <h3 className="text-3xl font-black text-slate-900 inline-block relative z-10">
            {title}
        </h3>
        <div className="h-1.5 w-16 bg-[#2EB0D9] mt-2 rounded-full"></div>
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
  const [activeArticleTab, setActiveArticleTab] = useState(0); 
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);

  // Dynamic Form State
  const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  
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
          const scrollAmount = 300;
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
  
  const currentDynamicForm = state.forms.find(f => f.id === activeDynamicFormId);
  const activeTabContent = selectedArticle?.tabs?.[activeArticleTab]?.content || "";
  
  const relatedArticles = selectedArticle 
    ? state.articles.filter(a => a.category === selectedArticle.category && a.id !== selectedArticle.id).slice(0, 3)
    : [];

  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-slate-50 overflow-x-hidden selection:bg-[#2EB0D9] selection:text-white">
      
      {/* Background Floating Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#2EB0D9]/5 rounded-full blur-3xl animate-float-slow"></div>
          <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-slate-200/50 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[40%] right-[20%] w-[200px] h-[200px] bg-[#2EB0D9]/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* --- Article Modal Overlay --- */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedArticle(null)}></div>
            <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-6xl h-full md:h-[90vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up">
                <div className="hidden md:block w-1/4 h-full relative bg-slate-200 overflow-hidden">
                    <img src={selectedArticle.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover animate-ken-burns" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                    {selectedArticle.quote && (
                        <div className="absolute bottom-8 left-4 right-4 text-white">
                            <Quote size={24} className="mb-2 text-[#2EB0D9] opacity-80" />
                            <p className="font-serif italic text-lg leading-relaxed shadow-sm">"{selectedArticle.quote}"</p>
                        </div>
                    )}
                </div>
                <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
                    <div className="bg-white p-6 md:p-8 border-b border-slate-100 flex justify-between items-start flex-shrink-0">
                        <div>
                            <span className="inline-block px-3 py-1 bg-[#2EB0D9]/10 text-[#2EB0D9] text-xs font-bold rounded-full mb-3">{selectedArticle.category}</span>
                            <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{selectedArticle.title}</h2>
                        </div>
                        <button onClick={() => setSelectedArticle(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} className="text-slate-600" /></button>
                    </div>
                    <div className="px-6 md:px-8 pt-6 bg-white flex-shrink-0">
                        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
                            {selectedArticle.tabs.map((tab, idx) => (
                                <button key={idx} onClick={() => setActiveArticleTab(idx)} className={`px-6 py-3 text-sm md:text-base font-bold rounded-t-lg transition-all whitespace-nowrap ${activeArticleTab === idx ? 'bg-[#2EB0D9] text-white shadow-lg translate-y-[1px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{tab.title}</button>
                            ))}
                        </div>
                    </div>
                    <div ref={articleContentTopRef} className="flex-1 overflow-y-auto bg-white">
                        <div className="p-6 md:p-12 min-h-full flex flex-col">
                            <div className="md:hidden mb-6 rounded-xl overflow-hidden h-48 relative flex-shrink-0">
                                <img src={selectedArticle.imageUrl} className="w-full h-full object-cover" alt=""/>
                            </div>
                            <div className="prose max-w-none text-slate-700 leading-relaxed text-lg md:text-xl mb-12">
                                {activeTabContent.split('\n').map((paragraph, i) => (
                                    <p key={i} className="mb-4">{paragraph}</p>
                                ))}
                            </div>
                            {relatedArticles.length > 0 && (
                                <div className="mt-auto border-t border-slate-100 pt-8">
                                    <h4 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-[#2EB0D9] rounded-full"></span>
                                        עוד בנושא {selectedArticle.category}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {relatedArticles.map(relArticle => (
                                            <div key={relArticle.id} onClick={() => setSelectedArticle(relArticle)} className="group cursor-pointer flex gap-3 items-center bg-slate-50 p-2 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100 hover:border-[#2EB0D9]/30">
                                                <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                                                    <img src={relArticle.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt=""/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-bold text-sm text-slate-800 leading-tight mb-1 truncate group-hover:text-[#2EB0D9] transition-colors">{relArticle.title}</h5>
                                                    <p className="text-xs text-slate-500 line-clamp-1">לחץ לקריאה</p>
                                                </div>
                                                <ArrowLeft size={16} className="text-slate-300 group-hover:text-[#2EB0D9] group-hover:-translate-x-1 transition-all"/>
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
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowWillsModal(false)}></div>
             <div className="bg-white md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[85vh] overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up">
                 <div className="hidden md:flex w-1/3 bg-slate-900 text-white flex-col justify-between p-8 relative overflow-hidden">
                     <img src="https://picsum.photos/id/452/800/1200" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 animate-ken-burns" />
                     <div className="relative z-10">
                         <div className="w-12 h-12 bg-[#2EB0D9] rounded-lg flex items-center justify-center mb-6">
                             <FileText size={28} className="text-white"/>
                         </div>
                         <h2 className="text-3xl font-black mb-4">מחולל הצוואות הדיגיטלי</h2>
                         <p className="text-slate-300 leading-relaxed">ערוך צוואה חוקית ומקצועית ב-5 דקות באמצעות האלגוריתם המשפטי החכם שלנו.</p>
                     </div>
                     <div className="relative z-10 space-y-4">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Check size={16} className="text-[#2EB0D9]"/></div>
                             <span className="text-sm">חיסיון עורך דין מלא</span>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Check size={16} className="text-[#2EB0D9]"/></div>
                             <span className="text-sm">תקף משפטית</span>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Check size={16} className="text-[#2EB0D9]"/></div>
                             <span className="text-sm">ללא עלות ראשונית</span>
                         </div>
                     </div>
                 </div>

                 {/* Left Side - Form Wizard */}
                 <div className="flex-1 bg-white flex flex-col h-full">
                     <div className="p-4 border-b flex justify-between items-center">
                         <span className="text-sm font-bold text-slate-400">שלב {formStep + 1} מתוך 3</span>
                         <button onClick={() => setShowWillsModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-8 md:p-12">
                         {formStep === 0 && (
                            <div className="space-y-6 animate-fade-in">
                               <div>
                                   <h3 className="text-2xl font-bold text-slate-900 mb-2">נתחיל בפרטים אישיים</h3>
                                   <p className="text-slate-500">אנא מלא את פרטי המצווה</p>
                               </div>
                               <div className="space-y-4">
                                   <div>
                                       <label className="block text-sm font-bold text-slate-700 mb-2">שם מלא</label>
                                       <input type="text" className="w-full p-4 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#2EB0D9] outline-none transition" value={willsData.fullName} onChange={e => setWillsData({...willsData, fullName: e.target.value})} placeholder="ישראל ישראלי" />
                                   </div>
                                   <div>
                                       <label className="block text-sm font-bold text-slate-700 mb-2">שם בן/בת הזוג (אם יש)</label>
                                       <input type="text" className="w-full p-4 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#2EB0D9] outline-none transition" value={willsData.spouseName} onChange={e => setWillsData({...willsData, spouseName: e.target.value})} placeholder="פלונית אלמונית" />
                                   </div>
                               </div>
                               <Button size="lg" onClick={() => setFormStep(1)} className="w-full mt-8">המשך לשלב הבא</Button>
                            </div>
                         )}

                         {formStep === 1 && (
                            <div className="space-y-6 animate-fade-in">
                               <div>
                                   <h3 className="text-2xl font-bold text-slate-900 mb-2">היורשים והילדים</h3>
                                   <p className="text-slate-500">מי הם היורשים החוקיים?</p>
                               </div>
                               <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border">
                                  <label className="font-bold">מספר ילדים:</label>
                                  <div className="flex items-center gap-2">
                                      <button onClick={() => handleChildrenCountChange(Math.max(0, willsData.childrenCount - 1))} className="w-8 h-8 rounded-full bg-white border hover:bg-slate-100">-</button>
                                      <span className="w-8 text-center font-bold">{willsData.childrenCount}</span>
                                      <button onClick={() => handleChildrenCountChange(Math.min(10, willsData.childrenCount + 1))} className="w-8 h-8 rounded-full bg-white border hover:bg-slate-100">+</button>
                                  </div>
                               </div>
                               <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                  {willsData.childrenNames.map((name, idx) => (
                                      <div key={idx}>
                                          <label className="block text-xs font-bold text-slate-500 mb-1">שם הילד/ה {idx+1}</label>
                                          <input 
                                            placeholder={`שם מלא`} 
                                            className="w-full p-3 border rounded-lg" 
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
                                   <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                                      <FileCheck size={40} />
                                   </div>
                                   <h3 className="text-2xl font-bold text-slate-900">הצוואה מוכנה להפקה!</h3>
                                   <p className="text-slate-500 max-w-sm mx-auto mt-2">כדי לקבל את מסמך הצוואה הרשמי ולאשר אותו, אנא מלא את פרטי ההתקשרות הסופיים.</p>
                               </div>
                               <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                                   <h4 className="font-bold border-b pb-2 mb-2 text-slate-800">טופס פרטי קשר וסיום</h4>
                                   <div>
                                       <label className="block text-sm font-bold text-slate-700 mb-1">טלפון נייד</label>
                                       <input type="tel" className="w-full p-3 border rounded-lg bg-white" value={willsData.contactPhone} onChange={e => setWillsData({...willsData, contactPhone: e.target.value})} placeholder="050-0000000"/>
                                   </div>
                                   <div>
                                       <label className="block text-sm font-bold text-slate-700 mb-1">דואר אלקטרוני (לשליחת המסמך)</label>
                                       <input type="email" className="w-full p-3 border rounded-lg bg-white" value={willsData.contactEmail} onChange={e => setWillsData({...willsData, contactEmail: e.target.value})} placeholder="name@example.com"/>
                                   </div>
                               </div>
                               <div className="flex gap-3 mt-auto">
                                   <Button variant="outline" onClick={() => setFormStep(1)} className="flex-1">חזור</Button>
                                   <Button 
                                    variant="secondary" 
                                    onClick={() => { 
                                        onWillsFormSubmit(willsData); 
                                        alert("טופס נשלח בהצלחה! מסמך PDF ישלח למייל שלך."); 
                                        setShowWillsModal(false);
                                        setFormStep(0); 
                                    }} 
                                    className="flex-[2] font-bold text-lg"
                                   >
                                       שלח וקבל צוואה
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
             <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setSelectedTeamMember(null)}></div>
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden relative z-10 flex flex-col md:flex-row animate-fade-in-up">
                 <button onClick={() => setSelectedTeamMember(null)} className="absolute top-4 left-4 z-20 p-2 bg-white/80 rounded-full hover:bg-slate-100"><X size={20} /></button>
                 
                 <div className="md:w-2/5 h-64 md:h-auto relative">
                     <img src={selectedTeamMember.imageUrl} alt={selectedTeamMember.fullName} className="w-full h-full object-cover animate-ken-burns" />
                 </div>
                 <div className="md:w-3/5 p-8 flex flex-col justify-center">
                     <span className="text-[#2EB0D9] font-bold text-sm mb-1">{selectedTeamMember.role}</span>
                     <h2 className="text-3xl font-black text-slate-900 mb-2">{selectedTeamMember.fullName}</h2>
                     <div className="w-16 h-1 bg-[#2EB0D9] mb-6"></div>
                     
                     <div className="space-y-4 mb-8">
                         <div className="flex items-center gap-3 text-slate-600">
                             <Briefcase size={18} className="text-[#2EB0D9]"/>
                             <span>{selectedTeamMember.specialization}</span>
                         </div>
                         <div className="flex items-center gap-3 text-slate-600">
                             <Mail size={18} className="text-[#2EB0D9]"/>
                             <span>{selectedTeamMember.email}</span>
                         </div>
                         <div className="flex items-center gap-3 text-slate-600">
                             <Phone size={18} className="text-[#2EB0D9]"/>
                             <span>{selectedTeamMember.phone}</span>
                         </div>
                     </div>
                     
                     <p className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                         {selectedTeamMember.bio}
                     </p>
                 </div>
             </div>
         </div>
      )}

      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-40 h-20 transition-all">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Header Text Logo */}
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-wide cursor-pointer font-serif leading-none" onClick={() => onCategoryChange(Category.HOME)}>
               <span className="block text-[#2EB0D9]">MOR ERAN KAGAN</span>
               <span className="text-slate-600 text-sm tracking-widest font-sans font-normal">& CO</span>
            </h1>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {state.menuItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => onCategoryChange(item.cat)}
                className={`text-sm font-medium transition-colors hover:text-[#2EB0D9] ${state.currentCategory === item.cat ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-600'}`}
              >
                {item.label}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-300 mx-2"></div>
            <button className="text-slate-500 hover:text-[#2EB0D9]"><Search size={20}/></button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-slate-800" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
           <div className="md:hidden absolute top-20 left-0 w-full bg-white shadow-xl border-t border-slate-100 p-4 flex flex-col gap-4 animate-fade-in-up">
              {state.menuItems.map(item => (
                <button 
                    key={item.id}
                    onClick={() => { onCategoryChange(item.cat); setMobileMenuOpen(false); }}
                    className="text-right p-2 hover:bg-slate-50 rounded-lg text-slate-700 font-medium"
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
        <section className="relative h-[45vh] md:h-[55vh] overflow-hidden bg-slate-900 group">
          
          {/* Floating Logo (Left Side, Centered) - RESIZED AND COLORED */}
          <div className="absolute left-16 top-1/2 -translate-y-1/2 z-30 hidden lg:block opacity-90 hover:opacity-100 transition-opacity animate-float">
              <img 
                src={state.config.logoUrl} 
                alt="Logo" 
                className="h-48 w-auto object-contain drop-shadow-2xl" 
                style={{ filter: "drop-shadow(0 10px 8px rgb(0 0 0 / 0.5))" }}
              />
          </div>

          {currentSlides.map((slide, index) => (
             <div 
               key={slide.id}
               className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
             >
                {/* Apply Ken Burns Animation to Image */}
                <div className="w-full h-full overflow-hidden">
                    <img src={slide.imageUrl} alt={slide.title} className={`w-full h-full object-cover opacity-60 ${index === activeSlide ? 'animate-ken-burns' : ''}`} />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-transparent flex items-center">
                    <div className="container mx-auto px-6 md:px-12">
                        <div className="max-w-3xl text-white space-y-6 animate-fade-in-up">
                            <span className="inline-block px-4 py-1.5 bg-[#2EB0D9] text-sm font-bold uppercase tracking-widest rounded-full mb-2">
                                {slide.category === Category.HOME ? 'המשרד המוביל בישראל' : 'התמחות מקצועית'}
                            </span>
                            {/* Larger, Impressive Title */}
                            <h2 className="text-5xl md:text-7xl font-black leading-tight drop-shadow-xl">{slide.title}</h2>
                            <p className="text-xl text-slate-200 md:w-3/4 border-r-4 border-[#2EB0D9] pr-6 leading-relaxed">{slide.subtitle}</p>
                            <div className="pt-6">
                                <Button onClick={() => onCategoryChange(slide.category)} variant="secondary" size="lg" className="shadow-2xl shadow-[#2EB0D9]/40 transition-transform hover:scale-105">קבע פגישת ייעוץ</Button>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          ))}
          
          {/* Slider Dots */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-20">
            {currentSlides.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === activeSlide ? 'bg-[#2EB0D9] w-12' : 'bg-white/40 w-2 hover:bg-white'}`}
                />
            ))}
          </div>
        </section>

        {/* TEAM SECTION (HOME ONLY) - With Reveal */}
        {state.currentCategory === Category.HOME && (
            <Reveal className="py-12 bg-white/80 backdrop-blur-sm relative -mt-8 z-10 container mx-auto px-4">
                 <div className="bg-white shadow-xl rounded-xl p-8 border border-slate-100">
                     <div className="flex justify-between items-center mb-8">
                        {/* New Styled Title */}
                        <SectionTitle title="הנבחרת שלנו" />
                        
                        <div className="flex gap-2">
                            <button onClick={() => scrollContainer(teamScrollRef, 'right')} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"><ChevronRight size={20}/></button>
                            <button onClick={() => scrollContainer(teamScrollRef, 'left')} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"><ChevronLeft size={20}/></button>
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
                                className="flex-shrink-0 w-[260px] md:w-[280px] snap-start group cursor-pointer bg-slate-50 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 border border-slate-100"
                             >
                                 <div className="h-64 w-full overflow-hidden">
                                     {/* Added animation class here */}
                                     <img src={member.imageUrl} alt={member.fullName} className="w-full h-full object-cover animate-ken-burns" />
                                 </div>
                                 <div className="p-5 text-center">
                                     <h4 className="font-bold text-xl text-slate-900 group-hover:text-[#2EB0D9] transition-colors">{member.fullName}</h4>
                                     <p className="text-sm text-slate-500 font-medium">{member.role}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
            </Reveal>
        )}

        {/* TIMELINE (SCROLLABLE) - With Reveal */}
        <Reveal className="py-12 relative border-b border-slate-200" delay={200}>
           <div className="container mx-auto px-4 mb-6 flex justify-between items-end">
              <SectionTitle title={state.currentCategory === Category.HOME ? 'חדשות ועדכונים' : 'מדריכים ומידע מקצועי'} />
              
              <div className="flex gap-2">
                  <button onClick={() => scrollContainer(timelineScrollRef, 'right')} className="p-2 rounded-full bg-white shadow hover:bg-slate-100 text-slate-600"><ChevronRight size={20}/></button>
                  <button onClick={() => scrollContainer(timelineScrollRef, 'left')} className="p-2 rounded-full bg-white shadow hover:bg-slate-100 text-slate-600"><ChevronLeft size={20}/></button>
              </div>
           </div>
           
           <div className="container mx-auto px-4">
              <div 
                 ref={timelineScrollRef}
                 className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide snap-x"
              >
                  {currentTimelines.map((item, index) => {
                      const isGenerator = item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-'));
                      
                      // 4 Shades of Gray Logic (Cyclic)
                      const grayShades = [
                          'bg-white',
                          'bg-slate-50',
                          'bg-gray-100',
                          'bg-[#f1f5f9]' 
                      ];
                      const currentBg = grayShades[index % 4];

                      return (
                          <div 
                            key={item.id} 
                            onClick={() => handleTimelineClick(item)}
                            className={`
                                flex-shrink-0 w-[280px] md:w-[calc(25%-12px)] h-[200px]
                                p-5 rounded-xl transition-all group cursor-pointer relative snap-start flex flex-col justify-between
                                ${isGenerator 
                                    ? 'bg-[#2EB0D9] shadow-lg shadow-[#2EB0D9]/30 text-white hover:-translate-y-2' 
                                    : `${currentBg} border border-slate-200 text-slate-900 hover:shadow-2xl hover:-translate-y-2 hover:bg-white`
                                }
                            `}
                          >
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 relative transition-colors ${isGenerator ? 'bg-white text-[#2EB0D9]' : 'bg-[#2EB0D9]/10 text-[#2EB0D9]'}`}>
                                        {isGenerator ? <Check size={16} /> : (item.linkTo && item.linkTo.startsWith('form-') ? <FileText size={16}/> : <ArrowLeft size={16} />)}
                                    </div>
                                </div>
                                
                                <h4 className={`text-base font-bold mb-1 leading-tight ${isGenerator ? 'text-white' : 'text-[#2EB0D9]'}`}>{item.title}</h4>
                                <p className={`text-xs line-clamp-2 ${isGenerator ? 'text-white/80' : 'text-slate-500'}`}>{item.description}</p>
                              </div>
                              
                              <span className={`text-xs font-medium flex items-center gap-1 mt-auto ${isGenerator ? 'text-white underline' : 'text-[#2EB0D9]'}`}>
                                  {isGenerator ? 'התחל עכשיו' : (item.linkTo && item.linkTo.startsWith('form-') ? 'למילוי הטופס' : 'קרא עוד')} <ArrowLeft size={12}/>
                              </span>
                          </div>
                      );
                  })}
              </div>
           </div>
        </Reveal>

        {/* DYNAMIC CONTENT SECTION (ARTICLES / FORMS) */}
        <section className="py-16 min-h-[600px] relative z-10">
           <div className="container mx-auto px-4">
              
              {/* --- DYNAMIC FORM RENDERER --- */}
              {currentDynamicForm && (
                  <div ref={dynamicFormRef} className="mb-16 bg-slate-50 rounded-2xl p-8 md:p-12 shadow-lg border-t-4 border-[#2EB0D9] animate-fade-in-up">
                       <div className="max-w-2xl mx-auto">
                           <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">{currentDynamicForm.title}</h3>
                                    <p className="text-slate-500">נא למלא את כל השדות הנדרשים</p>
                                </div>
                                <button onClick={() => setActiveDynamicFormId(null)} className="text-slate-400 hover:text-slate-600"><X/></button>
                           </div>

                           <div className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                               {currentDynamicForm.fields.map(field => (
                                   <div key={field.id} className="space-y-2">
                                       <div className="flex items-center gap-2">
                                           <label className="block text-sm font-bold text-slate-700">
                                               {field.label} {field.required && <span className="text-red-500">*</span>}
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
                                             className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition" 
                                             value={dynamicFormValues[field.id] || ''}
                                             onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}
                                           />
                                       )}
                                       
                                       {field.type === 'boolean' && (
                                           <div className="flex gap-4">
                                               <label className="flex items-center gap-2 cursor-pointer">
                                                   <input 
                                                     type="radio" 
                                                     name={field.id} 
                                                     checked={dynamicFormValues[field.id] === true}
                                                     onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: true})}
                                                   /> כן
                                               </label>
                                               <label className="flex items-center gap-2 cursor-pointer">
                                                   <input 
                                                     type="radio" 
                                                     name={field.id} 
                                                     checked={dynamicFormValues[field.id] === false}
                                                     onChange={() => setDynamicFormValues({...dynamicFormValues, [field.id]: false})}
                                                   /> לא
                                               </label>
                                           </div>
                                       )}

                                       {field.type === 'select' && (
                                           <select 
                                              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#2EB0D9] outline-none transition bg-white"
                                              value={dynamicFormValues[field.id] || ''}
                                              onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}
                                           >
                                               <option value="">בחר...</option>
                                               {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                           </select>
                                       )}

                                       {field.type === 'repeater' && (
                                           <div className="bg-slate-50 p-4 rounded-lg border">
                                               <div className="space-y-2 mb-2">
                                                   {(dynamicFormValues[field.id] || []).map((val: string, i: number) => (
                                                       <div key={i} className="flex gap-2">
                                                           <input 
                                                             className="flex-1 p-2 border rounded text-sm" 
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
                                               }}>+ הוסף שורה</Button>
                                           </div>
                                       )}
                                   </div>
                               ))}

                               <Button className="w-full mt-4" variant="secondary" onClick={() => {
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
                  <div className="flex items-center justify-between mb-8">
                     <SectionTitle title="מאמרים נבחרים" />
                     <div className="flex gap-2">
                         <button onClick={() => scrollContainer(articlesScrollRef, 'right')} className="p-2 border rounded-full hover:bg-slate-100 text-slate-400"><ChevronRight size={20}/></button>
                         <button onClick={() => scrollContainer(articlesScrollRef, 'left')} className="p-2 border rounded-full hover:bg-slate-100 text-slate-400"><ChevronLeft size={20}/></button>
                     </div>
                  </div>

                  <div 
                     ref={articlesScrollRef}
                     className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x"
                  >
                     {currentArticles.map(article => (
                        <div 
                            key={article.id} 
                            className="flex-shrink-0 w-[280px] md:w-[calc(25%-12px)] h-[220px] snap-start"
                        >
                            <ArticleCard 
                                article={article} 
                                onClick={() => setSelectedArticle(article)}
                            />
                        </div>
                     ))}
                     {currentArticles.length === 0 && (
                         <div className="w-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                             אין מאמרים להצגה בקטגוריה זו.
                         </div>
                     )}
                  </div>
              </Reveal>
           </div>
        </section>

        {/* CONTACT FOOTER - FIXED ALIGNMENT */}
        <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 relative z-10">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 items-start text-right" dir="rtl">
                
                {/* Brand Column (Rightmost) */}
                <div className="col-span-1 flex flex-col items-start">
                    <h2 className="text-xl font-black text-white mb-6 font-serif leading-tight">
                       <span className="text-[#2EB0D9]">MOR ERAN KAGAN</span><br/>& CO
                    </h2>
                    <p className="mb-4 text-sm leading-relaxed max-w-xs">משרד עורכי דין מוביל המעניק ליווי משפטי מקיף, מקצועי ואישי בכל תחומי המשפט האזרחי והמסחרי.</p>
                    <div className="flex gap-4 mt-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] cursor-pointer transition-colors hover:scale-110 transform">f</div>
                       <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] cursor-pointer transition-colors hover:scale-110 transform">in</div>
                       {onAdminClick && (
                          <button 
                            onClick={onAdminClick}
                            className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] cursor-pointer transition-colors text-slate-400 hover:text-white"
                            title="ניהול אתר"
                          >
                             <Settings size={20} />
                          </button>
                       )}
                    </div>
                </div>
                
                {/* Navigation Column */}
                <div className="col-span-1 flex flex-col items-start">
                    <h4 className="text-white font-bold mb-4 text-lg border-r-4 border-[#2EB0D9] pr-3">ניווט מהיר</h4>
                    <ul className="space-y-2 w-full">
                        <li><button onClick={() => onCategoryChange(Category.WILLS)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">צוואות וירושות</button></li>
                        <li><button onClick={() => onCategoryChange(Category.REAL_ESTATE)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">מקרקעין ונדל"ן</button></li>
                        <li><button onClick={() => onCategoryChange(Category.POA)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">ייפוי כוח מתמשך</button></li>
                        <li><button onClick={() => onCategoryChange(Category.STORE)} className="hover:text-[#2EB0D9] transition-colors block w-full text-right hover:translate-x-1 transform duration-200">חנות משפטית</button></li>
                    </ul>
                </div>
                
                {/* Contact Column - Fixed Alignment */}
                <div className="col-span-1 flex flex-col items-start">
                    <h4 className="text-white font-bold mb-4 text-lg border-r-4 border-[#2EB0D9] pr-3">פרטי התקשרות</h4>
                    <ul className="space-y-4 w-full">
                        <li className="flex items-start gap-3">
                            <MapPin size={20} className="text-[#2EB0D9] mt-1 flex-shrink-0"/> 
                            <span className="leading-snug">{state.config.address}</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Phone size={20} className="text-[#2EB0D9] flex-shrink-0"/> 
                            <span className="leading-snug" dir="ltr">{state.config.phone}</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Mail size={20} className="text-[#2EB0D9] flex-shrink-0"/> 
                            <span className="leading-snug font-sans">{state.config.contactEmail}</span>
                        </li>
                    </ul>
                    {/* Waze Button Aligned Under Contact Info */}
                    <a 
                       href={`https://waze.com/ul?q=${encodeURIComponent(state.config.address)}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 bg-[#2EB0D9] hover:bg-[#259cc0] text-white px-4 py-2.5 rounded-lg font-bold transition-colors mt-6 hover:shadow-lg transform hover:-translate-y-1 w-full justify-center"
                    >
                        <Navigation size={18} /> נווט למשרד
                    </a>
                </div>
                
                {/* Map Column (Leftmost) */}
                <div className="col-span-1">
                     {/* Map container same height as content roughly */}
                    <div className="w-full h-56 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-inner group">
                        <iframe 
                            title="Office Location"
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            style={{ border: 0, opacity: 0.8 }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(state.config.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            allowFullScreen
                            className="group-hover:opacity-100 transition-opacity duration-500"
                        ></iframe>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-4 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
                &copy; {new Date().getFullYear()} MOR ERAN KAGAN & CO. כל הזכויות שמורות.
            </div>
        </footer>
      </main>

      <FloatingWidgets />
    </div>
  );
};