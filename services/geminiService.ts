
import { GoogleGenAI, Type } from "@google/genai";
import { Article, Category } from "../types.ts";

/**
 * Generates a comprehensive legal article using Gemini AI.
 * Adheres to strict Gemini 3 Pro guidelines for complex text reasoning.
 */
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

  // Always use process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Legal article generation is a complex reasoning task.
  const model = 'gemini-3-pro-preview';

  // Fix: Improved prompt to ensure a truly professional and comprehensive legal article (300-500 words) with real value.
  const prompt = `
      You are a senior partner at a prestigious Israeli law firm.
      Task: Write a COMPREHENSIVE and PROFESSIONAL legal article in HEBREW about: "${topic}".
      
      Instructions:
      1. Length: 300-500 words of high-quality, dense information.
      2. Style: Professional legal Hebrew (עברית משפטית תקנית). Avoid fluff.
      3. Structure:
         - A catchy and professional title in Hebrew.
         - A concise abstract (3-5 sentences) summarizing the key legal point.
         - At least 3 detailed sections (tabs) covering: Legal Analysis (ניתוח משפטי), Practical Guidelines (הנחיות מעשיות), and Case Law/Examples (דוגמאות ופסיקה).
      4. Constraints: Avoid Markdown formatting (like ** or #) in the response text fields. Use plain text with newlines for paragraphs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Catchy and professional title in Hebrew",
            },
            abstract: {
              type: Type.STRING,
              description: "A 3-5 sentence summary in Hebrew",
            },
            quote: {
              type: Type.STRING,
              description: "A strong legal quote or maxim in Hebrew",
            },
            tabs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Section title" },
                  content: { type: Type.STRING, description: "Detailed section content (minimum 100 words per section)" }
                },
                required: ["title", "content"]
              },
              description: "Structured sections of the article",
            }
          },
          required: ["title", "abstract", "tabs"],
        }
      }
    });

    // Fix: Access response.text as a property, not a method.
    const jsonStr = response.text;
    if (!jsonStr) throw new Error("Received empty response from Gemini");
    
    return JSON.parse(jsonStr.trim());

  } catch (error: any) {
    console.error("Gemini generation failed:", error);
    
    // Fallback to Gemini 3 Flash for basic text tasks if Pro fails.
    try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
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
                    },
                    required: ["title", "content"]
                  }
                }
              },
              required: ["title", "abstract", "tabs"]
            }
          }
        });
        const text = fallbackResponse.text;
        return text ? JSON.parse(text.trim()) : getMockResponse("Empty fallback response");
    } catch (fallbackError: any) {
        return getMockResponse(fallbackError.message || fallbackError.toString());
    }
  }
};

export const generateImagePrompt = async (topic: string): Promise<string> => {
    return `Legal illustration for ${topic}, professional, photorealistic, 4k, cinematic lighting, corporate style`;
};
