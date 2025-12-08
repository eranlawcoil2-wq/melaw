import { Article, TeamMember, WillsFormData, FormDefinition, Category, IntegrationsConfig } from '../types.ts';
import { jsPDF } from "jspdf";

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
                console.log("Sending to Google Sheets:", config.googleSheetsUrl);
                
                // הכנת הנתונים לשליחה (מוסיפים תאריך ושם טופס)
                const payload = {
                    formName: formTitle,
                    submittedAt: new Date().toLocaleString(),
                    ...data
                };

                await fetch(config.googleSheetsUrl, {
                    method: 'POST',
                    mode: 'no-cors', // קריטי לעבודה מול Google Apps Script
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                console.log("Sent to Google Sheets successfully (no-cors mode)");
            } catch (e) {
                console.error("Google Sheets Error:", e);
                // לא מחזירים שקר כדי לא לפגוע בחווית המשתמש אם רק השיטס נכשל
            }
        } else {
            console.warn("Google Sheets URL not configured via Admin Dashboard");
        }

        // 2. שליחת אימייל דרך EmailJS (אופציונלי, אם הוגדר)
        if (config?.emailJsServiceId && config?.emailJsPublicKey) {
             console.log("Sending via EmailJS (Not fully implemented in demo)");
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