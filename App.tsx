
import React, { useState, useEffect } from 'react';
import { PublicSite } from './pages/PublicSite.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { AppState, Category, WillsFormData, FormDefinition, TeamMember, Article, SliderSlide, TimelineItem, MenuItem, Product } from './types.ts';
import { cloudService } from './services/api.ts';
import { dbService } from './services/supabase.ts';
import { Loader2, CheckCircle2 } from 'lucide-react';

// --- VERSION CONTROL ---
const APP_VERSION = 'v2.12';

// ============================================================================
// הגדרות חיבור ציבוריות - הוטמעו בקוד כפי שהתבקש
// ============================================================================
const PUBLIC_SUPABASE_URL: string = 'https://kqjmwwjafypkswkkbncc.supabase.co'; 
const PUBLIC_SUPABASE_KEY: string = 'sb_publishable_ftgAGUontmVJ-BfgzfQJsA_n7npD__t';
// ============================================================================

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
  },
  {
      id: '3',
      categories: [Category.WILLS, Category.POA],
      title: 'יפוי כוח מתמשך - למה זה חשוב?',
      abstract: 'הכלי המשפטי שמאפשר לכם לקבוע מי יטפל בענייניכם אם חלילה לא תוכלו לעשות זאת בעצמכם.',
      imageUrl: 'https://picsum.photos/id/1016/800/600',
      tabs: [
          { title: 'ניתוח משפטי', content: 'מסמך משפטי המאפשר לאדם בגיר למנות מיופה כוח שיהיה מוסמך לקבל החלטות בעניינו אם יאבד את כשירותו.' },
          { title: 'סיפור מקרה', content: 'אדם שלקה בשבץ ולא מינה מיופה כוח, משפחתו נאלצה לעבור הליך יקר וממושך למינוי אפוטרופוס בבית משפט.' },
          { title: 'המלצות', content: '• ערכו ייפוי כוח כעת\n• בחרו מיופה כוח שאתם סומכים עליו' }
      ],
      order: 3
  },
  {
      id: '4',
      categories: [Category.REAL_ESTATE],
      title: 'הסכם ממון - לא רק לעשירים',
      abstract: 'כיצד הסכם ממון יכול למנוע סכסוכים ולהגן על נכסים שנצברו לפני הנישואין.',
      imageUrl: 'https://picsum.photos/id/1005/800/600',
      tabs: [
          { title: 'ניתוח משפטי', content: 'מומלץ לערוך הסכם לפני הנישואין או המעבר למגורים משותפים, אך ניתן גם לאחר מכן.' },
          { title: 'סיפור מקרה', content: 'בני זוג שנפרדו לאחר שנתיים נקלעו למאבק על דירה שהייתה שייכת לאישה לפני הנישואין.' },
          { title: 'המלצות', content: '• ערכו הסכם לפני החתונה\n• אשרו אותו בבית משפט או נוטריון' }
      ],
      order: 4
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
    },
    { 
        id: '1', 
        title: 'עדכון פסיקה: ירושה', 
        description: 'בית המשפט העליון קבע הלכה חדשה בנוגע לפרשנות צוואות שנערכו בכתב יד.', 
        imageUrl: 'https://picsum.photos/id/106/400/300', 
        category: [Category.HOME, Category.WILLS], 
        order: 2,
        tabs: [
            { title: "תמצית הפסיקה", content: "בית המשפט העליון קבע כי כאשר כוונת המצווה ברורה, יש להעדיף קיום צוואה גם אם נפלו בה פגמים צורניים קלים." },
            { title: "משמעות מעשית", content: "החלטה זו מחזקת את עקרון 'מצווה לקיים דברי המת' ומפחיתה את המשקל של טענות פרוצדורליות בהתנגדויות לצוואה." }
        ]
    },
    { 
        id: '2', 
        title: 'המדריך לייפוי כוח', 
        description: 'כל מה שצריך לדעת לפני שממנים מיופה כוח מתמשך.', 
        imageUrl: 'https://picsum.photos/id/109/400/300', 
        category: [Category.HOME, Category.POA], 
        order: 3,
        tabs: [
            { title: "מהו יפוי כוח?", content: "כלי משפטי המאפשר לאדם לתכנן את עתידו ולקבוע מי יקבל החלטות עבורו." },
            { title: "מתי נכנס לתוקף?", content: "רק כאשר האדם אינו מסוגל עוד להבין בדבר ולקבל החלטות בעצמו, לפי חוות דעת רפואית." }
        ]
    },
    { 
        id: '3', 
        title: 'מיסוי דירות מגורים', 
        description: 'האם כדאי להעביר דירה במתנה לילדים? שיקולי מס שבח ומס רכישה.', 
        imageUrl: 'https://picsum.photos/id/123/400/300', 
        category: [Category.HOME, Category.REAL_ESTATE], 
        order: 4,
        tabs: [
            { title: "מס רכישה", content: "העברה לקרוב משפחה חייבת ב-1/3 ממס הרכישה הרגיל." },
            { title: "מס שבח", content: "יש לשים לב לתקופת הצינון הנדרשת לפני שהמקבל יוכל למכור את הדירה בפטור ממס." }
        ]
    },
];

const initialSlides: SliderSlide[] = [
    { id: 'store-promo', imageUrl: 'https://picsum.photos/id/449/1920/1080', title: 'החנות המשפטית', subtitle: 'חוזים, מסמכים ומוצרים משפטיים להורדה מיידית', category: Category.HOME, order: 0, buttonText: 'למעבר לחנות' },
    { id: '1', imageUrl: 'https://picsum.photos/id/196/1920/1080', title: 'מצוינות משפטית ללא פשרות', subtitle: 'ליווי אישי ומקצועי ברגעים החשובים של החיים', category: Category.HOME, order: 1 },
    { id: '2', imageUrl: 'https://picsum.photos/id/452/1920/1080', title: 'צוואות וירושות', subtitle: 'דואגים לעתיד היקרים לכם ברגישות ובמקצועיות', category: Category.WILLS, order: 3 },
    { id: '3', imageUrl: 'https://picsum.photos/id/1076/1920/1080', title: 'עסקאות נדל"ן ומקרקעין', subtitle: 'ליווי צמוד בעסקאות מכר ורכישה', category: Category.REAL_ESTATE, order: 4 },
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

const initialProducts: Product[] = [
    { id: 'prod_1', title: 'צוואה הדדית', price: 1500, categories: [Category.WILLS, Category.STORE], paymentLink: '', imageUrl: '', description: 'עריכת צוואה הדדית לבני זוג כולל ייעוץ', order: 1 },
    { id: 'prod_2', title: 'בדיקת חוזה דירה', price: 2500, categories: [Category.REAL_ESTATE, Category.STORE], paymentLink: '', imageUrl: '', description: 'בדיקת חוזה רכישה מקבלן או יד שניה', order: 2 },
    { id: 'prod_3', title: 'ייפוי כוח מתמשך', price: 3800, categories: [Category.POA, Category.STORE], paymentLink: '', imageUrl: '', description: 'עריכה והפקדה של ייפוי כוח מתמשך', order: 3 },
    { id: 'prod_4', title: 'הסכם מייסדים', price: 1200, categories: [Category.STORE], paymentLink: '', imageUrl: '', description: 'הסכם משפטי סטנדרטי ליזמים', order: 4 },
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
        bio: 'בעלת ותק של 15 שנה בתחום דיני המשפחה והירושה. מתמחה בפתרון סכסוכים מורכבים וגישור. בוגרת הפקולטה למשפטים באוניברסיטת תל אביב בהצטיינות.',
        order: 1
    },
    {
        id: '2',
        fullName: 'עו"ד ערן לוי',
        role: 'שותף - מחלקת נדל"ן',
        specialization: 'מקרקעין, תמ"א 38 וקבוצות רכישה',
        email: 'eran@melaw.co.il',
        phone: '050-2222222',
        imageUrl: 'https://picsum.photos/id/237/400/400',
        bio: 'מומחה במיסוי מקרקעין וליווי יזמים בפרויקטים רחבי היקף. חבר בוועדת המקרקעין של לשכת עורכי הדין.',
        order: 2
    },
    {
        id: '3',
        fullName: 'עו"ד דנה כהן',
        role: 'ראש תחום ייפוי כוח',
        specialization: 'ייפוי כוח מתמשך ואפוטרופסות',
        email: 'dana@melaw.co.il',
        phone: '050-3333333',
        imageUrl: 'https://picsum.photos/id/64/400/400',
        bio: 'מוסמכת מטעם האפוטרופוס הכללי לעריכת ייפוי כוח מתמשך. בעלת גישה רגישה ואנושית ללקוחות בגיל השלישי.',
        order: 3
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
    teamMembers: initialTeamMembers,
    products: initialProducts,
    lastUpdated: 'Initial', 
};

// UPDATED: Stable Key for persistence across updates
const STORAGE_KEY = 'melaw_site_data_stable';

const App: React.FC = () => {
  const [loadingCloud, setLoadingCloud] = useState(false);

  // Initialize State from LocalStorage with Migration Logic
  const [appState, setAppState] = useState<AppState>(() => {
    // 1. Try stable key
    let saved = localStorage.getItem(STORAGE_KEY);
    
    // 2. Migration: If no stable data, try previous version keys to rescue user data
    if (!saved) saved = localStorage.getItem('melaw_site_data_v1.6');
    if (!saved) saved = localStorage.getItem('melaw_site_data_v1.5');
    if (!saved) saved = localStorage.getItem('melaw_site_data_v1.4');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // --- DATA MIGRATION LOGIC (For Existing Users) ---
        
        // SECURITY FIX: FORCE REMOVAL OF LEAKED KEY FROM LOCAL STORAGE
        const knownLeakedKey = 'AIzaSyBQkmjb1vw20e90bCMBK0eWC9pA6e05Le0';
        if (parsed.config?.integrations?.geminiApiKey === knownLeakedKey) {
            console.warn("Removing leaked API key from local storage");
            if (parsed.config.integrations) {
                parsed.config.integrations.geminiApiKey = '';
            }
        }

        if (parsed.articles && parsed.articles.length > 0) {
            parsed.articles = parsed.articles.map((art: any) => {
                if (!art.categories && art.category) {
                    return { ...art, categories: [art.category] };
                }
                return art;
            });
        }
        
        // Migrate Timeline Items to have tabs if missing
        if (parsed.timelines) {
            parsed.timelines = parsed.timelines.map((t: any) => {
                if (!t.tabs) {
                    // Create default tab from description if tabs are missing
                    return { 
                        ...t, 
                        tabs: t.description ? [{ title: "מידע כללי", content: t.description }] : [] 
                    };
                }
                return t;
            });
        }

        // Migrate Forms Category -> Categories[]
        if (parsed.forms && parsed.forms.length > 0) {
            parsed.forms = parsed.forms.map((f: any) => {
                if (!f.categories && f.category) {
                    return { ...f, categories: [f.category] };
                }
                return f;
            });
        }

        // Migrate Products Category -> Categories[]
        if (parsed.products && parsed.products.length > 0) {
            parsed.products = parsed.products.map((p: any) => {
                if (!p.categories && p.category) {
                    return { ...p, categories: [p.category] };
                }
                return p;
            });
        } else {
            parsed.products = initialProducts;
        }

        // --- PUBLIC KEYS INJECTION (Fix for public users having empty keys) ---
        const currentSupabaseUrl = parsed.config?.integrations?.supabaseUrl;
        const currentSupabaseKey = parsed.config?.integrations?.supabaseKey;
        const hasHardcodedKeys = PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_URL !== 'הדבק_כאן_את_ה_URL_שלך' && PUBLIC_SUPABASE_KEY && PUBLIC_SUPABASE_KEY !== 'הדבק_כאן_את_ה_KEY_שלך';
        const shouldUseHardcoded = (!currentSupabaseUrl || !currentSupabaseKey) && hasHardcodedKeys;

        return {
           ...defaultState,
           ...parsed,
           config: { 
               ...defaultState.config, 
               ...parsed.config, 
               passwordHint: parsed.config?.passwordHint || 'admin',
               defaultCategory: parsed.config?.defaultCategory || Category.STORE,
               integrations: { 
                   ...defaultState.config.integrations, 
                   ...parsed.config?.integrations,
                   // Force inject hardcoded keys if missing in storage or if overridden by code
                   supabaseUrl: shouldUseHardcoded ? PUBLIC_SUPABASE_URL : (parsed.config?.integrations?.supabaseUrl || PUBLIC_SUPABASE_URL),
                   supabaseKey: shouldUseHardcoded ? PUBLIC_SUPABASE_KEY : (parsed.config?.integrations?.supabaseKey || PUBLIC_SUPABASE_KEY),
               } 
           },
           isAdminLoggedIn: false, 
           // USE CONFIG DEFAULT IF AVAILABLE
           currentCategory: parsed.config?.defaultCategory || parsed.currentCategory || Category.STORE 
        };
      } catch (e) {
        console.error("Failed to load saved state", e);
        return defaultState;
      }
    }
    // If no saved state, use default
    return defaultState;
  });

  const [isAdminView, setIsAdminView] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Persist State to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  // --- SUPABASE SYNC ON STARTUP ---
  useEffect(() => {
    const initSupabase = async () => {
        // Priority 1: Check if Supabase keys exist in the current state (either from storage or hardcoded)
        const { supabaseUrl, supabaseKey } = appState.config.integrations;
        
        // Validation to ensure we don't try to connect with placeholder text
        const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http');
        const isValidKey = supabaseKey && supabaseKey.length > 20;

        if (isValidUrl && isValidKey) {
            setLoadingCloud(true);
            const dbData = await dbService.loadState(supabaseUrl, supabaseKey);
            if (dbData) {
                console.log("Synced from Supabase successfully!");
                // No more Toast here
                
                setAppState(prev => ({
                    ...prev,
                    ...dbData,
                    // Preserve session
                    isAdminLoggedIn: prev.isAdminLoggedIn,
                    // Respect user navigation unless it's initial load, but for simplicity keep current
                    currentCategory: prev.currentCategory,
                    // IMPORTANT: Preserve API keys if they were somehow missing in cloud but present locally/hardcoded
                    config: {
                        ...prev.config,
                        ...dbData.config,
                        passwordHint: dbData.config?.passwordHint || prev.config.passwordHint || 'admin',
                        defaultCategory: dbData.config?.defaultCategory || prev.config.defaultCategory || Category.STORE,
                        integrations: {
                            ...prev.config.integrations,
                            ...(dbData.config?.integrations || {}),
                            // Ensure we don't lose the keys if the DB version has them empty
                            supabaseUrl: dbData.config?.integrations?.supabaseUrl || prev.config.integrations.supabaseUrl,
                            supabaseKey: dbData.config?.integrations?.supabaseKey || prev.config.integrations.supabaseKey,
                        }
                    }
                }));
            }
            setLoadingCloud(false);
            return;
        }

        // Priority 2: Legacy Cloud Sync (Google Sheets)
        const url = appState.config.integrations.googleSheetsUrl;
        if (url && url.includes('script.google.com')) {
            setLoadingCloud(true);
            const cloudData = await cloudService.loadStateFromCloud(url);
            if (cloudData) {
                console.log("Synced from Google Sheets successfully");
                
                setAppState(prev => ({
                    ...prev,
                    ...cloudData,
                    isAdminLoggedIn: prev.isAdminLoggedIn,
                     config: {
                        ...prev.config,
                        ...cloudData.config,
                        integrations: {
                            ...prev.config.integrations,
                            ...(cloudData.config?.integrations || {})
                        }
                    }
                }));
            }
            setLoadingCloud(false);
        }
    };

    initSupabase();
  }, []); // Run once on mount

  // --- Dynamic Font Injection (Client Side) ---
  useEffect(() => {
      const fontData = appState.config.customFontData;
      const styleId = 'dynamic-font-style';
      let styleTag = document.getElementById(styleId);

      if (fontData) {
          if (!styleTag) {
              styleTag = document.createElement('style');
              styleTag.id = styleId;
              document.head.appendChild(styleTag);
          }
          styleTag.innerHTML = `
            @font-face {
              font-family: 'MyLogoFont';
              src: url('${fontData}') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: block;
            }
          `;
      } else if (styleTag) {
          styleTag.remove();
      }
  }, [appState.config.customFontData]);

  const handleUpdateState = (newState: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...newState }));
  };

  const handleWillsSubmit = (data: WillsFormData) => {
    console.log("Sending Wills Data to:", appState.config.willsEmail, data);
  };

  // --- Admin Login Modal ---
  if (!appState.isAdminLoggedIn && isAdminView) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4" dir="rtl">
            <div className="bg-slate-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-800 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-center text-white">כניסה למערכת ניהול</h2>
                <input 
                    type="email" 
                    placeholder="אימייל מנהל (לא נבדק)" 
                    className="w-full p-3 border border-slate-700 rounded mb-4 bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9] outline-none" 
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                />
                <input 
                    type="password" 
                    placeholder={`רמז: ${appState.config.passwordHint || 'admin'}`} 
                    className="w-full p-3 border border-slate-700 rounded mb-6 bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9] outline-none" 
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                />
                <button 
                    onClick={() => {
                        // Check against the password in config
                        if (loginPass === appState.config.adminPassword) {
                            handleUpdateState({ isAdminLoggedIn: true });
                        } else {
                            alert(`סיסמא שגויה. (רמז: ${appState.config.passwordHint || 'admin'})`);
                        }
                    }}
                    className="w-full bg-[#2EB0D9] text-white py-3 rounded font-bold hover:bg-[#259cc0] transition shadow-lg shadow-[#2EB0D9]/20"
                >
                    התחבר
                </button>
                <button onClick={() => setIsAdminView(false)} className="w-full mt-4 text-slate-500 hover:text-white text-sm transition-colors">חזרה לאתר</button>
            </div>
        </div>
      );
  }

  // --- Main Render ---
  return (
    <div className="relative">
      {/* Cloud Loading Indicator */}
      {loadingCloud && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-[#2EB0D9]/20 overflow-hidden flex items-center justify-center">
             <div className="h-full bg-[#2EB0D9] animate-shine w-full absolute"></div>
             <span className="relative z-10 text-[10px] text-black font-bold px-2">טוען עדכונים מהשרת...</span>
          </div>
      )}

      {/* Secret Admin Trigger (Top Left Corner) */}
      {!isAdminView && !appState.isAdminLoggedIn && (
         <div 
           className="fixed top-0 left-0 w-4 h-4 z-[100] cursor-help opacity-0 hover:opacity-100 bg-red-500/20"
           onClick={() => setIsAdminView(true)}
           title="Admin Login"
         ></div>
      )}

      {appState.isAdminLoggedIn && isAdminView ? (
         <AdminDashboard 
            state={appState} 
            updateState={handleUpdateState} 
            onLogout={() => { handleUpdateState({ isAdminLoggedIn: false }); setIsAdminView(false); }}
            version={APP_VERSION}
         />
      ) : (
         <PublicSite 
            state={appState} 
            onCategoryChange={(cat) => handleUpdateState({ currentCategory: cat })}
            onWillsFormSubmit={handleWillsSubmit}
            onAdminClick={() => setIsAdminView(true)}
            version={APP_VERSION}
            dataVersion={appState.lastUpdated}
         />
      )}
    </div>
  );
};

export default App;
