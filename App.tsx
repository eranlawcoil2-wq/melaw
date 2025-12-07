import React, { useState } from 'react';
import { PublicSite } from './pages/PublicSite.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { AppState, Category, WillsFormData, FormDefinition, TeamMember } from './types.ts';

// Mock Initial Data
const initialArticles = [
  {
    id: '1',
    category: Category.WILLS,
    title: 'החשיבות של עריכת צוואה הדדית',
    abstract: 'צוואה הדדית מאפשרת לבני זוג להוריש את רכושם זה לזו, אך יש לה השלכות משפטיות שחשוב להכיר לפני החתימה.',
    imageUrl: 'https://picsum.photos/id/1015/800/600',
    quote: 'הצוואה היא המצפן של רצונך האחרון',
    tabs: [
        { title: 'החוק בישראל', content: 'סעיף 8א לחוק הירושה קובע את הכללים לגבי צוואות הדדיות. החידוש העיקרי הוא ההגבלה על יכולת הביטול החד-צדדית של הצוואה לאחר מות אחד מבני הזוג. החוק נועד לאזן בין רצון המצווה לבין הסתמכות בן הזוג.' },
        { title: 'יתרונות', content: 'הבטחת עתידו הכלכלי של בן הזוג הנותר בחיים ומניעת סכסוכים משפחתיים עתידיים על ידי קביעה ברורה של חלוקת הרכוש. זה מעניק שקט נפשי רב לשני הצדדים.' },
        { title: 'סיכונים', content: 'קושי בשינוי הצוואה בעתיד אם הנסיבות משתנות, במיוחד לאחר פטירת אחד מבני הזוג. יש צורך בפרוצדורה מורכבת של ביטול והודעה בכתב.' }
    ]
  },
  {
    id: '2',
    category: Category.REAL_ESTATE,
    title: 'מיסוי מקרקעין: מדריך לרוכש דירה ראשונה',
    abstract: 'רכישת דירה היא העסקה הגדולה בחייו של אדם. הבנת היבטי המיסוי יכולה לחסוך עשרות אלפי שקלים.',
    imageUrl: 'https://picsum.photos/id/1031/800/600',
    tabs: [
        { title: 'מס רכישה', content: 'דירה יחידה עד סכום מסוים פטורה ממס רכישה. מעל הסכום, ישנן מדרגות מס מדורגות המתעדכנות מדי שנה על ידי רשות המיסים.' },
        { title: 'טיפים', content: 'בדקו תמיד זכאות להנחות נוספות (עולה חדש, נכה) לפני הדיווח לרשויות המס. תכנון מס נכון יכול לחסוך הון.' }
    ]
  },
  {
      id: '3',
      category: Category.WILLS,
      title: 'יפוי כוח מתמשך - למה זה חשוב?',
      abstract: 'הכלי המשפטי שמאפשר לכם לקבוע מי יטפל בענייניכם אם חלילה לא תוכלו לעשות זאת בעצמכם.',
      imageUrl: 'https://picsum.photos/id/1016/800/600',
      tabs: [
          { title: 'מה זה?', content: 'מסמך משפטי המאפשר לאדם בגיר למנות מיופה כוח שיהיה מוסמך לקבל החלטות בעניינו אם יאבד את כשירותו.' },
          { title: 'התהליך', content: 'חתימה בפני עורך דין שעבר הכשרה מיוחדת, והפקדת המסמך אצל האפוטרופוס הכללי.' }
      ]
  },
  {
      id: '4',
      category: Category.REAL_ESTATE,
      title: 'הסכם ממון - לא רק לעשירים',
      abstract: 'כיצד הסכם ממון יכול למנוע סכסוכים ולהגן על נכסים שנצברו לפני הנישואין.',
      imageUrl: 'https://picsum.photos/id/1005/800/600',
      tabs: [
          { title: 'מתי עושים?', content: 'מומלץ לערוך הסכם לפני הנישואין או המעבר למגורים משותפים, אך ניתן גם לאחר מכן.' },
          { title: 'אישור', content: 'ההסכם חייב לקבל אישור של בית משפט או נוטריון (לפני הנישואין) כדי שיהיה לו תוקף משפטי מחייב.' }
      ]
  }
];

const initialTimelines = [
    { id: 'gen-wills', title: 'מחולל הצוואות הדיגיטלי', description: 'ערכו צוואה תקפה משפטית ב-5 דקות ללא עלות ראשונית.', imageUrl: 'https://picsum.photos/id/452/400/300', category: [Category.HOME, Category.WILLS], linkTo: 'wills-generator' },
    { id: '1', title: 'עדכון פסיקה: ירושה', description: 'בית המשפט העליון קבע הלכה חדשה בנוגע לפרשנות צוואות שנערכו בכתב יד.', imageUrl: 'https://picsum.photos/id/106/400/300', category: [Category.HOME, Category.WILLS] },
    { id: '2', title: 'המדריך לייפוי כוח', description: 'כל מה שצריך לדעת לפני שממנים מיופה כוח מתמשך.', imageUrl: 'https://picsum.photos/id/109/400/300', category: [Category.HOME, Category.POA] },
    { id: '3', title: 'מיסוי דירות מגורים', description: 'האם כדאי להעביר דירה במתנה לילדים? שיקולי מס שבח ומס רכישה.', imageUrl: 'https://picsum.photos/id/123/400/300', category: [Category.HOME, Category.REAL_ESTATE] },
    { id: '4', title: 'צו קיום צוואה', description: 'כמה זמן לוקח התהליך ומה עושים במקרה של התנגדות?', imageUrl: 'https://picsum.photos/id/133/400/300', category: [Category.WILLS] },
    { id: '5', title: 'התנגדות לצוואה', description: 'באילו מקרים ניתן לפסול צוואה? השפעה בלתי הוגנת ומעורבות בעריכה.', imageUrl: 'https://picsum.photos/id/200/400/300', category: [Category.WILLS] },
];

const initialSlides = [
    { id: '1', imageUrl: 'https://picsum.photos/id/196/1920/1080', title: 'מצוינות משפטית ללא פשרות', subtitle: 'ליווי אישי ומקצועי ברגעים החשובים של החיים', category: Category.HOME },
    { id: '2', imageUrl: 'https://picsum.photos/id/452/1920/1080', title: 'צוואות וירושות', subtitle: 'דואגים לעתיד היקרים לכם ברגישות ובמקצועיות', category: Category.WILLS },
    { id: '3', imageUrl: 'https://picsum.photos/id/1076/1920/1080', title: 'עסקאות נדל"ן ומקרקעין', subtitle: 'ליווי צמוד בעסקאות מכר ורכישה', category: Category.REAL_ESTATE },
];

const initialMenuItems = [
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
        category: Category.POA,
        submitEmail: 'poa@melaw.co.il',
        fields: [
            { id: 'f1', type: 'text', label: 'שם מלא', required: true },
            { id: 'f2', type: 'text', label: 'תעודת זהות', required: true },
            { id: 'f3', type: 'boolean', label: 'האם קיים ייפוי כוח קודם?', required: false },
            { id: 'f4', type: 'select', label: 'סוג מינוי מבוקש', options: ['רכוש', 'גוף', 'שניהם'], required: true }
        ]
    }
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
        bio: 'בעלת ותק של 15 שנה בתחום דיני המשפחה והירושה. מתמחה בפתרון סכסוכים מורכבים וגישור.'
    },
    {
        id: '2',
        fullName: 'עו"ד ערן לוי',
        role: 'שותף - מחלקת נדל"ן',
        specialization: 'מקרקעין, תמ"א 38 וקבוצות רכישה',
        email: 'eran@melaw.co.il',
        phone: '050-2222222',
        imageUrl: 'https://picsum.photos/id/237/400/400',
        bio: 'מומחה במיסוי מקרקעין וליווי יזמים בפרויקטים רחבי היקף. חבר בוועדת המקרקעין של לשכת עורכי הדין.'
    },
    {
        id: '3',
        fullName: 'עו"ד דנה כהן',
        role: 'ראש תחום ייפוי כוח',
        specialization: 'ייפוי כוח מתמשך ואפוטרופסות',
        email: 'dana@melaw.co.il',
        phone: '050-3333333',
        imageUrl: 'https://picsum.photos/id/64/400/400',
        bio: 'מוסמכת מטעם האפוטרופוס הכללי לעריכת ייפוי כוח מתמשך. בעלת גישה רגישה ואנושית ללקוחות בגיל השלישי.'
    },
    {
        id: '4',
        fullName: 'עו"ד רון שחר',
        role: 'עורך דין בכיר - ליטיגציה',
        specialization: 'ליטיגציה מסחרית ואזרחית',
        email: 'ron@melaw.co.il',
        phone: '050-4444444',
        imageUrl: 'https://picsum.photos/id/91/400/400',
        bio: 'מייצג לקוחות בערכאות השונות בתיקים אזרחיים מורכבים. בעל תואר שני במשפטים מאוניברסיטת תל אביב.'
    }
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentCategory: Category.HOME,
    isAdminLoggedIn: false,
    config: {
        officeName: 'MOR ERAN KAGAN & CO',
        // Updated Logo: Cyan color to pop on dark background
        logoUrl: 'https://placehold.co/600x120/transparent/2EB0D9?text=MOR+ERAN+KAGAN+%26+CO&font=playfair-display', 
        contactEmail: 'office@melaw.co.il',
        willsEmail: 'wills@melaw.co.il',
        poaEmail: 'poa@melaw.co.il',
        phone: '03-1234567',
        address: 'דרך מנחם בגין 144, תל אביב',
        theme: 'dark' // DEFAULT THEME
    },
    slides: initialSlides,
    timelines: initialTimelines,
    articles: initialArticles,
    menuItems: initialMenuItems,
    forms: initialForms,
    teamMembers: initialTeamMembers,
  });

  const [isAdminView, setIsAdminView] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const handleUpdateState = (newState: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...newState }));
  };

  const handleWillsSubmit = (data: WillsFormData) => {
    // In a real app, this would send an API request.
    console.log("Sending Wills Data to:", appState.config.willsEmail, data);
    // Simulate generation of XML/Sheet
    const xmlData = `
      <Will>
        <Testator>${data.fullName}</Testator>
        <Spouse>${data.spouseName}</Spouse>
        <Children>${data.childrenNames.join(',')}</Children>
      </Will>
    `;
    console.log("Generated XML:", xmlData);
  };

  // --- Admin Login Modal ---
  if (!appState.isAdminLoggedIn && isAdminView) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4" dir="rtl">
            <div className="bg-slate-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-800 animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6 text-center text-white">כניסה למערכת ניהול</h2>
                <input 
                    type="email" 
                    placeholder="אימייל מנהל" 
                    className="w-full p-3 border border-slate-700 rounded mb-4 bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9] outline-none" 
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                />
                <input 
                    type="password" 
                    placeholder="סיסמא" 
                    className="w-full p-3 border border-slate-700 rounded mb-6 bg-slate-800 text-white focus:ring-2 focus:ring-[#2EB0D9] outline-none" 
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                />
                <button 
                    onClick={() => {
                        if (loginEmail.includes('@') && loginPass.length > 3) {
                            handleUpdateState({ isAdminLoggedIn: true });
                        } else {
                            alert("פרטי התחברות שגויים (דמו: הזן כל מייל וסיסמא)");
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
      {/* Secret Admin Trigger (Top Left Corner) - Kept as backup */}
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
         />
      ) : (
         <PublicSite 
            state={appState} 
            onCategoryChange={(cat) => handleUpdateState({ currentCategory: cat })}
            onWillsFormSubmit={handleWillsSubmit}
            onAdminClick={() => setIsAdminView(true)}
         />
      )}
    </div>
  );
};

export default App;