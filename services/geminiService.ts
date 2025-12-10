
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
        { title: "סיפור מקרה", content: "..." },
        { title: "המלצות", content: "..." }
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

  const prompt = `
      אתה שותף בכיר ומנוסה במשרד עורכי דין מוביל בישראל.
      כתוב מאמר משפטי מקצועי בנושא: "${topic}".
      
      הנחיות:
      1. כתוב בעברית רהוטה, משפטית אך ברורה.
      2. צטט חוקים ישראליים רלוונטיים (חוק הירושה, חוק המקרקעין וכו').
      3. המבנה חייב להיות בפורמט JSON בלבד לפי הסכמה למטה.
      
      Structure:
      {
        "title": "כותרת שיווקית ומשפטית",
        "abstract": "תקציר של 3-4 משפטים (Abstract)",
        "quote": "ציטוט משפטי קצר ומחכים",
        "tabs": [
           { "title": "ניתוח משפטי", "content": "הסבר מעמיק, סעיפי חוק, פסיקה רלוונטית" },
           { "title": "סיפור מקרה", "content": "תיאור מקרה של לקוח והפתרון המשפטי" },
           { "title": "המלצות", "content": "רשימת המלצות פרקטיות ללקוח" }
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
