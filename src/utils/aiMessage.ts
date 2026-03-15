import axios from "axios";

interface GenerateCardMessageOptions {
  recipientName: string;
  senderName?: string;
  occasion: string;
  relationship?: string;
  language?: string;
  tone?: string;
  variant?: number;
}

export const generateCardMessage = async ({
  recipientName,
  senderName,
  occasion,
  relationship = "Friend",
  language = "English",
  tone = "Heartfelt",
  variant = 1,
}: GenerateCardMessageOptions): Promise<string> => {
  const variantInstructions: { [key: number]: string } = {
    1: "Write it in a straightforward, sincere style.",
    2: "Write it with a slightly different angle or opening line, still matching the tone.",
    3: "Write it with a unique creative twist, still appropriate for the occasion.",
  };

  const prompt = `Write a ${tone.toLowerCase()} ${occasion} greeting card message${
    relationship ? ` from someone to their ${relationship}` : ""
  }.
Recipient's name: ${recipientName}
${senderName ? `Sender's name: ${senderName}` : ""}
Language: ${language}
Tone: ${tone}
${variantInstructions[variant]}

Rules:
- Between 40-80 words
- Do NOT include "Dear ${recipientName}" or sign-off — just the message body
- No quotation marks around the message
- Return ONLY the message text, nothing else`;

  try {
    const response = await axios.post(
      "https://ai.hackclub.com/proxy/v1/chat/completions",
      {
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HACK_CLUB_API_KEY}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`AI proxy returned status ${response.status}`);
    }

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      console.error(
        "Empty content in AI response:",
        JSON.stringify(response.data, null, 2)
      );
      throw new Error(
        "The AI model returned an empty response. Please try again."
      );
    }

    return content.trim();
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error("AI Generation Error:", errorMsg);
    throw new Error(`Failed to generate AI message: ${errorMsg}`);
  }
};
