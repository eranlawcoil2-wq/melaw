
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

  const prompt = `
      You are a senior partner at a top Israeli law firm.
      Task: Write a comprehensive legal article in HEBREW about: "${topic}".
      The content must be professional, authoritative, and structured for digital display.
      
      Instructions:
      1. Use professional legal Hebrew (עברית משפטית תקנית).
      2. Provide detailed and meaningful content for each section.
      3. Avoid Markdown formatting like asterisks or hashtags in the text fields.
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
              description: "A strong legal quote in Hebrew",
            },
            tabs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
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
