
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
                    calculators: state.calculators, // Added
                    teamMembers: state.teamMembers,
                    menuItems: state.menuItems,
                    config: state.config,
                    lastUpdated: state.lastUpdated
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

        const isWill = title === 'Wills Generator' || data['formName'] === 'Wills Generator' || data['templateSheet'] === 'WILL';
        const dateStr = new Date().toLocaleDateString('he-IL');

        let htmlContent = `
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>${title} - מסמך רשמי</title>
                <style>
                    body { font-family: 'David', 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.8; color: #000; }
                    .btn-print { background: #2EB0D9; color: white; border: none; padding: 10px 20px; font-size: 16px; cursor: pointer; border-radius: 5px; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none; display: inline-block; margin-bottom: 20px;}
                    @media print {
                        .no-print { display: none; }
                        body { padding: 0; margin: 2cm; }
                    }
                    h1 { text-align: center; text-decoration: underline; margin-bottom: 40px; font-size: 28px; }
                    h2 { font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; text-decoration: underline; }
                    p { margin-bottom: 10px; text-align: justify; }
                    .signature-box { margin-top: 60px; display: flex; justify-content: space-between; }
                    .sig-line { border-top: 1px solid black; width: 200px; text-align: center; padding-top: 5px; }
                    .footer { text-align: center; font-size: 10px; margin-top: 50px; color: #666; font-family: Arial; }
                </style>
            </head>
            <body>
                <div class="no-print">
                    <button onclick="window.print()" class="btn-print">🖨️ הדפס / שמור כ-PDF</button>
                    <div style="font-family: Arial; font-size: 12px; color: #666; margin-bottom: 20px;">
                        שים לב: מסמך זה נוצר באופן אוטומטי על בסיס הנתונים שהזנת. מומלץ לעבור עליו לפני החתימה.
                    </div>
                </div>
        `;

        if (isWill) {
            // --- תבנית צוואה משפטית ---
            const name = data['שם מלא'] || data['fullName'] || '____________';
            const spouse = data['שם בן/בת הזוג'] || data['spouseName'];
            const children = data['שמות הילדים'] || data['childrenNames'];
            const childrenText = Array.isArray(children) ? children.join(', ') : (children || '_____________');
            const assets = data['נכסים'] || 'כל רכושי מכל מין וסוג שהוא';

            htmlContent += `
                <h1>צוואה</h1>
                
                <p>היום, ${dateStr}, אני החתום מטה, <strong>${name}</strong>, כשהנני בדעה צלולה, מרצוני הטוב והחופשי, ללא כל אונס, כפייה או השפעה בלתי הוגנת, מצווה בזה לאמור:</p>

                <h2>1. כללי</h2>
                <p>1.1. זוהי צוואתי האחרונה והיא מבטלת כל צוואה אחרת שנעשתה על ידי לפני כן.</p>
                <p>1.2. הנני מצהיר/ה כי מרכז חיי הינו בישראל.</p>

                <h2>2. המשפחה</h2>
                <p>2.1. הנני נשוי/ה ל${spouse || '____________'}.</p>
                <p>2.2. ילדיי הם: ${childrenText}.</p>

                <h2>3. חלוקת הרכוש</h2>
                <p>3.1. את כל רכושי, מכל מין וסוג שהוא, לרבות מקרקעין, כספים, זכויות ומיטלטלין (${assets}), הנני מצווה לחלק באופן הבא:</p>
                <p><strong>בחלקים שווים בין ילדיי הנזכרים לעיל.</strong></p>
                <p>3.2. במידה ומי מילדיי לא יהיה בין החיים במועד פטירתי, חלקו יעבור לצאצאיו בחלקים שווים.</p>

                <h2>4. שונות</h2>
                <p>4.1. הנני ממנה בזה את ______________ לשמש כמנהל/ת עזבוני לביצוע צוואה זו.</p>

                <div class="signature-box">
                    <div>
                        <p>ולראיה באתי על החתום:</p>
                        <br><br>
                        <div class="sig-line">חתימת המצווה</div>
                    </div>
                </div>

                <div style="margin-top: 50px; border-top: 1px dashed #ccc; padding-top: 20px;">
                    <h3>אישור עדים</h3>
                    <p>אנו החתומים מטה, מאשרים כי ביום ${dateStr}, המצווה <strong>${name}</strong> חתם/ה על צוואה זו בפנינו, לאחר שהצהיר/ה כי זו צוואתו/ה וכי הוא/היא עושה אותה מרצון חופשי.</p>
                    
                    <div class="signature-box">
                        <div style="text-align: center;">
                            <br>____________________<br>
                            שם העד/ה הראשון<br>
                            ת.ז. _____________
                        </div>
                        <div style="text-align: center;">
                            <br>____________________<br>
                            שם העד/ה השני<br>
                            ת.ז. _____________
                        </div>
                    </div>
                </div>
            `;
        } else {
            // --- תבנית טבלה רגילה (לשאר הטפסים) ---
            const keys = Object.keys(data).filter(k => k !== 'submissionId' && k !== 'email' && k !== 'templateSheet' && k !== 'targetSheet' && k !== 'action' && k !== 'formName' && typeof data[k] !== 'object');
            
            htmlContent += `
                <h1>${title}</h1>
                <div style="background: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                    <strong>מספר אסמכתא:</strong> ${data.submissionId || 'N/A'}<br>
                    <strong>תאריך:</strong> ${dateStr}
                </div>
                <table style="width: 100%; border-collapse: collapse;">
            `;
            
            keys.forEach(key => {
                htmlContent += `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; font-weight: bold; width: 30%; background: #f9f9f9;">${key}</td>
                        <td style="padding: 10px;">${data[key]}</td>
                    </tr>
                `;
            });
            
            htmlContent += `</table>`;
        }

        htmlContent += `
                <div class="footer">
                    מסמך זה הופק באמצעות מערכת MeLaw Digital Office.<br>
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

                // Correct target sheet based on screenshot
                let targetSheet = 'DATA';
                if (pdfTemplate === 'WILL') targetSheet = 'WILLDATA'; 
                if (pdfTemplate === 'POA') targetSheet = 'POA';

                const payload = {
                    action: 'submitForm',       
                    targetSheet: targetSheet,        
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
        // We only open print specifically for Wills if requested, or if the user explicitly wants PDF generation.
        // The user specifically asked to STOP automatic PDF opening for general forms.
        // So we removed the automatic "if (success) openLocalPrint" logic that was here.
        
        if (pdfTemplate === 'WILL' && !success) {
             // Only fallback to local print if server failed and it is a will
             setTimeout(() => {
                 this.openLocalPrint(formTitle, data);
             }, 1000);
             return true; 
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
