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
        { title: "הסבר משפטי", content: `בחלק זה נסקור את העקרונות הרלוונטיים לנושא ${topic} בצורה בהירה ומקצועית. (תוכן דמו).` },
        { title: "דוגמאות מהחיים", content: "מקרה שהיה: בני זוג שלא ערכו הסכם ונאלצו להתמודד עם..." },
        { title: "מה חשוב לרשום", content: "• סעיף ראשון חשוב\n• סעיף שני חשוב" }
      ]
  });

  try {
    const ai = getAiClient(apiKey);
    
    // If no client (no key), throw immediately to catch block
    if (!ai) throw new Error("No API Key Provided");

    const prompt = `
      You are a top-tier, sharp, and charismatic Israeli attorney (עורך דין תותח, כריזמטי ומקצועי).
      Your task is to write a powerful legal article in Hebrew about: "${topic}".

      Category Context: ${category === 'ALL' ? 'General Law' : category}

      CRITICAL INSTRUCTIONS:
      1.  **Expert Tone:** Write with confidence and authority. Be sharp. Explain the logic, not just the rules.
      2.  **NO Law Citations:** Do NOT cite specific section numbers (e.g., do NOT write "According to Section 8(a) of the Inheritance Law"). Instead, explain the *principle* ("The law determines that..."). Keep it readable.
      3.  **Mandatory Examples Tab:** You MUST include a tab with real-life scenarios/examples (stories of what happens when things go wrong vs right).
      4.  **Practical Checklist:** The final tab must be actionable points for the client.

      Structure the response as a JSON object with:
      - title: A sharp, professional title in Hebrew.
      - abstract: A punchy summary (3-4 sentences) that makes the reader realize they need to act.
      - quote: A powerful, sophisticated sentence/motto related to the topic (in Hebrew).
      - tabs: An array of exactly 3 objects with these specific titles:
        - Tab 1 Title: "הסבר משפטי" (Legal Explanation). Content: The core legal argument. Why is this important? What is the logic? (No dry statute numbers).
        - Tab 2 Title: "דוגמאות מהחיים" (Real Life Examples). Content: "Imagine a case where..." or "A common mistake is...". Concrete stories illustrating definitions (like Yeduim BeTzibur) or conflicts.
        - Tab 3 Title: "מה חשוב לרשום" (What to Include). Content: A bulleted list (•) of essential clauses or actions.
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