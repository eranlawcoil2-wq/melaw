import { GoogleGenAI, Type } from "@google/genai";
import { Article, Category } from "../types.ts";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateArticleContent = async (topic: string, category: Category): Promise<Partial<Article>> => {
  try {
    const ai = getAiClient();
    const prompt = `
      Write a legal article outline for an Israeli law firm website.
      Topic: ${topic}
      Category: ${category}
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
    console.error("Gemini generation failed", error);
    // Fallback for demo purposes if API fails
    return {
      title: topic,
      abstract: "תוכן גנרי שנוצר עקב שגיאה בתקשורת עם ה-AI.",
      quote: "הצדק חייב לא רק להיעשות, אלא גם להיראות.",
      tabs: [
        { title: "מידע כללי", content: "אנא נסה שנית מאוחר יותר." }
      ]
    };
  }
};

export const generateImagePrompt = async (topic: string): Promise<string> => {
    // In a real scenario with Imagen, we would generate the image bytes.
    // Here we generate a prompt to simulate or use with an image placeholder service if needed,
    // or if we had the Imagen model enabled we would call it here.
    // For this implementation, we will stick to text generation or use high quality placeholders.
    return `Legal illustration for ${topic}, professional, photorealistic, 4k`;
};