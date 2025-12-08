import { GoogleGenAI, Type } from "@google/genai";
import { Article, Category } from "../types.ts";

// Updated to accept key as parameter instead of relying on process.env
const getAiClient = (apiKey: string) => {
  try {
    if (!apiKey) {
      console.warn("API Key is missing.");
      return null;
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Failed to initialize AI client", e);
    return null;
  }
};

export const generateArticleContent = async (topic: string, category: Category | 'ALL', apiKey: string): Promise<Partial<Article>> => {
  // Mock response generator for fallback
  const getMockResponse = () => ({
      title: topic,
      abstract: `זהו תקציר שנוצר אוטומטית (מצב דמו) עבור הנושא: "${topic}". כדי לקבל תוכן אמיתי, אנא הזן מפתח API של Gemini בממשק הניהול.`,
      quote: "המשפט הוא מעוז החלש ומגן היתום.",
      tabs: [
        { title: "המסגרת הנורמטיבית", content: `בחלק זה נסקור את החוקים הרלוונטיים לנושא ${topic}. (תוכן זה הוא דוגמה בלבד מכיוון שלא הוזן מפתח API תקין).` },
        { title: "פסיקה עדכנית", content: "בתי המשפט דנו בסוגיה זו לאחרונה וקבעו הלכות חדשות. חשוב להכיר את פסקי הדין המנחים." },
        { title: "המלצות מעשיות", content: "מומלץ להיוועץ בעורך דין מומחה בטרם נקיטת פעולה." }
      ]
  });

  try {
    const ai = getAiClient(apiKey);
    
    // If no client (no key), throw immediately to catch block
    if (!ai) throw new Error("No API Key Provided");

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