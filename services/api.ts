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

    async sendWillsForm(data: WillsFormData, config?: IntegrationsConfig): Promise<boolean> {
        console.log("Processing Will Form...");
        
        // 1. הורדה מיידית ללקוח (PDF)
        this.generateAndDownloadWill(data);

        // 2. שמירה ל-Google Sheets (אם הוגדר)
        if (config?.googleSheetsUrl) {
            try {
                // הערה: כדי שזה יעבוד, יש ליצור Google Apps Script שמאזין ל-doPost ושומר לגיליון
                console.log("Sending to Google Sheets:", config.googleSheetsUrl);
                await fetch(config.googleSheetsUrl, {
                    method: 'POST',
                    mode: 'no-cors', // נדרש ברוב המקרים מול Google Apps Script
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                console.log("Sent to Google Sheets");
            } catch (e) {
                console.error("Google Sheets Error:", e);
            }
        }

        // 3. שליחת אימייל דרך EmailJS (אם הוגדר)
        if (config?.emailJsServiceId && config?.emailJsPublicKey) {
             console.log("Sending via EmailJS:", config.emailJsServiceId);
             // כאן יבוא הקוד של emailjs.send(...)
             // לצורך הדמו אנו רק מדפיסים
        } else {
            console.log("EmailJS keys missing - Skipping email send (Mock mode)");
            await new Promise(resolve => setTimeout(resolve, 1500)); 
        }
        
        return true;
    },
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