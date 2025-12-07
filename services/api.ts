import { Article, TeamMember, WillsFormData, FormDefinition, Category } from '../types.ts';
import { jsPDF } from "jspdf";

// ============================================================================
// הנחיות לחיבור המערכת (CONFIGURATION)
// ============================================================================
// כאן עליך להדביק את המפתחות שתקבל מהשירותים החיצוניים.
// 1. Database: הירשם ל-Supabase.com
// 2. Email: הירשם ל-EmailJS.com
// 3. Store: הירשם ל-Stripe.com וצור "Payment Links" למוצרים שלך
// ============================================================================

const CONFIG = {
    // שנה ל-false רק אחרי שתדביק את כל המפתחות למטה
    useMockData: true, 

    // --- הגדרות אימייל (EmailJS) ---
    email: {
        serviceId: "YOUR_SERVICE_ID_HERE",   // לדוגמא: service_z3x2...
        templateId: "YOUR_TEMPLATE_ID_HERE", // לדוגמא: template_a1b2...
        publicKey: "YOUR_PUBLIC_KEY_HERE"    // לדוגמא: user_XyZ...
    },

    // --- הגדרות חנות (Stripe Payment Links) ---
    // כאן מדביקים את הלינקים שסטרייפ נותן לך לכל מוצר
    store: {
        products: {
            // הירשם לסטרייפ -> צור מוצר -> לחץ Create Payment Link -> הדבק כאן
            willsPackage: "https://buy.stripe.com/test_1", 
            contractReview: "https://buy.stripe.com/test_2",
            consultation: "https://buy.stripe.com/test_3"
        }
    },

    // --- הגדרות מסד נתונים (Supabase) ---
    database: {
        url: "YOUR_SUPABASE_URL", // לדוגמא: https://xyz.supabase.co
        key: "YOUR_SUPABASE_ANON_KEY"
    }
};

// ============================================================================
// SERVICES IMPLEMENTATION
// ============================================================================

// --- Mock Data Service (Database Placeholder) ---
export const dbService = {
    async getArticles(): Promise<Article[]> {
        if (CONFIG.useMockData) {
            return Promise.resolve([]); // App.tsx handles initial mock state
        }
        return [];
    },

    async saveArticle(article: Article): Promise<boolean> {
        console.log("Saving to Database:", article);
        return true;
    },

    async uploadImage(file: File): Promise<string> {
        console.log("Uploading image...");
        return URL.createObjectURL(file); // Mock URL
    }
};

// --- Email & Forms Service ---
export const emailService = {
    // פונקציה ליצירת PDF והורדה מיידית (Client Side)
    generateAndDownloadWill(data: WillsFormData) {
        try {
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            // הערה: תמיכה בעברית ב-PDF דורשת טעינת פונט.
            // כאן אנו משתמשים בפונט ברירת מחדל, ולכן נשתמש באנגלית בדוגמה זו או בטקסט פשוט.
            // כדי להוסיף עברית מלאה יש להוסיף קובץ .ttf בפורמט base64 (addFileToVFS).

            doc.setFontSize(22);
            doc.text("Last Will and Testament", 105, 20, { align: "center" });
            
            doc.setFontSize(16);
            doc.text(`Testator: ${data.fullName}`, 20, 40);
            doc.text(`ID/Spouse: ${data.spouseName}`, 20, 50);
            
            doc.setFontSize(14);
            doc.text("Heirs (Children):", 20, 70);
            data.childrenNames.forEach((child, index) => {
                doc.text(`${index + 1}. ${child}`, 30, 80 + (index * 10));
            });

            const yPos = 80 + (data.childrenNames.length * 10) + 20;
            doc.text("Declarations:", 20, yPos);
            doc.setFontSize(12);
            doc.text("I hereby declare that this is my last will, made in sound mind.", 20, yPos + 10);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos + 20);

            doc.save("My_Will.pdf");
            return true;
        } catch (e) {
            console.error("PDF Generation Error", e);
            return false;
        }
    },

    async sendWillsForm(data: WillsFormData): Promise<boolean> {
        console.log("Processing Will Form...");
        
        // 1. הורדה מיידית ללקוח
        this.generateAndDownloadWill(data);

        // 2. שליחת מייל (דרך EmailJS) עם הטקסט בלבד (ללא הקובץ)
        if (CONFIG.useMockData) {
            console.log("MOCK Email Sent:", data);
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            return true;
        }

        // כאן ניתן להוסיף את קוד EmailJS כדי לשלוח התראה לעורך הדין
        // const templateParams = {
        //    to_name: "Admin",
        //    from_name: data.fullName,
        //    message: `New Will generated for ${data.fullName}. Spouse: ${data.spouseName}. Contact: ${data.contactPhone}`,
        // };
        // await emailjs.send(CONFIG.email.serviceId, CONFIG.email.templateId, templateParams);
        
        return true;
    },

    async sendContactForm(name: string, email: string, message: string): Promise<boolean> {
        console.log(`Sending Contact Form: ${email}`);
        return true;
    }
};

// --- Store & Payments Service ---
export const storeService = {
    getCheckoutLink(productId: string): string {
        if (productId === 'prod_1') return CONFIG.store.products.willsPackage;
        if (productId === 'prod_2') return CONFIG.store.products.contractReview;
        if (productId === 'prod_3') return CONFIG.store.products.consultation;
        return "#";
    },

    getProducts() {
        return [
            { id: 'prod_1', title: 'חבילת צוואה הדדית', price: 1500, category: Category.WILLS },
            { id: 'prod_2', title: 'בדיקת חוזה דירה', price: 2500, category: Category.REAL_ESTATE },
            { id: 'prod_3', title: 'פגישת ייעוץ (שעה)', price: 450, category: Category.CONTACT },
        ];
    }
};