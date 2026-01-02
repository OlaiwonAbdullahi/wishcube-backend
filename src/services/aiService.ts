import { env } from "../config/env";

interface GreetingParams {
  occasion: string;
  recipientName?: string;
  senderName?: string;
  relationship?: string;
  tone?: "formal" | "casual" | "romantic" | "funny";
  additionalContext?: string;
}

interface DesignSuggestion {
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  accentColor: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * Generate greeting message using Google Gemini AI
 */
export const generateGreeting = async (
  params: GreetingParams
): Promise<string> => {
  try {
    const {
      occasion,
      recipientName,
      senderName,
      relationship,
      tone = "casual",
      additionalContext,
    } = params;

    const prompt = `Generate a heartfelt ${tone} greeting message for ${occasion}. 
${recipientName ? `The recipient's name is ${recipientName}.` : ""}
${senderName ? `The sender's name is ${senderName}.` : ""}
${relationship ? `Their relationship is: ${relationship}.` : ""}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Keep the message warm, sincere, and between 50-150 words. Do not include any formatting markers or quotation marks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No content generated");
    }

    return generatedText.trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fallback to a simple template
    return generateFallbackGreeting(params);
  }
};

/**
 * Generate design suggestions based on occasion
 */
export const suggestDesign = async (
  occasion: string
): Promise<DesignSuggestion> => {
  try {
    const prompt = `For a ${occasion} greeting card, suggest a color scheme. Respond ONLY with a JSON object in this exact format, no other text:
{"backgroundColor": "#hexcode", "textColor": "#hexcode", "fontFamily": "font name", "accentColor": "#hexcode"}

Choose colors that are beautiful, harmonious, and appropriate for ${occasion}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No content generated");
    }

    // Extract JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("Could not parse design suggestion");
  } catch (error) {
    console.error("Design suggestion error:", error);
    // Return fallback design
    return getOccasionDesign(occasion);
  }
};

/**
 * Get personalized content recommendations
 */
export const getRecommendations = async (
  occasion: string,
  userHistory?: { occasions: string[]; themes: string[] }
): Promise<string[]> => {
  try {
    const historyContext = userHistory
      ? `The user has previously created cards for: ${userHistory.occasions.join(
          ", "
        )}. They prefer themes like: ${userHistory.themes.join(", ")}.`
      : "";

    const prompt = `Suggest 5 creative ideas for a ${occasion} greeting card or mini-website. ${historyContext}
    
Respond with a JSON array of strings, each containing a brief creative suggestion. Example format:
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No content generated");
    }

    // Extract JSON array from response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("Could not parse recommendations");
  } catch (error) {
    console.error("Recommendations error:", error);
    // Return fallback recommendations
    return getFallbackRecommendations(occasion);
  }
};

// Fallback functions
function generateFallbackGreeting(params: GreetingParams): string {
  const { occasion, recipientName, senderName } = params;
  const templates: Record<string, string[]> = {
    birthday: [
      `Wishing you the happiest of birthdays! May this special day bring you endless joy and wonderful memories.`,
      `Happy Birthday! May all your dreams come true this year. You deserve all the happiness in the world!`,
    ],
    anniversary: [
      `Congratulations on another beautiful year together! Wishing you continued love and happiness.`,
      `Happy Anniversary! Your love story is truly inspiring. Here's to many more wonderful years!`,
    ],
    wedding: [
      `Congratulations on your wedding day! Wishing you a lifetime of love, laughter, and happiness together.`,
    ],
    graduation: [
      `Congratulations on your graduation! Your hard work and dedication have paid off. The future is bright!`,
    ],
    default: [
      `Sending you warm wishes and love. May your day be filled with joy and special moments.`,
    ],
  };

  const occasionTemplates =
    templates[occasion.toLowerCase()] || templates.default;
  let message =
    occasionTemplates[Math.floor(Math.random() * occasionTemplates.length)];

  if (recipientName) {
    message = `Dear ${recipientName},\n\n${message}`;
  }
  if (senderName) {
    message = `${message}\n\nWith love,\n${senderName}`;
  }

  return message;
}

function getOccasionDesign(occasion: string): DesignSuggestion {
  const designs: Record<string, DesignSuggestion> = {
    birthday: {
      backgroundColor: "#FFF0F5",
      textColor: "#4A1942",
      fontFamily: "Playfair Display",
      accentColor: "#FF69B4",
    },
    anniversary: {
      backgroundColor: "#FDF5E6",
      textColor: "#8B4513",
      fontFamily: "Cormorant Garamond",
      accentColor: "#DAA520",
    },
    wedding: {
      backgroundColor: "#FFFAF0",
      textColor: "#2F4F4F",
      fontFamily: "Great Vibes",
      accentColor: "#C9A227",
    },
    graduation: {
      backgroundColor: "#F0F8FF",
      textColor: "#191970",
      fontFamily: "Lora",
      accentColor: "#4169E1",
    },
    default: {
      backgroundColor: "#F5F5F5",
      textColor: "#333333",
      fontFamily: "Open Sans",
      accentColor: "#6366F1",
    },
  };

  return designs[occasion.toLowerCase()] || designs.default;
}

function getFallbackRecommendations(occasion: string): string[] {
  const recommendations: Record<string, string[]> = {
    birthday: [
      "Add a photo slideshow of memorable moments together",
      "Include a countdown timer to the birthday",
      "Add a virtual gift box with surprise animations",
      "Create an interactive birthday quiz about the celebrant",
      "Add a guest message wall where friends can leave wishes",
    ],
    wedding: [
      "Create a timeline of your love story",
      "Add an RSVP section for guests",
      "Include a photo gallery of your journey together",
      "Add a gift registry section",
      "Include venue details with an interactive map",
    ],
    default: [
      "Add personalized photos and memories",
      "Include a heartfelt video message",
      "Create an interactive photo gallery",
      "Add background music that matches the mood",
      "Include a gift voucher for a special treat",
    ],
  };

  return recommendations[occasion.toLowerCase()] || recommendations.default;
}
