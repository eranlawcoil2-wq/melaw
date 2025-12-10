
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

            const response = await fetch(url, {
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
    },

    /**
     * Uploads an image (Base64) to Google Drive via the Apps Script
     * Returns the public URL of the image
     */
    async uploadImage(url: string, base64Data: string, fileName: string): Promise<string | null> {
        try {
            // Extract pure base64 if it has the prefix
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
    // PDF: Last Will - UPDATED to be Dynamic
    generateAndDownloadWill(data: any) {
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            
            // Header
            doc.setFontSize(22);
            doc.text("Legal Document / Will", 105, 20, { align: "center" });
            
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" });
            
            doc.setLineWidth(0.5);
            doc.line(20, 32, 190, 32);

            doc.setFontSize(14);
            let y = 45;
            
            // Iterate over ALL dynamic fields passed from the form
            // This ensures new fields added in the Admin Dashboard are printed
            Object.keys(data).forEach((key) => {
                const val = data[key];
                
                // Skip internal keys if necessary, or just print everything that isn't empty
                if (val && typeof val !== 'object' && key !== 'formName' && key !== 'submittedAt') {
                    // Check for page overflow
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    // Simple formatting: Key -> Value
                    // Note: Hebrew support in client-side jsPDF is limited without custom fonts.
                    // If keys are in Hebrew, they might appear reversed or garbled in basic jsPDF.
                    doc.setFont("helvetica", "bold");
                    doc.text(`${key}:`, 20, y);
                    
                    doc.setFont("helvetica", "normal");
                    // Wrap long text
                    const splitText = doc.splitTextToSize(String(val), 120);
                    doc.text(splitText, 60, y);
                    
                    y += (splitText.length * 7) + 5; // Adjust spacing based on text lines
                }
                
                // Handle Arrays (like children names) specially if they exist
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

            // Footer / Signature Area
            if (y > 240) { doc.addPage(); y = 40; } else { y += 20; }
            doc.line(20, y, 100, y);
            doc.setFontSize(12);
            doc.text("Signature", 20, y + 6);

            doc.save("Will_Document.pdf");
            return true;
        } catch (e) {
            console.error("PDF Generation Error", e);
            return false;
        }
    },

    // PDF: Power of Attorney (POA)
    generateAndDownloadPOA(data: any) {
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            doc.setFontSize(22);
            doc.text("Enduring Power of Attorney", 105, 20, { align: "center" });
            
            doc.setFontSize(14);
            let y = 50;
            
            // Iterate over dynamic fields and print them
            Object.keys(data).forEach((key) => {
                const val = data[key];
                if (typeof val === 'string' && y < 270) {
                    doc.text(`${key}: ${val}`, 20, y);
                    y += 10;
                }
            });

            doc.text(`Date Signed: ${new Date().toLocaleDateString()}`, 20, y + 20);
            doc.save("POA_Document.pdf");
            return true;
        } catch (e) {
            console.error("POA PDF Generation Error", e);
            return false;
        }
    },

    /**
     * פונקציה כללית לשליחת טפסים (גם צוואות וגם טפסים דינמיים)
     */
    async sendForm(formTitle: string, data: any, config?: IntegrationsConfig, pdfTemplate?: 'NONE' | 'WILL' | 'POA'): Promise<boolean> {
        console.log(`Processing Form: ${formTitle} [Template: ${pdfTemplate}]`, data);
        
        // Handle Client-Side PDF Generation based on selection
        // This is a "Fallback" visual copy for the user.
        if (pdfTemplate === 'WILL' || (formTitle === 'Wills Generator' && !pdfTemplate)) {
            this.generateAndDownloadWill(data);
        } else if (pdfTemplate === 'POA') {
            this.generateAndDownloadPOA(data);
        }

        // 1. שמירה ל-Google Sheets (אם הוגדר URL)
        // הנתונים נשלחים רק אם יש URL ב-config
        if (config?.googleSheetsUrl) {
            try {
                // הכנת הנתונים לשליחה (מוסיפים תאריך ושם טופס)
                const payload = {
                    action: 'submitForm', // Identifier for the script
                    targetSheet: 'DATA', // Explicitly ask script to save to DATA sheet
                    templateSheet: pdfTemplate === 'WILL' ? 'WILL' : undefined, // Hint for script if it generates PDF
                    formName: formTitle,
                    submittedAt: new Date().toLocaleString('he-IL'),
                    ...data // Spread all dynamic fields here
                };

                // Use simple POST
                await fetch(config.googleSheetsUrl, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Ensures Payload is sent correctly
                    body: JSON.stringify(payload)
                });
                console.log("Sent to Google Sheets successfully (Target: DATA)");
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
        return this.sendForm('Wills Generator', data, config, 'WILL');
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
            { id: 'prod_1', title: 'צוואה הדדית', price: 1500, category: Category.WILLS },
            { id: 'prod_2', title: 'בדיקת חוזה דירה', price: 2500, category: Category.REAL_ESTATE },
            { id: 'prod_3', title: 'ייפוי כוח מתמשך', price: 3800, category: Category.POA },
            { id: 'prod_4', title: 'הסכם מייסדים', price: 1200, category: Category.STORE },
            { id: 'prod_5', title: 'מכתב התראה', price: 450, category: Category.CONTACT },
            { id: 'prod_6', title: 'הסכם שכירות', price: 800, category: Category.REAL_ESTATE },
        ];
    }
};
