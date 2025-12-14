
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
      5. **IMPORTANT**: DO NOT use any Markdown formatting inside the text. NO asterisks (**), NO hashtags (#), NO bold syntax. Write plain text only.
      6. Write ONLY in Hebrew. Do not use English words or headers (like "Dos and Don'ts").

      JSON Schema:
      {
        "title": "A catchy and professional title in Hebrew",
        "abstract": "A 3-5 sentence summary (abstract) in Hebrew",
        "quote": "A strong legal quote or saying in Hebrew related to the topic",
        "tabs": [
           { 
             "title": "The Legal Framework (המסגרת המשפטית)", 
             "content": "Detailed explanation of the law, rationale, and rights/duties. Plain text only." 
           },
           { 
             "title": "Real Life Examples (דוגמאות מהחיים)", 
             "content": "2-3 hypothetical scenarios illustrating the law. Focus on dilemmas and solutions. Plain text only." 
           },
           { 
             "title": "Practical Guide (המדריך המעשי)", 
             "content": "A list of recommendations or steps to take. What to do and what to avoid. Plain text only." 
           }
        ]
      }
  `;

  const config = {
    // Switching to text MIME type with manual parsing is often more reliable for complex nested structures on Flash models
    // than strict responseSchema which can be flaky with arrays.
    responseMimeType: "text/plain", 
  };

  const cleanText = (text: string) => {
      if (!text) return "";
      // Remove Markdown artifacts: **, ##, __
      return text.replace(/\*\*/g, '').replace(/##/g, '').replace(/__/g, '').replace(/`/g, '');
  };

  const parseResponse = (response: any) => {
      if (response.text) {
        let rawText = response.text.trim();
        // Aggressively clean up markdown code blocks if the model ignores the instruction
        rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        try {
            const json = JSON.parse(rawText);
            
            // Validate Structure & Clean Content
            if (!json.title || !json.abstract) throw new Error("Missing title or abstract");
            
            // Clean top level fields
            json.title = cleanText(json.title);
            json.abstract = cleanText(json.abstract);
            if (json.quote) json.quote = cleanText(json.quote);

            if (!Array.isArray(json.tabs) || json.tabs.length === 0) {
                // If tabs are missing, auto-generate them from any other properties
                json.tabs = [
                    { title: "סקירה כללית", content: cleanText(json.content || json.body || json.text || "תוכן המאמר לא נוצר כראוי.") }
                ];
            } else {
                // Clean tabs content
                json.tabs = json.tabs.map((tab: any) => ({
                    title: cleanText(tab.title),
                    content: cleanText(tab.content)
                }));
            }
            return json;
        } catch (e) {
            console.error("JSON Parse Error:", rawText);
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
