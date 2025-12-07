import { GoogleGenAI, Type } from "@google/genai";
import { Article, Category } from "../types.ts";

const getAiClient = () => {
  try {
    // Safely access process.env
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
    
    // In demo environment without env vars, return null to trigger fallback immediately
    if (!apiKey) {
      console.warn("API Key is missing. Using mock generator.");
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Failed to initialize AI client", e);
    return null;
  }
};

export const generateArticleContent = async (topic: string, category: Category | 'ALL'): Promise<Partial<Article>> => {
  // Mock response generator for fallback
  const getMockResponse = () => ({
      title: topic,
      abstract: `זהו תקציר שנוצר אוטומטית עבור הנושא: "${topic}". המאמר עוסק בהיבטים המשפטיים והמעשיים של התחום, תוך דגש על פסיקה עדכנית.`,
      quote: "המשפט הוא מעוז החלש ומגן היתום.",
      tabs: [
        { title: "המסגרת הנורמטיבית", content: `בחלק זה נסקור את החוקים הרלוונטיים לנושא ${topic}. המחוקק הישראלי נתן דעתו לסוגיה זו במספר דברי חקיקה מרכזיים, אשר מתווים את הדרך המשפטית הנכונה לפעולה.` },
        { title: "פסיקה עדכנית", content: "בתי המשפט דנו בסוגיה זו לאחרונה וקבעו הלכות חדשות. חשוב להכיר את פסקי הדין המנחים כדי להבין כיצד השופטים נוטים להכריע במקרים דומים." },
        { title: "המלצות מעשיות", content: "מומלץ להיוועץ בעורך דין מומחה בטרם נקיטת פעולה. יש לאסוף את כל המסמכים הרלוונטיים ולפעול בתום לב ובשקיפות מלאה." }
      ]
  });

  try {
    const ai = getAiClient();
    
    // If no client (no key), throw immediately to catch block
    if (!ai) throw new Error("No API Key");

    const prompt = `
      Write a legal article outline for an Israeli law firm website.
      Topic: ${topic}
      Category: ${category === 'ALL' ? 'General Law' : category}
      Language: Hebrew.
      
      Structure the response as a JSON object with:
      - title: Catchy title in Hebrew
      - abstract: A short summary (2 sentences)
      - quote: A relevant legal quote or maxim in Hebrew
      - tabs: An array of 3 objects, each with 'title' (e.g., "The Law", "Case Study", "Tips") and 'content' (2 paragraphs of text).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
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
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.log("Gemini generation skipped or failed, using fallback:", error);
    // Simulate network delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 1500));
    return getMockResponse();
  }
};

export const generateImagePrompt = async (topic: string): Promise<string> => {
    return `Legal illustration for ${topic}, professional, photorealistic, 4k`;
};