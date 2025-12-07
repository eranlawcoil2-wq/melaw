import { Article, TeamMember, WillsFormData, FormDefinition, Category } from '../types.ts';

// Helper to safely access env vars in browser environment where process might be undefined
const getEnv = (key: string) => {
  try {
    return (typeof process !== 'undefined' && process.env) ? process.env[key] : '';
  } catch {
    return '';
  }
};

// --- Configuration ---
// בעתיד, כאן נגדיר את המפתחות לשירותים החיצוניים
const API_CONFIG = {
    useMockData: true, // שנה ל-false כשתחבר שרת אמיתי
    emailServiceId: getEnv('EMAILJS_SERVICE_ID'),
    stripePublicKey: getEnv('STRIPE_KEY'),
    supabaseUrl: getEnv('SUPABASE_URL'),
};

// --- Mock Data Service (Database Placeholder) ---
// שירות זה מדמה עבודה מול בסיס נתונים כמו Supabase או Firebase
export const dbService = {
    async getArticles(): Promise<Article[]> {
        if (API_CONFIG.useMockData) {
            // כאן מחזירים את הנתונים הראשוניים (Hardcoded)
            // כשנתחבר לשרת, נחליף את זה ב: await supabase.from('articles').select('*')
            return Promise.resolve([]); // (The App.tsx handles the initial state currently)
        }
        return [];
    },

    async saveArticle(article: Article): Promise<boolean> {
        console.log("Saving to Database:", article);
        return true;
    },

    async uploadImage(file: File): Promise<string> {
        console.log("Uploading image to cloud storage...");
        return URL.createObjectURL(file); // Mock URL
    }
};

// --- Email & Forms Service ---
// שירות זה מטפל בשליחת טפסים (EmailJS / Formspree)
export const emailService = {
    async sendWillsForm(data: WillsFormData): Promise<boolean> {
        console.log("Connecting to Email Provider (e.g., EmailJS)...");
        console.log("Sending Payload:", data);
        
        // סימולציה של שליחה
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
    },

    async sendContactForm(name: string, email: string, message: string): Promise<boolean> {
        console.log(`Sending email from ${email}: ${message}`);
        return true;
    }
};

// --- Store & Payments Service ---
// שירות זה מטפל בסליקה (Stripe / Snipcart)
export const storeService = {
    async createCheckoutSession(productId: string): Promise<string> {
        console.log("Initializing Stripe Checkout for product:", productId);
        // בעתיד: קריאה ל-Stripe API לקבלת URL לתשלום
        return "https://checkout.stripe.com/mock-link"; 
    },

    getProducts() {
        return [
            { id: 'prod_1', title: 'חבילת צוואה הדדית', price: 1500, category: Category.WILLS },
            { id: 'prod_2', title: 'בדיקת חוזה דירה', price: 2500, category: Category.REAL_ESTATE },
            { id: 'prod_3', title: 'פגישת ייעוץ (שעה)', price: 450, category: Category.CONTACT },
        ];
    }
};