
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
  
  // Internal Mock Generator
  const getMockResponse = () => ({
      title: topic,
      abstract: `זהו תקציר שנוצר אוטומטית (מצב דמו/גיבוי) עבור הנושא: "${topic}". לא ניתן היה ליצור קשר עם מודל ה-AI כרגע. אנא בדוק את מפתח ה-API.`,
      quote: "המשפט הוא מעוז החלש ומגן היתום.",
      tabs: [
        { title: "ניתוח משפטי", content: `בחלק זה נסקור את העקרונות הרלוונטיים לנושא ${topic} בצורה בהירה ומקצועית. (תוכן דמו).` },
        { title: "סיפור מקרה", content: "מקרה שהיה: בני זוג שלא ערכו הסכם ונאלצו להתמודד עם..." },
        { title: "המלצות", content: "• סעיף ראשון חשוב\n• סעיף שני חשוב" }
      ]
  });

  // If no key provided, return mock immediately without error
  if (!apiKey || apiKey === 'demo' || apiKey.length < 10) {
      return getMockResponse();
  }

  const ai = getAiClient(apiKey);
  if (!ai) {
      console.error("Could not initialize Gemini Client");
      return getMockResponse();
  }

  const prompt = `
      אתה שותף בכיר במשרד עורכי דין מוביל בישראל (Senior Partner).
      המשימה שלך: לכתוב מאמר משפטי מעמיק, חד, ומקצועי בנושא: "${topic}".
      
      המאמר מיועד ללקוחות פוטנציאליים אך חייב לשדר מקצועיות עליונה, שליטה בחוק ובפסיקה.
      
      הנחיות קריטיות לתוכן (חובה):
      1. **עומק משפטי אמיתי:** אל תכתוב סיסמאות. תנתח את המצב המשפטי.
      2. **חובה לצטט מקורות:** הזכר במפורש שמות של חוקים רלוונטיים (למשל: "חוק הירושה, תשכ"ה-1965", "חוק המקרקעין", "חוק הכשרות המשפטית").
      3. **אזכור פסיקה:** במידת האפשר, ציין עקרונות שנקבעו בפסיקת בית המשפט העליון (בג"ץ או פס"ד אזרחי) הרלוונטיים לנושא.
      4. **טון:** סמכותי, אינטליגנטי, אך מוסבר בגובה העיניים. לא שיווקי זול, אלא מעניק ערך.

      מבנה התשובה הנדרש (JSON):
      
      1. **Abstract (תקציר):** פתיח חזק של 4-5 משפטים שמסביר למה הסוגיה הזו קריטית דווקא היום.
      2. **Quote (ציטוט):** משפט מחץ קצר או פתגם משפטי שקשור לנושא.
      3. **Tab 1 - "ניתוח משפטי מעמיק":**
         - זהו הלב של המאמר. כתוב כאן לפחות 3 פסקאות מלאות.
         - הסבר את לשון החוק.
         - הסבר את הבעייתיות המשפטית.
         - תן דוגמאות למורכבות.
      4. **Tab 2 - "סיפור מקרה (Case Study)":**
         - כתוב סיפור ריאליסטי ומפורט על לקוח שהגיע למשרד עם בעיה בנושא זה.
         - תאר את הקונפליקט, את הטעות שעשה (או כמעט עשה), ואת הפתרון המשפטי שניתן.
      5. **Tab 3 - "המלצות וסיכום":**
         - רשימה של 4-5 המלצות פרקטיות ("עשה ואל תעשה").
         - סיכום קצר.

      Output MUST be a valid JSON object matching the schema.
  `;

  const config = {
    responseMimeType: "application/json",
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

  // Helper to parse response
  const parseResponse = (response: any) => {
      if (response.text) {
        let cleanText = response.text.trim();
        // Remove Markdown Code Blocks
        if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        return JSON.parse(cleanText);
      }
      throw new Error("Empty text in response");
  };

  // TRY PRIMARY MODEL (gemini-2.5-flash)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: config
    });
    return parseResponse(response);
  } catch (error: any) {
    console.warn("Primary model (gemini-2.5-flash) failed, trying fallback...", error);

    // TRY FALLBACK MODEL (gemini-2.0-flash)
    try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash", // Fallback
          contents: prompt,
          config: config
        });
        return parseResponse(response);
    } catch (fallbackError: any) {
        console.error("Fallback model failed:", fallbackError);
        // Return mock data instead of crashing completely so the UI stays responsive
        return getMockResponse();
    }
  }
};

export const generateImagePrompt = async (topic: string): Promise<string> => {
    return `Legal illustration for ${topic}, professional, photorealistic, 4k, cinematic lighting, corporate style`;
};
