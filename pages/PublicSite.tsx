import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, WillsFormData, FormDefinition } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { Search, Phone, MapPin, Mail, Menu, X, Check, ArrowLeft, ArrowRight, Navigation, FileText, Quote, Lock, Settings } from 'lucide-react';

interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: WillsFormData) => void;
  onAdminClick?: () => void;
}

export const PublicSite: React.FC<PublicSiteProps> = ({ state, onCategoryChange, onWillsFormSubmit, onAdminClick }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0);
  
  // Modal State
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Dynamic Form State
  const [activeDynamicFormId, setActiveDynamicFormId] = useState<string | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  
  // Refs for scrolling
  const willsFormRef = useRef<HTMLDivElement>(null);
  const dynamicFormRef = useRef<HTMLDivElement>(null);

  // Filter content based on current category
  const currentSlides = state.slides.filter(s => s.category === state.currentCategory || s.category === Category.HOME);
  const currentArticles = state.articles.filter(a => a.category === state.currentCategory || state.currentCategory === Category.HOME);
  const currentTimelines = state.timelines.filter(t => t.category.includes(state.currentCategory) || state.currentCategory === Category.HOME);

  // Slider Auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % currentSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSlides.length]);

  const handleTimelineClick = (item: any) => {
    if (item.linkTo === 'wills-generator') {
        onCategoryChange(Category.WILLS);
        // Slight timeout to allow render
        setTimeout(() => {
            willsFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else if (item.linkTo && item.linkTo.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        setDynamicFormValues({});
        setTimeout(() => {
            dynamicFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } else {
        // Standard link or just info
        console.log("Clicked timeline item", item.title);
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
  
  // Helper to find dynamic form
  const currentDynamicForm = state.forms.find(f => f.id === activeDynamicFormId);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      
      {/* --- Article Modal Overlay --- */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                onClick={() => setSelectedArticle(null)}
            ></div>
            
            {/* Modal Content */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row">
                <button 
                    onClick={() => setSelectedArticle(null)}
                    className="absolute top-4 left-4 z-20 p-2 bg-white/80 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X size={24} className="text-slate-800" />
                </button>

                {/* Left Side: Image & Meta */}
                <div className="md:w-1/3 h-64 md:h-auto relative bg-slate-100">
                    <img 
                        src={selectedArticle.imageUrl} 
                        alt={selectedArticle.title} 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end p-6 md:hidden">
                        <h2 className="text-2xl font-bold text-white">{selectedArticle.title}</h2>
                    </div>
                </div>

                {/* Right Side: Content */}
                <div className="md:w-2/3 p-6 md:p-10 bg-white">
                     <span className="hidden md:inline-block px-3 py-1 bg-[#2EB0D9]/10 text-[#2EB0D9] text-xs font-bold rounded-full mb-4">
                        {selectedArticle.category}
                     </span>
                     <h2 className="text-3xl font-black text-slate-900 mb-6 hidden md:block leading-tight">
                        {selectedArticle.title}
                     </h2>
                     
                     {selectedArticle.quote && (
                         <div className="bg-slate-50 p-6 rounded-xl border-r-4 border-[#2EB0D9] mb-8">
                             <Quote className="text-[#2EB0D9] mb-2" size={24} />
                             <p className="text-lg italic font-serif text-slate-700">"{selectedArticle.quote}"</p>
                         </div>
                     )}

                     <div className="space-y-8">
                         {selectedArticle.tabs.map((tab, idx) => (
                             <div key={idx} className="border-b border-slate-100 pb-6 last:border-0">
                                 <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                                     <FileText size={20} className="text-[#2EB0D9]" />
                                     {tab.title}
                                 </h3>
                                 <p className="text-slate-600 leading-relaxed text-lg">
                                     {tab.content}
                                 </p>
                             </div>
                         ))}
                     </div>

                     <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
                         <Button onClick={() => setSelectedArticle(null)}>סגור מאמר</Button>
                     </div>
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
           <div className="md:hidden absolute top-20 left-0 w-full bg-white shadow-xl border-t border-slate-100 p-4 flex flex-col gap-4">
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
      <main className="flex-1 pt-20">
        
        {/* HERO SECTION */}
        <section className="relative h-[45vh] md:h-[55vh] overflow-hidden bg-slate-900 group">
          
          {/* Floating Logo (Left Side, Centered) - RECTANGULAR for Wide Logo */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2 z-30 hidden lg:block opacity-90 hover:opacity-100 transition-opacity">
             <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 border border-slate-100 max-w-sm">
                 <img src={state.config.logoUrl} alt="Logo" className="h-20 w-auto object-contain" />
             </div>
          </div>

          {currentSlides.map((slide, index) => (
             <div 
               key={slide.id}
               className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
             >
                <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-transparent flex items-center">
                    <div className="container mx-auto px-6 md:px-12">
                        <div className="max-w-2xl text-white space-y-4 animate-fade-in-up">
                            <span className="inline-block px-3 py-1 bg-[#2EB0D9] text-xs font-bold uppercase tracking-wider rounded-full mb-2">
                                {slide.category === Category.HOME ? 'המשרד המוביל בישראל' : 'התמחות מקצועית'}
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black leading-tight">{slide.title}</h2>
                            <p className="text-lg text-slate-200 md:w-2/3 border-r-4 border-[#2EB0D9] pr-4 line-clamp-2">{slide.subtitle}</p>
                            <div className="pt-4">
                                <Button variant="secondary" size="md">קבע פגישת ייעוץ</Button>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          ))}
          
          {/* Slider Dots */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
            {currentSlides.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${idx === activeSlide ? 'bg-[#2EB0D9] w-8' : 'bg-white/50 hover:bg-white'}`}
                />
            ))}
          </div>
        </section>

        {/* TIMELINE CAROUSEL */}
        <section className="py-12 bg-slate-50 overflow-hidden relative border-b border-slate-200">
           <div className="container mx-auto px-4 mb-6 flex justify-between items-end">
              <h3 className="text-xl font-bold text-slate-800 border-r-4 border-slate-900 pr-3">
                 {state.currentCategory === Category.HOME ? 'חדשות ועדכונים' : 'מדריכים ומידע מקצועי'}
              </h3>
              <div className="flex gap-2">
                   <button onClick={() => setTimelineIndex(Math.max(0, timelineIndex - 1))} className="p-2 rounded-full border border-slate-300 hover:bg-white"><ArrowRight size={16}/></button>
                   <button onClick={() => setTimelineIndex(Math.min(currentTimelines.length - 1, timelineIndex + 1))} className="p-2 rounded-full border border-slate-300 hover:bg-white"><ArrowLeft size={16}/></button>
              </div>
           </div>
           
           <div className="relative container mx-auto px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
                  {currentTimelines.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleTimelineClick(item)}
                        className={`
                            min-w-[280px] md:min-w-[320px] p-5 rounded-xl shadow-sm border transition-all group cursor-pointer relative top-0 hover:-top-2
                            ${item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-')) ? 'bg-[#2EB0D9] border-[#2EB0D9] text-white' : 'bg-white border-slate-100 hover:shadow-xl'}
                        `}
                      >
                          {item.linkTo !== 'wills-generator' && (!item.linkTo || !item.linkTo.startsWith('form-')) && (
                             <div className="absolute top-0 right-8 w-1 h-full bg-slate-100 group-hover:bg-[#2EB0D9]/10 transition-colors -z-10"></div>
                          )}
                          
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-3 z-10 relative transition-colors ${item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-')) ? 'bg-white text-[#2EB0D9]' : 'bg-slate-900 text-white group-hover:bg-[#2EB0D9]'}`}>
                             {item.linkTo === 'wills-generator' ? <Check size={20} /> : (item.linkTo && item.linkTo.startsWith('form-') ? <FileText size={20}/> : <ArrowLeft size={18} />)}
                          </div>
                          
                          <h4 className={`text-base font-bold mb-2 ${item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-')) ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
                          <p className={`text-sm mb-3 line-clamp-3 ${item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-')) ? 'text-white/80' : 'text-slate-500'}`}>{item.description}</p>
                          
                          <span className={`text-sm font-medium flex items-center gap-1 ${item.linkTo === 'wills-generator' || (item.linkTo && item.linkTo.startsWith('form-')) ? 'text-white underline' : 'text-[#2EB0D9]'}`}>
                              {item.linkTo === 'wills-generator' ? 'התחל עכשיו' : (item.linkTo && item.linkTo.startsWith('form-') ? 'למילוי הטופס' : 'קרא עוד')} <ArrowLeft size={14}/>
                          </span>
                      </div>
                  ))}
              </div>
           </div>
        </section>

        {/* DYNAMIC CONTENT SECTION (ARTICLES / FORMS) */}
        <section className="py-16 bg-white min-h-[600px]">
           <div className="container mx-auto px-4">
              
              {/* --- DYNAMIC FORM RENDERER --- */}
              {currentDynamicForm && (
                  <div ref={dynamicFormRef} className="mb-16 bg-slate-50 rounded-2xl p-8 md:p-12 shadow-lg border-t-4 border-[#2EB0D9]">
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
                                       <label className="block text-sm font-bold text-slate-700">
                                           {field.label} {field.required && <span className="text-red-500">*</span>}
                                       </label>
                                       
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

              {/* If on Wills page and no dynamic form active, show Standard Wills Form Teaser */}
              {state.currentCategory === Category.WILLS && !activeDynamicFormId && (
                 <div ref={willsFormRef} id="wills-generator" className="mb-16 bg-slate-900 text-white rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#2EB0D9] rounded-full blur-[100px] opacity-20"></div>
                    <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                       <div>
                          <h3 className="text-3xl font-bold mb-4">מחולל הצוואות הדיגיטלי</h3>
                          <p className="text-slate-300 mb-8 text-lg">ערוך צוואה חוקית ומקצועית ב-5 דקות באמצעות האלגוריתם המשפטי החכם שלנו.</p>
                          
                          {/* SIMPLE FORM WIZARD */}
                          <div className="bg-white text-slate-900 p-6 rounded-xl shadow-lg">
                             {formStep === 0 && (
                                <div className="space-y-4">
                                   <h4 className="font-bold text-lg border-b pb-2">שלב 1: פרטים אישיים</h4>
                                   <input type="text" placeholder="שם מלא" className="w-full p-3 border rounded-lg bg-slate-50" value={willsData.fullName} onChange={e => setWillsData({...willsData, fullName: e.target.value})} />
                                   <input type="text" placeholder="שם בן/בת הזוג" className="w-full p-3 border rounded-lg bg-slate-50" value={willsData.spouseName} onChange={e => setWillsData({...willsData, spouseName: e.target.value})} />
                                   <Button onClick={() => setFormStep(1)} className="w-full mt-4">המשך לשלב הבא</Button>
                                </div>
                             )}
                             {formStep === 1 && (
                                <div className="space-y-4">
                                   <h4 className="font-bold text-lg border-b pb-2">שלב 2: הילדים</h4>
                                   <div className="flex items-center gap-4">
                                      <label>מספר ילדים:</label>
                                      <input type="number" min="0" max="10" className="w-20 p-2 border rounded" value={willsData.childrenCount} onChange={e => handleChildrenCountChange(parseInt(e.target.value))} />
                                   </div>
                                   <div className="space-y-2 max-h-40 overflow-y-auto">
                                      {willsData.childrenNames.map((name, idx) => (
                                          <input key={idx} placeholder={`שם הילד/ה ${idx+1}`} className="w-full p-2 border rounded text-sm" value={name} onChange={e => {
                                              const newNames = [...willsData.childrenNames];
                                              newNames[idx] = e.target.value;
                                              setWillsData({...willsData, childrenNames: newNames});
                                          }}/>
                                      ))}
                                   </div>
                                   <div className="flex gap-2">
                                     <Button variant="outline" onClick={() => setFormStep(0)} className="flex-1">חזור</Button>
                                     <Button onClick={() => setFormStep(2)} className="flex-1">המשך</Button>
                                   </div>
                                </div>
                             )}
                             {formStep === 2 && (
                                <div className="space-y-4 text-center">
                                   <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                      <Check size={32} />
                                   </div>
                                   <h4 className="font-bold text-lg">כמעט סיימנו!</h4>
                                   <p className="text-sm text-slate-500">הזן דוא"ל לקבלת הטיוטה הראשונית</p>
                                   <input type="email" placeholder="your@email.com" className="w-full p-3 border rounded-lg" value={willsData.contactEmail} onChange={e => setWillsData({...willsData, contactEmail: e.target.value})}/>
                                   <Button onClick={() => { onWillsFormSubmit(willsData); alert("טופס נשלח בהצלחה! מסמך PDF ישלח למייל שלך."); setFormStep(0); }} variant="secondary" className="w-full">צור צוואה ושלח למייל</Button>
                                </div>
                             )}
                          </div>
                       </div>
                       <div className="hidden md:block">
                           <img src="https://picsum.photos/600/600?grayscale" alt="Family" className="rounded-xl shadow-lg rotate-2 hover:rotate-0 transition-transform duration-500 border-4 border-white/10" />
                       </div>
                    </div>
                 </div>
              )}

              {/* Articles Grid */}
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-3xl font-bold text-slate-800">מאמרים נבחרים</h3>
                 <div className="flex gap-2">
                     <button className="p-2 border rounded-full hover:bg-slate-100 text-slate-400"><ArrowRight size={20}/></button>
                     <button className="p-2 border rounded-full hover:bg-slate-100 text-slate-400"><ArrowLeft size={20}/></button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {currentArticles.map(article => (
                    <div key={article.id} className="h-[450px]">
                        <ArticleCard 
                            article={article} 
                            onClick={() => setSelectedArticle(article)}
                        />
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* CONTACT FOOTER */}
        <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
            <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8 mb-12">
                <div>
                    <h2 className="text-xl font-black text-white mb-6 font-serif">
                       <span className="text-[#2EB0D9]">MOR ERAN KAGAN</span><br/>& CO
                    </h2>
                    <p className="mb-4">משרד עורכי דין מוביל המעניק ליווי משפטי מקיף, מקצועי ואישי.</p>
                    <div className="flex gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] cursor-pointer transition-colors">f</div>
                       <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-[#2EB0D9] cursor-pointer transition-colors">in</div>
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
                <div>
                    <h4 className="text-white font-bold mb-4 text-lg">ניווט מהיר</h4>
                    <ul className="space-y-2">
                        <li><button onClick={() => onCategoryChange(Category.WILLS)} className="hover:text-[#2EB0D9]">צוואות וירושות</button></li>
                        <li><button onClick={() => onCategoryChange(Category.REAL_ESTATE)} className="hover:text-[#2EB0D9]">מקרקעין ונדל"ן</button></li>
                        <li><button onClick={() => onCategoryChange(Category.POA)} className="hover:text-[#2EB0D9]">ייפוי כוח מתמשך</button></li>
                        <li><button onClick={() => onCategoryChange(Category.STORE)} className="hover:text-[#2EB0D9]">חנות משפטית</button></li>
                    </ul>
                </div>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-white font-bold mb-4 text-lg">פרטי התקשרות</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3"><MapPin size={18} className="text-[#2EB0D9]"/> {state.config.address}</li>
                            <li className="flex items-center gap-3"><Phone size={18} className="text-[#2EB0D9]"/> {state.config.phone}</li>
                            <li className="flex items-center gap-3"><Mail size={18} className="text-[#2EB0D9]"/> {state.config.contactEmail}</li>
                        </ul>
                    </div>
                    
                    {/* Navigation Button */}
                    <a 
                       href={`https://waze.com/ul?q=${encodeURIComponent(state.config.address)}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 bg-[#2EB0D9] hover:bg-[#259cc0] text-white px-4 py-2 rounded-lg font-bold transition-colors w-full justify-center"
                    >
                        <Navigation size={18} /> נווט למשרד עם Waze
                    </a>
                </div>
                <div>
                    {/* Embedded Map */}
                    <div className="w-full h-48 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                        <iframe 
                            title="Office Location"
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            style={{ border: 0, opacity: 0.8 }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(state.config.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            </div>
            
            <div className="container mx-auto px-4 pt-8 border-t border-slate-800 text-center text-sm">
                &copy; {new Date().getFullYear()} MOR ERAN KAGAN & CO. כל הזכויות שמורות.
            </div>
        </footer>
      </main>

      <FloatingWidgets />
    </div>
  );
};