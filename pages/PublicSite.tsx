
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Article, Category, FormDefinition, TeamMember, TimelineItem, CATEGORY_LABELS } from '../types.ts';
import { Button } from '../components/Button.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { FloatingWidgets } from '../components/FloatingWidgets.tsx';
import { ShareMenu } from '../components/ShareMenu.tsx';
import { emailService } from '../services/api.ts'; 
import { X, Phone, MapPin, Mail, Menu, ClipboardList, Newspaper, HelpCircle, Loader2, Calculator, ChevronDown, UserPlus, Users, CreditCard, CheckCircle2, Settings } from 'lucide-react';

interface PublicSiteProps {
  state: AppState;
  onCategoryChange: (cat: Category) => void;
  onWillsFormSubmit: (data: any) => void;
  onAdminClick: () => void;
  dataVersion: string;
}

// Fix: Define SectionTitle helper component which was missing.
const SectionTitle: React.FC<{ title: string; isDark: boolean }> = ({ title, isDark }) => (
  <div className="flex items-center gap-4 mb-12">
    <div className="h-px flex-1 bg-[#2EB0D9]/20" />
    <h2 className={`text-3xl md:text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
    <div className="h-px w-12 bg-[#2EB0D9]" />
  </div>
);

const ArticleOverlay: React.FC<{ article: Article, onClose: () => void, theme: any, isDark: boolean }> = ({ article, onClose, theme, isDark }) => {
    const [activeTab, setActiveTab] = useState(0);
    if (!article) return null;
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" dir="rtl">
            <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${theme.border} ${theme.cardBg}`}>
                <div className="sticky top-0 z-10 p-4 flex justify-between items-center bg-slate-900 border-b border-white/10">
                    <ShareMenu variant="inline" title={article.title} />
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X/></button>
                </div>
                <div className="p-8 md:p-12">
                    <h2 className={`text-3xl font-black mb-6 ${theme.textTitle}`}>{article.title}</h2>
                    {article.tabs && article.tabs.length > 0 && (
                        <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
                            {article.tabs.map((tab, idx) => (
                                <button key={idx} onClick={() => setActiveTab(idx)} className={`pb-4 px-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === idx ? 'text-[#2EB0D9] border-b-2 border-[#2EB0D9]' : 'text-slate-500'}`}>
                                    {tab.title}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className={`prose prose-invert max-w-none text-right leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {(article.tabs?.[activeTab]?.content || article.abstract || '').split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
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

  // Fix: Directly destructure from state to avoid "Property does not exist on type '{}'" errors.
  const { 
    currentCategory = Category.HOME, 
    config = { officeName: 'MeLaw', theme: 'dark' } as any, 
    slides = [], 
    timelines = [], 
    articles = [], 
    menuItems = [], 
    forms = [], 
    teamMembers = [] 
  } = state;
  
  const isDark = config.theme === 'dark';
  const theme = {
      bgMain: isDark ? 'bg-slate-950' : 'bg-slate-50',
      textMain: isDark ? 'text-slate-200' : 'text-slate-800',
      headerBg: isDark ? 'bg-slate-950/80' : 'bg-white/80',
      cardBg: isDark ? 'bg-slate-900/90' : 'bg-white/90',
      inputBg: isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900',
      textTitle: isDark ? 'text-white' : 'text-slate-900',
      border: isDark ? 'border-slate-800' : 'border-slate-200',
  };

  const activeForm = forms.find(f => f.id === activeDynamicFormId);

  // Fix: Added handleTimelineClick function which was missing.
  const handleTimelineClick = (item: TimelineItem) => {
    if (item.linkTo && item.linkTo.startsWith('form-')) {
        const formId = item.linkTo.replace('form-', '');
        setActiveDynamicFormId(formId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (item.linkTo) {
        window.open(item.linkTo, '_blank');
    }
  };

  const handleSendForm = async () => {
    if (!activeForm) return;
    setIsSubmitting(true);
    const processedData: any = {};
    (activeForm.fields || []).forEach(f => {
        const val = dynamicFormValues[f.id];
        if (f.type === 'boolean') processedData[f.label] = val ? "כן" : "לא";
        else if (f.type === 'children_list') {
            const count = dynamicFormValues[`${f.id}_count`] || 0;
            let kids = [];
            for(let i=0; i<count; i++) kids.push(`${dynamicFormValues[`${f.id}_kid_${i}_first`] || ''} (תז ${dynamicFormValues[`${f.id}_kid_${i}_id`] || ''})`);
            processedData[f.label] = kids.join(', ');
        }
        else processedData[f.label] = val || "לא מולא";
    });

    try {
        await emailService.sendForm(activeForm.title, processedData, config.integrations as any, activeForm.pdfTemplate || 'NONE', activeForm.sendClientEmail || false, activeForm.submitEmail || config.contactEmail);
        alert("הטופס נשלח בהצלחה!");
        setActiveDynamicFormId(null);
        setFormPreviewMode(false);
    } catch { alert("שגיאה בשליחה."); } finally { setIsSubmitting(false); }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-[#2EB0D9] ${theme.bgMain} ${theme.textMain}`} dir="rtl">
      {/* Navbar */}
      <header className={`fixed top-0 inset-x-0 h-20 z-[100] border-b backdrop-blur-md ${theme.headerBg} ${theme.border}`}>
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div onClick={() => onCategoryChange(Category.HOME)} className="cursor-pointer">
            <h1 className="text-2xl font-black text-[#2EB0D9]" style={{fontFamily: "'MyLogoFont', serif"}}>{config.officeName}</h1>
          </div>
          <nav className="hidden md:flex gap-8">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => onCategoryChange(item.cat)} className={`font-bold text-sm hover:text-[#2EB0D9] transition-colors ${currentCategory === item.cat ? 'text-[#2EB0D9]' : 'text-slate-500'}`}>{item.label}</button>
            ))}
          </nav>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu/></button>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Slider Section */}
        {slides.length > 0 && currentCategory === Category.HOME && (
          <section className="relative h-[50vh] bg-black overflow-hidden">
            {slides.map((slide, idx) => (
              <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${idx === activeSlide ? 'opacity-100' : 'opacity-0'}`}>
                <img src={slide.imageUrl} className="w-full h-full object-cover opacity-50 animate-ken-burns" />
                <div className="absolute inset-0 flex items-center px-12 md:px-24">
                  <div className="max-w-3xl text-right">
                    <h2 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-2xl">{slide.title}</h2>
                    <p className="text-xl md:text-2xl text-white/90 border-r-4 border-[#2EB0D9] pr-6">{slide.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Dynamic Forms / Services */}
        {activeForm && (
          <section className="py-20 container mx-auto px-6 animate-fade-in-up">
            <div className={`max-w-3xl mx-auto rounded-3xl shadow-2xl p-8 md:p-12 border-t-8 border-[#2EB0D9] ${theme.cardBg}`}>
              {!formPreviewMode ? (
                <>
                  <div className="flex justify-between items-center mb-10">
                    <h3 className={`text-3xl font-black ${theme.textTitle}`}>{activeForm.title}</h3>
                    <button onClick={() => setActiveDynamicFormId(null)} className="p-2 hover:bg-black/10 rounded-full"><X/></button>
                  </div>
                  <div className="space-y-8">
                    {(activeForm.fields || []).map(field => (
                      <div key={field.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <label className="block text-sm font-bold opacity-80">{field.label}</label>
                          {field.helpArticleId && (
                            <button onClick={() => setSelectedArticle(articles.find(a=>a.id===field.helpArticleId!) || null)} className="text-[#2EB0D9] hover:scale-125 transition-transform"><HelpCircle size={16}/></button>
                          )}
                        </div>
                        {field.type === 'children_list' && (
                          <div className="p-6 bg-black/5 rounded-2xl space-y-4 border border-slate-700/10">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">מספר ילדים לעדכון בטופס:</span>
                                <input type="number" min="0" className={`w-20 p-2 rounded-lg text-center ${theme.inputBg}`} value={dynamicFormValues[`${field.id}_count`] || 0} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_count`]: parseInt(e.target.value)||0})} />
                            </div>
                            {Array.from({length: dynamicFormValues[`${field.id}_count`] || 0}).map((_, i) => (
                                <div key={i} className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-dashed border-slate-500/30">
                                    <input placeholder="שם הילד" className={`p-2 rounded-lg text-xs ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_kid_${i}_first`]: e.target.value})} />
                                    <input placeholder="ת.ז." className={`p-2 rounded-lg text-xs ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [`${field.id}_kid_${i}_id`]: e.target.value})} />
                                </div>
                            ))}
                          </div>
                        )}
                        {field.type === 'boolean' && (
                          <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                            <span className="text-sm">אנא אשר/י:</span>
                            <button onClick={() => setDynamicFormValues({...dynamicFormValues, [field.id]: !dynamicFormValues[field.id]})} className={`relative w-14 h-8 rounded-full transition-all flex items-center px-1 ${dynamicFormValues[field.id] ? 'bg-[#2EB0D9]' : 'bg-slate-700'}`}>
                              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${dynamicFormValues[field.id] ? 'translate-x-0' : '-translate-x-6'}`} />
                            </button>
                          </div>
                        )}
                        {['text', 'email', 'phone', 'number', 'long_text'].includes(field.type) && (
                          field.type === 'long_text' ? <textarea className={`w-full p-4 rounded-xl border ${theme.inputBg} h-32`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} /> :
                          <input type={field.type} className={`w-full p-4 rounded-xl border ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})} />
                        )}
                        {field.type === 'select' && (
                          <select className={`w-full p-4 rounded-xl border ${theme.inputBg}`} onChange={e => setDynamicFormValues({...dynamicFormValues, [field.id]: e.target.value})}>
                            <option value="">בחר...</option>
                            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                      </div>
                    ))}
                    <Button className="w-full h-16 text-xl font-black mt-6" variant="secondary" onClick={() => setFormPreviewMode(true)}>המשך לתצוגה מקדימה</Button>
                  </div>
                </>
              ) : (
                <div className="animate-fade-in">
                  <h3 className="text-3xl font-black mb-8 text-[#2EB0D9] flex items-center gap-3"><CheckCircle2/> תצוגה מקדימה של הנתונים</h3>
                  <div className="bg-black/5 p-6 rounded-2xl space-y-4 border border-slate-700/20 mb-10">
                     {(activeForm.fields || []).map(f => (
                         <div key={f.id} className="flex justify-between border-b border-slate-700/10 pb-2">
                            <span className="font-bold opacity-60 text-sm">{f.label}:</span>
                            <span className="text-sm">{dynamicFormValues[f.id] === true ? 'כן' : dynamicFormValues[f.id] === false ? 'לא' : dynamicFormValues[f.id] || '---'}</span>
                         </div>
                     ))}
                  </div>
                  <div className="space-y-4">
                    <Button className="w-full h-16 text-xl font-black gap-2" variant="secondary" onClick={handleSendForm} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <><Mail/> אשר ושמור נתונים</>}
                    </Button>
                    {/* Payment Button Underneath */}
                    <a href={config.integrations?.stripeWillsLink || '#'} target="_blank" className="block w-full h-16 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center gap-3 text-white font-black transition-all border border-slate-700">
                        <CreditCard className="text-[#2EB0D9]"/> מעבר לתשלום מאובטח
                    </a>
                    <button onClick={() => setFormPreviewMode(false)} className="w-full text-sm opacity-50 hover:opacity-100 transition-opacity underline">חזרה לעריכה</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Home Content Sections */}
        {currentCategory === Category.HOME && (
          <>
            <section className="py-20 container mx-auto px-6">
              <SectionTitle title="עדכונים ושירותים דיגיטליים" isDark={isDark} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {timelines.slice(0, 4).map(item => (
                  <div key={item.id} onClick={() => handleTimelineClick(item)} className={`p-8 rounded-3xl shadow-xl cursor-pointer hover:-translate-y-2 transition-all ${theme.cardBg}`}>
                    <div className="p-3 bg-[#2EB0D9]/10 text-[#2EB0D9] rounded-xl w-fit mb-6"><ClipboardList/></div>
                    <h4 className="text-xl font-black mb-3">{item.title}</h4>
                    <p className="text-xs opacity-70 line-clamp-3">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="py-20 bg-black/10">
              <div className="container mx-auto px-6 text-right">
                <SectionTitle title="מאמרים ומדריכים משפטיים" isDark={isDark} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {articles.slice(0, 6).map(art => <ArticleCard key={art.id} article={art} onClick={() => setSelectedArticle(art)} />)}
                </div>
              </div>
            </section>
          </>
        )}

        <footer className={`py-20 bg-black border-t ${theme.border} text-center`}>
           <img src={config.logoUrl} className="h-10 mx-auto mb-8 opacity-60" />
           <p className="text-xs opacity-40 uppercase tracking-widest">© {new Date().getFullYear()} {config.officeName}. כל הזכויות שמורות.</p>
           <button onClick={onAdminClick} className="mt-8 text-[10px] text-slate-800 hover:text-[#2EB0D9] flex items-center gap-2 mx-auto"><Settings size={12}/> פאנל ניהול</button>
        </footer>
      </main>

      {selectedArticle && <ArticleOverlay article={selectedArticle} onClose={() => setSelectedArticle(null)} theme={theme} isDark={isDark} />}
      <FloatingWidgets dataVersion={dataVersion} />
    </div>
  );
};
