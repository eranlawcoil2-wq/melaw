
import { Article, TeamMember, WillsFormData, FormDefinition, Category, IntegrationsConfig, AppState } from '../types.ts';
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
    // PDF: Local Fallback (Only used if no Google Sheet connection)
    generateAndDownloadWill(data: any) {
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            
            doc.setFontSize(22);
            doc.text("Legal Document / Will (Local Preview)", 105, 20, { align: "center" });
            
            doc.setFontSize(10);
            doc.text(`Generated locally on: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" });
            doc.text("(To get the official format, please connect Google Sheets)", 105, 34, { align: "center" });
            
            doc.setLineWidth(0.5);
            doc.line(20, 38, 190, 38);

            doc.setFontSize(14);
            let y = 50;
            
            Object.keys(data).forEach((key) => {
                const val = data[key];
                if (val && typeof val !== 'object' && key !== 'formName' && key !== 'submittedAt') {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.setFont("helvetica", "bold");
                    doc.text(`${key}:`, 20, y);
                    doc.setFont("helvetica", "normal");
                    const splitText = doc.splitTextToSize(String(val), 120);
                    doc.text(splitText, 60, y);
                    y += (splitText.length * 7) + 5;
                }
                if (Array.isArray(val)) {
                     if (y > 270) { doc.addPage(); y = 20; }
                     doc.setFont("helvetica", "bold");
                     doc.text(`${key}:`, 20, y);
                     y += 7;
                     val.forEach((item, idx) => {
                         if (y > 270) { doc.addPage(); y = 20; }
                         doc.setFont("helvetica", "normal");
                         doc.text(`- ${item}`, 30, y);
                         y += 7;
                     });
                     y += 5;
                }
            });

            doc.save("Will_Local_Backup.pdf");
            return true;
        } catch (e) {
            console.error("PDF Generation Error", e);
            return false;
        }
    },

    generateAndDownloadPOA(data: any) {
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            doc.setFontSize(22);
            doc.text("Power of Attorney (Local)", 105, 20, { align: "center" });
            let y = 50;
            Object.keys(data).forEach((key) => {
                const val = data[key];
                if (typeof val === 'string' && y < 270) {
                    doc.text(`${key}: ${val}`, 20, y);
                    y += 10;
                }
            });
            doc.save("POA_Local_Backup.pdf");
            return true;
        } catch (e) {
            console.error("POA PDF Generation Error", e);
            return false;
        }
    },

    /**
     * פונקציה ראשית לשליחת טפסים
     * שינוי לוגיקה: אם יש גוגל שיטס - הוא הבוס. לא מדפיסים מקומית.
     */
    async sendForm(formTitle: string, data: any, config?: IntegrationsConfig, pdfTemplate?: 'NONE' | 'WILL' | 'POA'): Promise<boolean> {
        console.log(`Processing Form: ${formTitle} [Template: ${pdfTemplate}]`);
        
        // --- 1. PRIORITY: GOOGLE SHEETS (Server Side Processing) ---
        // אם מוגדר חיבור לסקריפט של גוגל - שולחים לשם ומדלגים על יצירה מקומית
        if (config?.googleSheetsUrl && config.googleSheetsUrl.includes('script.google.com')) {
            try {
                // מכינים את המידע בדיוק כמו שהסקריפט מצפה לקבל
                const payload = {
                    action: 'submitForm',       // שם הפעולה בסקריפט
                    targetSheet: 'DATA',        // שם הגיליון לשמירת הנתונים (כפי שביקשת)
                    templateSheet: pdfTemplate === 'WILL' ? 'WILL' : (pdfTemplate === 'POA' ? 'POA' : undefined), // שם הגיליון להדפסה
                    formName: formTitle,
                    submittedAt: new Date().toLocaleString('he-IL'),
                    ...data // כל השדות הדינמיים נשלחים כפי שהם
                };

                console.log("Sending to Google Script (DATA -> WILL):", payload);

                // שימוש ב-no-cors כדי למנוע חסימת דפדפן.
                await fetch(config.googleSheetsUrl, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });

                // כאן אנחנו מסיימים. הסקריפט בגוגל אחראי ליצור את ה-PDF מהגיליון 'WILL'
                // ולשלוח אותו במייל. לא מפעילים generateAndDownloadWill.
                return true; 

            } catch (e) {
                console.error("Google Sheets Error:", e);
                alert("אירעה שגיאה בשליחה למערכת הניהול.");
                return false;
            }
        } 
        
        // --- 2. FALLBACK: LOCAL PDF (Only if NO Google Sheets connected) ---
        // רק אם אין חיבור לגוגל, נייצר PDF מקומי בסיסי כדי שהלקוח לא יצא בידיים ריקות
        else {
            console.warn("No Google Sheets connected. Generating local PDF fallback.");
            if (pdfTemplate === 'WILL' || (formTitle === 'Wills Generator' && !pdfTemplate)) {
                this.generateAndDownloadWill(data);
            } else if (pdfTemplate === 'POA') {
                this.generateAndDownloadPOA(data);
            }
            return true;
        }
    },

    async sendWillsForm(data: WillsFormData, config?: IntegrationsConfig): Promise<boolean> {
        return this.sendForm('Wills Generator', data, config, 'WILL');
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
