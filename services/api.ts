
import { Article, TeamMember, WillsFormData, FormDefinition, Category, IntegrationsConfig, AppState, SiteConfig } from '../types.ts';
import { jsPDF } from "jspdf";

// --- Cloud Sync Service (Google Sheets as Database) ---
export const cloudService = {
    async saveStateToCloud(url: string, state: AppState): Promise<boolean> {
        try {
            const payload = {
                action: 'saveState',
                data: {
                    articles: state.articles,
                    timelines: state.timelines,
                    slides: state.slides,
                    forms: state.forms,
                    teamMembers: state.teamMembers,
                    menuItems: state.menuItems,
                    config: state.config
                }
            };

            await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            return true;
        } catch (e) {
            console.error("Cloud Save Error:", e);
            return false;
        }
    },

    async loadStateFromCloud(url: string): Promise<Partial<AppState> | null> {
        try {
            const fetchUrl = `${url}?action=getState&t=${Date.now()}`;
            const response = await fetch(fetchUrl);
            const json = await response.json();
            
            if (json && json.status === 'success' && json.data) {
                return json.data;
            }
            return null;
        } catch (e) {
            console.warn("Could not load state from cloud", e);
            return null;
        }
    },

    async uploadImage(url: string, base64Data: string, fileName: string): Promise<string | null> {
        try {
            const cleanBase64 = base64Data.split(',')[1] || base64Data;
            const mimeType = base64Data.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

            const payload = {
                action: 'uploadImage',
                data: {
                    imageData: cleanBase64,
                    mimeType: mimeType,
                    fileName: fileName || `image_${Date.now()}.jpg`
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result && result.status === 'success' && result.url) {
                return result.url;
            }
            return null;
        } catch (e) {
            console.error("Image Upload Error:", e);
            return null;
        }
    }
};

// --- Email & Forms Service ---
export const emailService = {
    // PDF: Local Fallback (Disabled to avoid gibberish)
    generateAndDownloadWill(data: any) {
        console.warn("Local PDF generation disabled. Using Google Sheets for PDF generation.");
        return true; 
    },

    generateAndDownloadPOA(data: any) {
         console.warn("Local PDF generation disabled. Using Google Sheets for PDF generation.");
         return true;
    },

    /**
     * פונקציה ראשית לשליחת טפסים
     */
    async sendForm(formTitle: string, data: any, config?: IntegrationsConfig, pdfTemplate?: 'NONE' | 'WILL' | 'POA', sendClientCopy: boolean = false, officeEmail?: string): Promise<boolean> {
        console.log(`Processing Form: ${formTitle} [Template: ${pdfTemplate}]`);
        
        // --- 1. PRIORITY: GOOGLE SHEETS (Server Side Processing) ---
        if (config?.googleSheetsUrl && config.googleSheetsUrl.includes('script.google.com')) {
            try {
                // Improved Client Email Detection
                let clientEmail = data['email'] || data['אימייל'] || data['contactEmail'] || data['דוא"ל'];
                
                // If not found in standard keys, try to find any key that looks like email
                if (!clientEmail) {
                    const emailKey = Object.keys(data).find(k => k.toLowerCase().includes('mail') && typeof data[k] === 'string' && data[k].includes('@'));
                    if (emailKey) clientEmail = data[emailKey];
                }

                // Logging for debug
                console.log(`Sending Form. Title: ${formTitle}, Client Copy Requested: ${sendClientCopy}, Client Email Found: ${clientEmail || 'NONE'}`);

                const payload = {
                    action: 'submitForm',       
                    targetSheet: 'DATA',        
                    templateSheet: pdfTemplate === 'WILL' ? 'WILL' : (pdfTemplate === 'POA' ? 'POA' : undefined), 
                    formName: formTitle,
                    submittedAt: new Date().toLocaleString('he-IL'),
                    officeEmail: officeEmail, // Explicitly pass office email
                    clientEmail: clientEmail, // Explicitly pass client email if found
                    sendClientCopy: sendClientCopy, // Tell script whether to CC client
                    ...data 
                };

                // שימוש ב-no-cors כדי למנוע חסימת דפדפן.
                await fetch(config.googleSheetsUrl, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });

                return true; 

            } catch (e) {
                console.error("Google Sheets Error:", e);
                alert("אירעה שגיאה בשליחה למערכת הניהול.");
                return false;
            }
        } 
        
        // --- 2. FALLBACK: Alert user that no backend is configured ---
        else {
            alert("לא מוגדר חיבור ל-Google Sheets. הנתונים לא נשמרו.");
            return false;
        }
    },

    // Special handler for Wills to map keys to Hebrew for readable Google Sheet
    async sendWillsForm(data: WillsFormData, config: SiteConfig): Promise<boolean> {
        // Flatten the data so Google Sheets receives simple Key: Value pairs
        // and convert field names to Hebrew for the spreadsheet columns
        
        const submissionId = 'WILL-' + Math.random().toString(36).substr(2, 5).toUpperCase();

        const flatData = {
            submissionId: submissionId,
            'שם מלא': data.fullName,
            'שם בן/בת הזוג': data.spouseName,
            'מספר ילדים': data.childrenCount,
            'שמות הילדים': data.childrenNames.join(', '), // Convert array to string
            'חלוקה שווה': data.equalDistribution ? 'כן' : 'לא',
            'טלפון': data.contactPhone,
            'אימייל': data.contactEmail,
            'נכסים': data.assets ? data.assets.map(a => `${a.type}: ${a.description}`).join(' | ') : 'ללא',
            // Add technical keys for search
            'email': data.contactEmail 
        };

        // Always send to office email defined in config (willsEmail) or fallback
        const officeEmail = config.willsEmail || config.contactEmail || 'office@melaw.co.il';
        
        // For wills, explicitly force client copy to TRUE
        return this.sendForm('Wills Generator', flatData, config.integrations, 'WILL', true, officeEmail);
    }
};

export const storeService = {
    getCheckoutLink(productId: string, config?: IntegrationsConfig): string {
        if (!config) return "#";
        if (productId === 'prod_1') return config.stripeWillsLink || "#";
        if (productId === 'prod_2') return config.stripeRealEstateLink || "#";
        if (productId === 'prod_3') return config.stripeConsultationLink || "#";
        return "#";
    },

    getProducts() {
        return [
            { id: 'prod_1', title: 'צוואה הדדית', price: 1500, category: Category.WILLS },
            { id: 'prod_2', title: 'בדיקת חוזה דירה', price: 2500, category: Category.REAL_ESTATE },
            { id: 'prod_3', title: 'ייפוי כוח מתמשך', price: 3800, category: Category.POA },
            { id: 'prod_4', title: 'הסכם מייסדים', price: 1200, category: Category.STORE },
            { id: 'prod_5', title: 'מכתב התראה', price: 450, category: Category.CONTACT },
            { id: 'prod_6', title: 'הסכם שכירות', price: 800, category: Category.REAL_ESTATE },
        ];
    }
};
