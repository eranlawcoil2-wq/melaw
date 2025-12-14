
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

  // Validation
  if (!apiKey || apiKey.trim() === '') {
      throw new Error("חסר מפתח API. אנא הגדר מפתח Gemini בלוח הבקרה בלשונית 'חיבורים'.");
  }

  const ai = getAiClient(apiKey);
  if (!ai) {
      throw new Error("שגיאה באתחול מנוע ה-AI.");
  }

  // --- STRICT JSON PROMPT FOR ROBUSTNESS ---
  const prompt = `
      You are a senior partner at a top Israeli law firm.
      Task: Write a comprehensive legal article in HEBREW about: "${topic}".
      
      CRITICAL INSTRUCTIONS:
      1. RETURN RAW JSON ONLY. NO MARKDOWN. NO CODE BLOCKS.
      2. The output MUST follow the exact schema below.
      3. The "content" fields must be long, detailed, and professional (at least 200 words per tab).
      4. Use professional legal Hebrew (עברית משפטית תקנית).

      JSON Schema:
      {
        "title": "A catchy and professional title in Hebrew",
        "abstract": "A 3-5 sentence summary (abstract) in Hebrew",
        "quote": "A strong legal quote or saying in Hebrew related to the topic",
        "tabs": [
           { 
             "title": "The Legal Framework (המסגרת המשפטית)", 
             "content": "Detailed explanation of the law, rationale, and rights/duties. Do not just list sections, explain the meaning." 
           },
           { 
             "title": "Real Life Examples (דוגמאות מהחיים)", 
             "content": "2-3 hypothetical scenarios illustrating the law. Focus on dilemmas and solutions." 
           },
           { 
             "title": "Practical Guide (המדריך המעשי)", 
             "content": "A checklist of recommendations or steps to take. What to do and what to avoid." 
           }
        ]
      }
  `;

  const config = {
    // Switching to text MIME type with manual parsing is often more reliable for complex nested structures on Flash models
    // than strict responseSchema which can be flaky with arrays.
    responseMimeType: "text/plain", 
  };

  const parseResponse = (response: any) => {
      if (response.text) {
        let cleanText = response.text.trim();
        // Aggressively clean up markdown code blocks if the model ignores the instruction
        cleanText = cleanText.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        try {
            const json = JSON.parse(cleanText);
            
            // Validate Structure
            if (!json.title || !json.abstract) throw new Error("Missing title or abstract");
            if (!Array.isArray(json.tabs) || json.tabs.length === 0) {
                // If tabs are missing, auto-generate them from any other properties
                json.tabs = [
                    { title: "סקירה כללית", content: json.content || json.body || json.text || "תוכן המאמר לא נוצר כראוי." }
                ];
            }
            return json;
        } catch (e) {
            console.error("JSON Parse Error:", cleanText);
            throw new Error("המודל החזיר תשובה שאינה בפורמט תקין.");
        }
      }
      throw new Error("התקבלה תשובה ריקה מהמודל.");
  };

  // TRY MODELS SEQUENTIALLY
  try {
    // Attempt 1: Gemini 2.5 Flash (Latest)
    console.log("Trying gemini-2.5-flash...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: config
    });
    return parseResponse(response);

  } catch (error: any) {
    console.warn("gemini-2.5-flash failed:", error);
    
    // Attempt 2: Gemini 2.0 Flash (Fallback)
    try {
        console.log("Trying fallback to gemini-2.0-flash...");
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: config
        });
        return parseResponse(response);
    } catch (fallbackError: any) {
        console.error("All models failed:", fallbackError);
        
        let msg = fallbackError.message || fallbackError.toString();
        if (msg.includes('400')) msg = "שגיאת בקשה (400). ייתכן שהמודל לא זמין באזורך.";
        if (msg.includes('403')) msg = "אין הרשאה (403). בדוק את מפתח ה-API.";
        
        return getMockResponse(msg);
    }
  }
};

export const generateImagePrompt = async (topic: string): Promise<string> => {
    return `Legal illustration for ${topic}, professional, photorealistic, 4k, cinematic lighting, corporate style`;
};
