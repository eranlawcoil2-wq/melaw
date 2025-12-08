import { GoogleGenAI, Type } from "@google/genai";
import { Article, Category } from "../types.ts";

// Updated to accept key as parameter instead of relying on process.env
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
      abstract: `זהו תקציר שנוצר אוטומטית (מצב דמו) עבור הנושא: "${topic}". כדי לקבל תוכן אמיתי, אנא הזן מפתח API של Gemini בממשק הניהול.`,
      quote: "המשפט הוא מעוז החלש ומגן היתום.",
      tabs: [
        { title: "ניתוח משפטי", content: `בחלק זה נסקור את העקרונות הרלוונטיים לנושא ${topic} בצורה בהירה ומקצועית. (תוכן דמו).` },
        { title: "סיפור מקרה", content: "מקרה שהיה: בני זוג שלא ערכו הסכם ונאלצו להתמודד עם..." },
        { title: "המלצות", content: "• סעיף ראשון חשוב\n• סעיף שני חשוב" }
      ]
  });

  // If no key provided, return mock immediately without error
  if (!apiKey || apiKey === 'demo') {
      return getMockResponse();
  }

  try {
    const ai = getAiClient(apiKey);
    
    if (!ai) throw new Error("Could not initialize Gemini Client");

    const prompt = `
      You are an elite, Senior Partner Israeli Attorney (עורך דין בכיר, כריזמטי וחד).
      Your task: Write a premium, high-level legal article in Hebrew about: "${topic}".
      
      Category Context: ${category === 'ALL' ? 'General Israeli Law' : category}

      **INSTRUCTIONS FOR "GEMINI-QUALITY" OUTPUT:**
      1.  **Tone:** Sophisticated, persuasive, and fluent. Avoid robotic or repetitive phrasing. Use rich Hebrew (שפה עשירה ומקצועית) but make it accessible to clients.
      2.  **Depth:** Do not just list facts. Explain the *strategy*, the *risks*, and the *implications* of the law.
      3.  **Realism:** In the "Case Study" tab, write a detailed, plausible narrative with names and specific conflicts. Make the reader feel the drama and the resolution.
      4.  **Structure**:
          - **Abstract**: A powerful hook (3-5 sentences) that explains why this topic is critical *right now*.
          - **Tab 1 Title MUST be "ניתוח משפטי"**: Deep dive into the legal principles. Explain the logic behind the law.
          - **Tab 2 Title MUST be "סיפור מקרה"**: A real-world story illustrating what happens when you don't act correctly.
          - **Tab 3 Title MUST be "המלצות"**: Concrete, actionable steps (Checklist).

      Output MUST be a valid JSON object matching the schema below.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Changed to 2.5-flash for better stability and JSON performance
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
  } catch (error: any) {
    console.error("Gemini Generation Failed:", error);
    // We THROW the error here so the UI knows it failed, instead of silently showing mock data.
    // This answers the user's complaint about "why is it not writing for real".
    throw new Error(error.message || "Failed to generate content");
  }
};

export const generateImagePrompt = async (topic: string): Promise<string> => {
    return `Legal illustration for ${topic}, professional, photorealistic, 4k, cinematic lighting, corporate style`;
};