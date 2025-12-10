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