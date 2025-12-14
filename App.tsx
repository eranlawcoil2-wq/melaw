
import React, { useState, useEffect } from 'react';
import { PublicSite } from './pages/PublicSite.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { AppState, Category, WillsFormData, FormDefinition, TeamMember, Article, SliderSlide, TimelineItem, MenuItem, Product, CalculatorDefinition } from './types.ts';
import { cloudService } from './services/api.ts';
import { dbService } from './services/supabase.ts';
import { Loader2, CheckCircle2 } from 'lucide-react';

// ============================================================================
// הגדרות חיבור ציבוריות
// ============================================================================
const PUBLIC_SUPABASE_URL: string = 'https://kqjmwwjafypkswkkbncc.supabase.co'; 
const PUBLIC_SUPABASE_KEY: string = 'sb_publishable_ftgAGUontmVJ-BfgzfQJsA_n7npD__t';
// ============================================================================

// Timestamp generated at build/save time
const BUILD_TIMESTAMP = new Date().toLocaleString('he-IL') + " (גרסה V4.2 - סליידרים משודרגים)";

// --- INITIAL DEFAULT DATA (Fallback) ---
const initialArticles: Article[] = [
  {
    id: '1',
    categories: [Category.WILLS],
    title: 'החשיבות של עריכת צוואה הדדית',
    abstract: 'צוואה הדדית מאפשרת לבני זוג להוריש את רכושם זה לזו, אך יש לה השלכות משפטיות שחשוב להכיר לפני החתימה.',
    imageUrl: 'https://picsum.photos/id/1015/800/600',
    quote: 'הצוואה היא המצפן של רצונך האחרון',
    tabs: [
        { title: 'ניתוח משפטי', content: 'סעיף 8א לחוק הירושה קובע את הכללים לגבי צוואות הדדיות. החידוש העיקרי הוא ההגבלה על יכולת הביטול החד-צדדית של הצוואה לאחר מות אחד מבני הזוג. החוק נועד לאזן בין רצון המצווה לבין הסתמכות בן הזוג.' },
        { title: 'סיפור מקרה', content: 'מקרה שהיה: בני זוג שלא ערכו הסכם ונאלצו להתמודד עם התנגדויות ירושה קשות מצד ילדים מנישואים קודמים.' },
        { title: 'המלצות', content: '• לערוך צוואה הדדית בכתב\n• להפקיד אצל רשם הירושות\n• להתייעץ עם עו"ד מומחה' }
    ],
    order: 1
  },
  {
    id: '2',
    categories: [Category.REAL_ESTATE],
    title: 'מיסוי מקרקעין: מדריך לרוכש דירה ראשונה',
    abstract: 'רכישת דירה היא העסקה הגדולה בחייו של אדם. הבנת היבטי המיסוי יכולה לחסוך עשרות אלפי שקלים.',
    imageUrl: 'https://picsum.photos/id/1031/800/600',
    tabs: [
        { title: 'ניתוח משפטי', content: 'דירה יחידה עד סכום מסוים פטורה ממס רכישה. מעל הסכום, ישנן מדרגות מס מדורגות המתעדכנות מדי שנה על ידי רשות המיסים.' },
        { title: 'סיפור מקרה', content: 'לקוח שרכש דירה ולא ידע על זכאותו לפטור, שילם מס מיותר של 40,000 ש"ח עד שהגיע לייעוץ.' },
        { title: 'המלצות', content: '• בדקו זכאות לפטור\n• השתמשו בסימולטור רשות המיסים' }
    ],
    order: 2
  }
];

const initialTimelines: TimelineItem[] = [
    { 
        id: 'gen-wills', 
        title: 'מחולל הצוואות הדיגיטלי', 
        description: 'ערכו צוואה תקפה משפטית ב-5 דקות ללא עלות ראשונית.', 
        imageUrl: 'https://picsum.photos/id/452/400/300', 
        category: [Category.HOME, Category.WILLS], 
        linkTo: 'wills-generator', 
        order: 1,
        tabs: []
    }
];

const initialSlides: SliderSlide[] = [
    { id: 'store-promo', imageUrl: 'https://picsum.photos/id/449/1920/1080', title: 'החנות המשפטית', subtitle: 'חוזים, מסמכים ומוצרים משפטיים להורדה מיידית', categories: [Category.HOME], order: 0, buttonText: 'למעבר לחנות' },
    { id: '1', imageUrl: 'https://picsum.photos/id/196/1920/1080', title: 'מצוינות משפטית ללא פשרות', subtitle: 'ליווי אישי ומקצועי ברגעים החשובים של החיים', categories: [Category.HOME, Category.WILLS, Category.REAL_ESTATE, Category.POA], order: 1 }
];

const initialMenuItems: MenuItem[] = [
    { id: '1', label: 'המשרד', cat: Category.HOME },
    { id: '2', label: 'צוואות וירושות', cat: Category.WILLS },
    { id: '3', label: 'מקרקעין', cat: Category.REAL_ESTATE },
    { id: '4', label: 'ייפוי כוח מתמשך', cat: Category.POA },
    { id: '5', label: 'חנות משפטית', cat: Category.STORE },
    { id: '6', label: 'צור קשר', cat: Category.CONTACT },
];

const initialForms: FormDefinition[] = [
    {
        id: 'poa-standard',
        title: 'שאלון ייפוי כוח מתמשך',
        categories: [Category.POA], 
        submitEmail: 'poa@melaw.co.il',
        fields: [
            { id: 'f1', type: 'text', label: 'שם מלא', required: true },
            { id: 'f2', type: 'text', label: 'תעודת זהות', required: true },
            { id: 'f3', type: 'boolean', label: 'האם קיים ייפוי כוח קודם?', required: false },
            { id: 'f4', type: 'select', label: 'סוג מינוי מבוקש', options: ['רכוש', 'גוף', 'שניהם'], required: true }
        ],
        pdfTemplate: 'POA',
        order: 1
    }
];

// --- INITIAL CALCULATORS (Israeli Tax Data) ---
const initialCalculators: CalculatorDefinition[] = [
    {
        id: 'tax-calc-2024',
        title: 'מחשבון מס רכישה (2024)',
        categories: [Category.REAL_ESTATE, Category.HOME],
        scenarios: [
            {
                id: 'sc1',
                title: 'דירה יחידה (תושב ישראל)',
                brackets: [
                    { id: 'b1', threshold: 1978745, rate: 0 },
                    { id: 'b2', threshold: 2347080, rate: 3.5 },
                    { id: 'b3', threshold: 6055070, rate: 5 },
                    { id: 'b4', threshold: 20183565, rate: 8 },
                    { id: 'b5', threshold: 99999999999, rate: 10 }
                ]
            },
            {
                id: 'sc2',
                title: 'דירה נוספת (משקיע)',
                brackets: [
                    { id: 'b1', threshold: 6055070, rate: 8 },
                    { id: 'b2', threshold: 99999999999, rate: 10 }
                ]
            }
        ],
        order: 1
    }
];

const initialProducts: Product[] = [
    { id: 'prod_1', title: 'צוואה הדדית', price: 1500, categories: [Category.WILLS, Category.STORE], paymentLink: '', imageUrl: '', description: 'עריכת צוואה הדדית לבני זוג כולל ייעוץ', order: 1 }
];

const initialTeamMembers: TeamMember[] = [
    {
        id: '1',
        fullName: 'עו"ד מור כגן',
        role: 'מייסדת ושותפה בכירה',
        specialization: 'צוואות, ירושות וניהול הון משפחתי',
        email: 'mor@melaw.co.il',
        phone: '050-1111111',
        imageUrl: 'https://picsum.photos/id/338/400/400',
        bio: 'בעלת ותק של 15 שנה בתחום דיני המשפחה והירושה.',
        order: 1
    }
];

const defaultState: AppState = {
    currentCategory: Category.STORE,
    isAdminLoggedIn: false,
    config: {
        officeName: 'MOR ERAN KAGAN & CO',
        logoUrl: 'https://placehold.co/600x120/transparent/2EB0D9?text=MOR+ERAN+KAGAN+%26+CO&font=playfair-display', 
        contactEmail: 'office@melaw.co.il',
        willsEmail: 'wills@melaw.co.il',
        poaEmail: 'poa@melaw.co.il',
        phone: '03-1234567',
        address: 'דרך מנחם בגין 144, תל אביב',
        theme: 'dark', 
        adminPassword: 'admin',
        passwordHint: 'admin', 
        defaultCategory: Category.STORE,
        integrations: {
            supabaseUrl: PUBLIC_SUPABASE_URL, 
            supabaseKey: PUBLIC_SUPABASE_KEY,
            geminiApiKey: '', 
            unsplashAccessKey: '',
            googleSheetsUrl: '',
            emailJsServiceId: '',
            emailJsTemplateId: '',
            emailJsPublicKey: '',
            stripeWillsLink: '',
            stripeRealEstateLink: '',
            stripeConsultationLink: ''
        }
    },
    slides: initialSlides,
    timelines: initialTimelines,
    articles: initialArticles,
    menuItems: initialMenuItems,
    forms: initialForms,
    calculators: initialCalculators, // Initialize
    teamMembers: initialTeamMembers,
    products: initialProducts,
    lastUpdated: BUILD_TIMESTAMP, 
};

const STORAGE_KEY = 'melaw_site_data_stable';

const App: React.FC = () => {
  const [loadingCloud, setLoadingCloud] = useState(false);

  // Initialize State from LocalStorage
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Data Migration: Ensure slides have 'categories' array
        if (parsed.slides) {
            parsed.slides = parsed.slides.map((s: any) => {
                if (!s.categories && s.category) {
                    return { ...s, categories: [s.category] };
                }
                return s;
            });
        }

        // Safety check for critical arrays
        if (!parsed.slides) parsed.slides = initialSlides;
        if (!parsed.articles) parsed.articles = initialArticles;
        if (!parsed.calculators) parsed.calculators = initialCalculators; 

        // Force cleanup of leaked keys if present
        const knownLeakedKey = 'AIzaSyBQkmjb1vw20e90bCMBK0eWC9pA6e05Le0';
        if (parsed.config?.integrations?.geminiApiKey === knownLeakedKey) {
            if (parsed.config.integrations) parsed.config.integrations.geminiApiKey = '';
        }

        // Public Keys Injection
        const currentSupabaseUrl = parsed.config?.integrations?.supabaseUrl;
        const currentSupabaseKey = parsed.config?.integrations?.supabaseKey;
        const hasHardcodedKeys = PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_URL !== 'הדבק_כאן_את_ה_URL_שלך';
        const shouldUseHardcoded = (!currentSupabaseUrl || !currentSupabaseKey) && hasHardcodedKeys;

        return {
           ...defaultState,
           ...parsed,
           config: { 
               ...defaultState.config, 
               ...parsed.config, 
               integrations: { 
                   ...defaultState.config.integrations, 
                   ...parsed.config?.integrations,
                   supabaseUrl: shouldUseHardcoded ? PUBLIC_SUPABASE_URL : (parsed.config?.integrations?.supabaseUrl || PUBLIC_SUPABASE_URL),
                   supabaseKey: shouldUseHardcoded ? PUBLIC_SUPABASE_KEY : (parsed.config?.integrations?.supabaseKey || PUBLIC_SUPABASE_KEY),
               } 
           },
           lastUpdated: BUILD_TIMESTAMP 
        };
      } catch (e) {
        console.error("Failed to load saved state", e);
        return defaultState;
      }
    }
    return defaultState;
  });

  const [isAdminView, setIsAdminView] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Persist State
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  // --- SUPABASE SYNC ON STARTUP ---
  useEffect(() => {
    const initSupabase = async () => {
        const { supabaseUrl, supabaseKey } = appState.config.integrations;
        const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http');
        
        if (isValidUrl && supabaseKey) {
            setLoadingCloud(true);
            try {
                const dbData = await dbService.loadState(supabaseUrl, supabaseKey);
                if (dbData) {
                    console.log("Synced from Supabase!");
                    // Handle migration during sync as well
                    if (dbData.slides) {
                        dbData.slides = dbData.slides.map((s: any) => {
                            if (!s.categories && s.category) return { ...s, categories: [s.category] };
                            return s;
                        });
                    }

                    setAppState(prev => ({
                        ...prev,
                        ...dbData,
                        isAdminLoggedIn: prev.isAdminLoggedIn, // Keep current session
                        config: {
                             ...prev.config,
                             ...dbData.config,
                             integrations: {
                                 ...prev.config.integrations,
                                 ...(dbData.config?.integrations || {})
                             }
                        },
                        // Ensure local build timestamp is visible for debugging
                        lastUpdated: BUILD_TIMESTAMP
                    }));
                }
            } catch (e) {
                console.error("Sync failed", e);
            } finally {
                setLoadingCloud(false);
            }
        }
    };
    initSupabase();
  }, []); 

  // --- Dynamic Font Injection ---
  useEffect(() => {
      const fontData = appState.config.customFontData;
      const styleId = 'dynamic-font-style';
      let styleTag = document.getElementById(styleId);

      if (fontData && !styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
          styleTag.innerHTML = `@font-face { font-family: 'MyLogoFont'; src: url('${fontData}') format('truetype'); }`;
      }
  }, [appState.config.customFontData]);

  const handleUpdateState = (newState: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...newState }));
  };

  const handleWillsSubmit = (data: WillsFormData) => {
    console.log("Locally logged will submission:", data);
  };

  // --- Admin Login Modal ---
  if (!appState.isAdminLoggedIn && isAdminView) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4" dir="rtl">
            <div className="bg-slate-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-800 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-center text-white">כניסה למערכת ניהול</h2>
                <input type="password" placeholder={`רמז: ${appState.config.passwordHint || 'admin'}`} className="w-full p-3 border border-slate-700 rounded mb-6 bg-slate-800 text-white" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                <button onClick={() => { if (loginPass === appState.config.adminPassword) handleUpdateState({ isAdminLoggedIn: true }); else alert("סיסמא שגויה"); }} className="w-full bg-[#2EB0D9] text-white py-3 rounded font-bold hover:bg-[#259cc0]">התחבר</button>
                <button onClick={() => setIsAdminView(false)} className="w-full mt-4 text-slate-500 hover:text-white text-sm">חזרה לאתר</button>
            </div>
        </div>
      );
  }

  // --- Main Render ---
  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Non-blocking Cloud Loading Indicator */}
      {loadingCloud && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-[#2EB0D9]/20 overflow-hidden">
             <div className="h-full bg-[#2EB0D9] animate-shine w-full absolute"></div>
          </div>
      )}

      {/* Secret Admin Trigger (Top Left Corner) */}
      {!isAdminView && !appState.isAdminLoggedIn && (
         <div className="fixed top-0 left-0 w-4 h-4 z-[100] cursor-help opacity-0 hover:opacity-100 bg-red-500/20" onClick={() => setIsAdminView(true)}></div>
      )}

      {appState.isAdminLoggedIn && isAdminView ? (
         <AdminDashboard state={appState} updateState={handleUpdateState} onLogout={() => { handleUpdateState({ isAdminLoggedIn: false }); setIsAdminView(false); }} />
      ) : (
         <PublicSite state={appState} onCategoryChange={(cat) => handleUpdateState({ currentCategory: cat })} onWillsFormSubmit={handleWillsSubmit} onAdminClick={() => setIsAdminView(true)} dataVersion={appState.lastUpdated} />
      )}
    </div>
  );
};

export default App;
