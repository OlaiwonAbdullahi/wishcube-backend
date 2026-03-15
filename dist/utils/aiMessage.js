"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCardMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const generateCardMessage = async ({ recipientName, senderName, occasion, relationship = "Friend", language = "English", tone = "Heartfelt", variant = 1, }) => {
    const variantInstructions = {
        1: "Write it in a straightforward, sincere style.",
        2: "Write it with a slightly different angle or opening line, still matching the tone.",
        3: "Write it with a unique creative twist, still appropriate for the occasion.",
    };
    const prompt = `Write a ${tone.toLowerCase()} ${occasion} greeting card message${relationship ? ` from someone to their ${relationship}` : ""}.
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
        const response = await axios_1.default.post("https://ai.hackclub.com/proxy/v1/chat/completions", {
            model: "openai/gpt-5-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
        }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.HACK_CLUB_API_KEY}`,
            },
        });
        if (response.status !== 200) {
            throw new Error("AI generation failed");
        }
        return response.data.choices[0].message.content.trim();
    }
    catch (error) {
        console.error("AI Generation Error:", error.response?.data || error.message);
        throw new Error("Failed to generate AI message");
    }
};
exports.generateCardMessage = generateCardMessage;
