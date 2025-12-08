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
      You are an expert, senior Israeli attorney (עורך דין בכיר בישראל) specializing in Family Law, Inheritance, Real Estate, and Torts.
      Your task is to write a high-quality, comprehensive, and persuasive legal article in Hebrew about: "${topic}".

      Category Context: ${category === 'ALL' ? 'General Law' : category}

      CRITICAL INSTRUCTIONS:
      1.  **Real Legal Content:** Do NOT write "consult a lawyer" as the main content. Write the ACTUAL legal explanation.
      2.  **Definitions:** Explain clearly who falls under this definition (e.g., if the topic is "Common Law Partners/Yeduim BeTzibur", explain the legal criteria: joint household, financial interdependence, living together).
      3.  **Conflicts & Precedents:** Describe REAL conflicts that happen when people don't take action. Mention what happens in court (e.g., family fighting over assets, disinheritance of partners).
      4.  **Actionable Advice:** Provide a bulleted list of exactly what needs to be written in the legal document/will.

      Structure the response as a JSON object with:
      - title: Professional and catchy title in Hebrew.
      - abstract: A compelling summary (3-4 sentences) explaining why this topic is critical and risky if ignored.
      - quote: A powerful sentence regarding the importance of planning ahead (in Hebrew).
      - tabs: An array of exactly 3 objects with specific keys:
        - Tab 1 Title: "הגדרה וחוק" (Definitions & Law). Content: Detailed legal explanation, criteria, and reference to Israeli laws (Law of Inheritance, etc).
        - Tab 2 Title: "סכסוכים נפוצים" (Common Conflicts). Content: Explain the risks. Stories of cases where things went wrong because there was no will/agreement.
        - Tab 3 Title: "מה חשוב לרשום?" (What to Include). Content: A practical guide/checklist. Use bullet points (•) for the list.
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
    return `Legal illustration for ${topic}, professional, photorealistic, 4k, cinematic lighting, corporate style`;
};