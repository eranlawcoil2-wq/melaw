
import React, { useState, useEffect } from 'react';
import { PublicSite } from './pages/PublicSite.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { AppState, Category, WillsFormData, FormDefinition, TeamMember, Article, SliderSlide, TimelineItem, MenuItem, Product, CalculatorDefinition } from './types.ts';
import { cloudService } from './services/api.ts';
import { dbService } from './services/supabase.ts';
import { Loader2, CheckCircle2 } from 'lucide-react';

const PUBLIC_SUPABASE_URL: string = 'https://kqjmwwjafypkswkkbncc.supabase.co'; 
const PUBLIC_SUPABASE_KEY: string = 'sb_publishable_ftgAGUontmVJ-BfgzfQJsA_n7npD__t';

const BUILD_TIMESTAMP = new Date().toLocaleString('he-IL') + " (V4.6 - Boolean Fields Fix)";

// --- INITIAL DEFAULT DATA ---
const initialArticles: Article[] = [
  {
    id: '1',
    categories: [Category.WILLS, Category.HOME],
    title: 'החשיבות של עריכת צוואה הדדית',
    abstract: 'צוואה הדדית מאפשרת לבני זוג להוריש את רכושם זה לזו, אך יש לה השלכות משפטיות שחשוב להכיר לפני החתימה.',
    imageUrl: 'https://picsum.photos/id/1015/800/600',
    quote: 'הצוואה היא המצפן של רצונך האחרון',
    tabs: [
        { title: 'ניתוח משפטי', content: 'סעיף 8א לחוק הירושה קובע את הכללים לגבי צוואות הדדיות.' },
        { title: 'המלצות', content: '• לערוך צוואה הדדית בכתב\n• להפקיד אצל רשם הירושות' }
    ],
    order: 1
  }
];

const initialTimelines: TimelineItem[] = [
    { 
        id: 'gen-wills', 
        title: 'מחולל הצוואות הדיגיטלי', 
        description: 'ערכו צוואה תקפה משפטית ב-5 דקות ללא עלות ראשונית.', 
        imageUrl: 'https://picsum.photos/id/452/400/300', 
        category: [Category.HOME, Category.WILLS], 
        linkTo: 'form-wills-generator', 
        order: 1,
        tabs: []
    }
];

const initialSlides: SliderSlide[] = [
    { id: '1', imageUrl: 'https://picsum.photos/id/196/1920/1080', title: 'מצוינות משפטית ללא פשרות', subtitle: 'ליווי אישי ומקצועי ברגעים החשובים של החיים', categories: [Category.HOME], order: 1 }
];

const initialMenuItems: MenuItem[] = [
    { id: '1', label: 'המשרד', cat: Category.HOME },
    { id: '2', label: 'צוואות וירושות', cat: Category.WILLS },
    { id: '3', label: 'מקרקעין', cat: Category.REAL_ESTATE },
    { id: '4', label: 'ייפוי כוח מתמשך', cat: Category.POA },
    { id: '5', label: 'צור קשר', cat: Category.CONTACT },
];

const defaultState: AppState = {
    currentCategory: Category.HOME,
    isAdminLoggedIn: false,
    config: {
        officeName: 'MeLaw Digital Office',
        logoUrl: 'https://placehold.co/600x120/transparent/2EB0D9?text=MeLaw+Digital', 
        contactEmail: 'office@melaw.co.il',
        willsEmail: 'wills@melaw.co.il',
        poaEmail: 'poa@melaw.co.il',
        phone: '03-1234567',
        address: 'תל אביב, ישראל',
        theme: 'dark', 
        adminPassword: 'admin',
        passwordHint: 'admin', 
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
    forms: [],
    calculators: [],
    teamMembers: [],
    products: [],
    lastUpdated: BUILD_TIMESTAMP, 
};

const STORAGE_KEY = 'melaw_site_data_v4.6';

const App: React.FC = () => {
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [appState, setAppState] = useState<AppState>(defaultState);
  const [isAdminView, setIsAdminView] = useState(false);
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => {
    const loadData = async () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        let workingState = defaultState;
        if (saved) {
            try {
                workingState = { ...defaultState, ...JSON.parse(saved) };
            } catch (e) {
                console.error("Local load failed");
            }
        }
        setAppState(workingState);

        const { supabaseUrl, supabaseKey } = workingState.config.integrations;
        if (supabaseUrl?.startsWith('http') && supabaseKey) {
            setLoadingCloud(true);
            try {
                const dbData = await dbService.loadState(supabaseUrl, supabaseKey);
                if (dbData) {
                    setAppState(prev => ({
                        ...prev,
                        ...dbData,
                        // Force arrays to exist to prevent "black screen" errors
                        articles: dbData.articles || [],
                        forms: dbData.forms || [],
                        slides: dbData.slides || [],
                        timelines: dbData.timelines || [],
                        teamMembers: dbData.teamMembers || [],
                        menuItems: dbData.menuItems || initialMenuItems,
                        lastUpdated: BUILD_TIMESTAMP
                    }));
                }
            } catch (e) {
                console.error("Cloud Sync Error", e);
            } finally {
                setLoadingCloud(false);
            }
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  const handleUpdateState = (newState: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...newState }));
  };

  if (!appState.isAdminLoggedIn && isAdminView) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4" dir="rtl">
            <div className="bg-slate-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-800">
                <h2 className="text-2xl font-bold mb-6 text-center text-white">מערכת ניהול</h2>
                <input type="password" placeholder={`סיסמא (רמז: ${appState.config.passwordHint || 'admin'})`} className="w-full p-3 border border-slate-700 rounded mb-6 bg-slate-800 text-white" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                <button onClick={() => { if (loginPass === appState.config.adminPassword) handleUpdateState({ isAdminLoggedIn: true }); else alert("סיסמא שגויה"); }} className="w-full bg-[#2EB0D9] text-white py-3 rounded font-bold hover:bg-[#259cc0]">התחבר</button>
                <button onClick={() => setIsAdminView(false)} className="w-full mt-4 text-slate-500 hover:text-white text-sm">חזרה לאתר</button>
            </div>
        </div>
      );
  }

  return (
    <div className="relative min-h-screen bg-slate-950">
      {loadingCloud && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-[#2EB0D9]/20 overflow-hidden">
             <div className="h-full bg-[#2EB0D9] animate-pulse w-full"></div>
          </div>
      )}

      {appState.isAdminLoggedIn && isAdminView ? (
         <AdminDashboard state={appState} updateState={handleUpdateState} onLogout={() => { handleUpdateState({ isAdminLoggedIn: false }); setIsAdminView(false); }} />
      ) : (
         <PublicSite state={appState} onCategoryChange={(cat) => handleUpdateState({ currentCategory: cat })} onWillsFormSubmit={(d) => console.log(d)} onAdminClick={() => setIsAdminView(true)} dataVersion={appState.lastUpdated} />
      )}
    </div>
  );
};

export default App;
