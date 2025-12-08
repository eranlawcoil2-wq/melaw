import { Article, TeamMember, WillsFormData, FormDefinition, Category, IntegrationsConfig, AppState } from '../types.ts';
import { jsPDF } from "jspdf";

// --- Cloud Sync Service (Google Sheets as Database) ---
export const cloudService = {
    async saveStateToCloud(url: string, state: AppState): Promise<boolean> {
        try {
            // We only send the essential data, not the UI state (like isAdminLoggedIn)
            const payload = {
                action: 'saveState',
                data: {
                    articles: state.articles,
                    timelines: state.timelines,
                    slides: state.slides,
                    forms: state.forms,
                    teamMembers: state.teamMembers,
                    menuItems: state.menuItems,
                    config: state.config // Includes the office name, phone, etc.
                }
            };

            // Using no-cors might prevent reading the response, but it sends the data.
            // For a better implementation, the Google Script returns JSONP or simple JSON with correct CORS headers.
            // Here we assume standard fetch.
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            // With Google Apps Script Web App, a 200 or 302 usually means success even if opaque
            return true;
        } catch (e) {
            console.error("Cloud Save Error:", e);
            return false;
        }
    },

    async loadStateFromCloud(url: string): Promise<Partial<AppState> | null> {
        try {
            // Append query param to avoid caching
            const fetchUrl = `${url}?action=getState&t=${Date.now()}`;
            const response = await fetch(fetchUrl);
            const json = await response.json();
            
            if (json && json.status === 'success' && json.data) {
                return json.data;
            }
            return null;
        } catch (e) {
            console.warn("Could not load state from cloud (using local fallback)", e);
            return null;
        }
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

    /**
     * פונקציה כללית לשליחת טפסים (גם צוואות וגם טפסים דינמיים)
     */
    async sendForm(formTitle: string, data: any, config?: IntegrationsConfig): Promise<boolean> {
        console.log(`Processing Form: ${formTitle}`, data);
        
        // אם זה טופס צוואה, נוריד גם PDF
        if (formTitle === 'Wills Generator' && data.childrenNames) {
            this.generateAndDownloadWill(data as WillsFormData);
        }

        // 1. שמירה ל-Google Sheets (אם הוגדר URL)
        // הנתונים נשלחים רק אם יש URL ב-config
        if (config?.googleSheetsUrl) {
            try {
                // הכנת הנתונים לשליחה (מוסיפים תאריך ושם טופס)
                const payload = {
                    action: 'submitForm', // New identifier for the script
                    formName: formTitle,
                    submittedAt: new Date().toLocaleString(),
                    ...data
                };

                // Use simple POST
                await fetch(config.googleSheetsUrl, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Ensures Payload is sent correctly
                    body: JSON.stringify(payload)
                });
                console.log("Sent to Google Sheets successfully");
            } catch (e) {
                console.error("Google Sheets Error:", e);
            }
        } else {
            console.warn("Google Sheets URL not configured via Admin Dashboard");
        }
        
        return true;
    },

    // תמיכה לאחור בקוד קיים שקורא ל-sendWillsForm
    async sendWillsForm(data: WillsFormData, config?: IntegrationsConfig): Promise<boolean> {
        return this.sendForm('Wills Generator', data, config);
    }
};

// --- Store & Payments Service ---
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
            { id: 'prod_1', title: 'חבילת צוואה הדדית', price: 1500, category: Category.WILLS },
            { id: 'prod_2', title: 'בדיקת חוזה דירה', price: 2500, category: Category.REAL_ESTATE },
            { id: 'prod_3', title: 'פגישת ייעוץ (שעה)', price: 450, category: Category.CONTACT },
        ];
    }
};