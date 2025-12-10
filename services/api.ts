
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
                    config: state.config,
                    lastUpdated: state.lastUpdated // Ensure sync
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
    // Generate a simple HTML print view for immediate local printing (Perfect Hebrew Support)
    openLocalPrint(title: string, data: any) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('הדפדפן חסם את החלון הקופץ. אנא אפשר חלונות קופצים כדי להדפיס.');
            return;
        }

        const keys = Object.keys(data).filter(k => k !== 'submissionId' && k !== 'email' && typeof data[k] !== 'object');
        
        let htmlContent = `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>${title} - הדפסה</title>
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                    h1 { color: #2EB0D9; border-bottom: 2px solid #2EB0D9; padding-bottom: 10px; margin-bottom: 30px; }
                    .header-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px; font-size: 0.9em; color: #555; }
                    .field-row { display: flex; border-bottom: 1px solid #eee; padding: 12px 0; }
                    .field-label { font-weight: bold; width: 35%; color: #333; }
                    .field-value { width: 65%; color: #000; }
                    .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align: left; margin-bottom: 20px;">
                    <button onclick="window.print()" style="background: #2EB0D9; color: white; border: none; padding: 10px 20px; font-size: 16px; cursor: pointer; border-radius: 5px; font-weight: bold;">🖨️ הדפס / שמור כ-PDF</button>
                </div>

                <h1>${title}</h1>
                
                <div class="header-info">
                    <strong>מספר אסמכתא:</strong> ${data.submissionId || 'N/A'}<br>
                    <strong>תאריך הפקה:</strong> ${new Date().toLocaleString('he-IL')}
                </div>

                <div class="content">
        `;

        keys.forEach(key => {
            htmlContent += `
                <div class="field-row">
                    <div class="field-label">${key}</div>
                    <div class="field-value">${data[key]}</div>
                </div>
            `;
        });

        htmlContent += `
                </div>
                
                <div class="footer">
                    מסמך זה הופק באופן אוטומטי ע"י מערכת MeLaw Digital Office.<br>
                    © כל הזכויות שמורות.
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    },

    /**
     * פונקציה ראשית לשליחת טפסים
     */
    async sendForm(formTitle: string, data: any, config?: IntegrationsConfig, pdfTemplate?: 'NONE' | 'WILL' | 'POA', sendClientCopy: boolean = false, officeEmail?: string): Promise<boolean> {
        console.log(`Processing Form: ${formTitle} [Template: ${pdfTemplate}]`);
        
        let success = false;

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

                success = true;

            } catch (e) {
                console.error("Google Sheets Error:", e);
                // Don't alert here yet, fallback to local print logic for user convenience
            }
        } 
        
        // --- 2. ALWAYS OFFER LOCAL PRINT FOR WILLS (Since Email is flaky for user) ---
        // If it's a WILL or POA, or if the server send failed, open the local print view
        if (pdfTemplate === 'WILL' || pdfTemplate === 'POA' || !success) {
             // Slight delay to allow the "Success" alert from the caller to happen (or happen after)
             setTimeout(() => {
                 this.openLocalPrint(formTitle, data);
             }, 1000);
             return true; // Mark as "handled" so the UI doesn't think it failed completely
        }

        if (!success && !config?.googleSheetsUrl) {
             alert("לא מוגדר חיבור ל-Google Sheets. הנתונים לא נשמרו בשרת, אך תוכל להדפיס אותם כעת.");
             this.openLocalPrint(formTitle, data);
             return true;
        }

        return success;
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
