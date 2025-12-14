
import { GoogleGenAI, Type } from "@google/genai";
import { Article, Category } from "../types.ts";

const getAiClient = (apiKey: string) => {
  try {
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Failed to initialize AI client", e);
    return null;
  }
};

export const generateArticleContent = async (topic: string, category: Category | 'ALL', apiKey: string): Promise<Partial<Article>> => {
  
  // Internal Mock Generator (Fallback)
  const getMockResponse = (errorMsg?: string) => ({
      title: topic,
      abstract: `(שגיאה ביצירה: ${errorMsg || 'סיבה לא ידועה'}) - זהו טקסט דמו.`,
      quote: "המשפט הוא מעוז החלש ומגן היתום.",
      tabs: [
        { title: "ניתוח משפטי", content: `לא הצלחנו ליצור קשר עם ה-AI. השגיאה שהתקבלה: ${errorMsg}` },
        { title: "דוגמאות להמחשה", content: "..." },
        { title: "המלצות פרקטיות", content: "..." }
      ]
  });

  // Validation
  if (!apiKey || apiKey.trim() === '') {
      throw new Error("חסר מפתח API. אנא הגדר מפתח Gemini בלוח הבקרה בלשונית 'חיבורים'.");
  }

  const ai = getAiClient(apiKey);
  if (!ai) {
      throw new Error("שגיאה באתחול מנוע ה-AI.");
  }

  // --- UPDATED PROMPT FOR DEEPER CONTENT ---
  const prompt = `
      אתה שותף בכיר, ותיק ומוערך במשרד עורכי דין מוביל בישראל.
      המטרה שלך היא לכתוב מאמר משפטי מקיף, מעמיק, חד ומדויק בנושא: "${topic}".
      
      הנחיות קריטיות לכתיבה:
      1. **עומק ותוכן**: המאמר חייב לספק ערך אמיתי ומשמעותי לקורא. אל תכתוב סיסמאות שטחיות. הסבר את הרציונל מאחורי החוק, את הניואנסים ואת המשמעויות.
      2. **דוגמאות כלליות בלבד**: אין להמציא פסקי דין, אין לצטט מספרי הליכים ואין להמציא שמות של שופטים. במקום זאת, השתמש ב"דוגמאות מהחיים" או "תרחישים נפוצים" (למשל: "תארו לעצמכם מצב בו...") כדי להמחיש את הסוגיה המשפטית.
      3. **שפה וסגנון**: עברית גבוהה, רהוטה ומקצועית, אך ברורה ומובנת גם לאדם שאינו משפטן.
      4. **מבנה התשובה**: עליך להחזיר JSON בלבד, במבנה המפורט למטה. הקפד על תוכן ארוך ומפורט בתוך הלשוניות (Tabs).

      Structure (JSON Only):
      {
        "title": "כותרת משכנעת, חדה ומקצועית למאמר",
        "abstract": "תקציר מורחב של 3-5 משפטים (Abstract). עליו לגרות את הקורא לקרוא את המאמר ולהסביר את חשיבות הנושא.",
        "quote": "ציטוט חזק, פתגם משפטי או אמרה שנונה הקשורה לנושא.",
        "tabs": [
           { 
             "title": "המסגרת המשפטית", 
             "content": "זהו החלק העיוני. הסבר בהרחבה (לפחות 300 מילים) את המצב המשפטי, החוקים הרלוונטיים (ללא ציטוט סעיפים יבשים אלא הסבר מהותם), והזכויות/חובות הנובעות מהם. הסבר את ה'למה' ולא רק את ה'מה'." 
           },
           { 
             "title": "דוגמאות מהחיים", 
             "content": "זהו החלק הממחיש. כתוב 2-3 תרחישים נפוצים או דוגמאות היפותטיות (לפחות 300 מילים) שמסבירות איך החוק בא לידי ביטוי במציאות. הדגש את הדילמות ואת הפתרונות בכל תרחיש. (אל תצטט פסקי דין אמיתיים או מומצאים)." 
           },
           { 
             "title": "המדריך המעשי", 
             "content": "זהו החלק הפרקטי. כתוב רשימת המלצות ברורה (לפחות 200 מילים). מה צריך לעשות? ממה להיזהר? צור רשימת תיוג (Checklist) או שלבים לפעולה." 
           }
        ]
      }
  `;

  const config = {
    responseMimeType: "application/json",
    // We use a looser schema to prevent validation errors on the model side
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        abstract: { type: Type.STRING },
        quote: { type: Type.STRING },
        tabs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING }
            }
          }
        }
      }
    }
  };

  const parseResponse = (response: any) => {
      if (response.text) {
        let cleanText = response.text.trim();
        // Clean up markdown formatting if present
        cleanText = cleanText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error", cleanText);
            throw new Error("המודל החזיר תשובה שאינה בפורמט תקין.");
        }
      }
      throw new Error("התקבלה תשובה ריקה מהמודל.");
  };

  // TRY MODELS SEQUENTIALLY
  try {
    // Attempt 1: Gemini 2.5 Flash
    console.log("Trying gemini-2.5-flash...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: config
    });
    return parseResponse(response);

  } catch (error: any) {
    console.warn("gemini-2.5-flash failed:", error);
    
    // Attempt 2: Gemini 2.0 Flash (Fallback)
    try {
        console.log("Trying fallback to gemini-2.0-flash...");
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: config
        });
        return parseResponse(response);
    } catch (fallbackError: any) {
        console.error("All models failed:", fallbackError);
        
        // Extract meaningful error message
        let msg = fallbackError.message || fallbackError.toString();
        if (msg.includes('400')) msg = "שגיאת בקשה (400). ייתכן שהמודל לא זמין באזורך.";
        if (msg.includes('403')) msg = "אין הרשאה (403). בדוק את מפתח ה-API.";
        if (msg.includes('404')) msg = "המודל לא נמצא (404).";
        
        // Return mock with error detail so user sees it in the UI
        return getMockResponse(msg);
    }
  }
};

export const generateImagePrompt = async (topic: string): Promise<string> => {
    return `Legal illustration for ${topic}, professional, photorealistic, 4k, cinematic lighting, corporate style`;
};
