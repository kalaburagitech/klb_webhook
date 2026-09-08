import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Use the OpenAI key from Convex Environment Variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Generate a caption using GPT-4o-mini
async function generateWithOpenAI(config: any): Promise<string> {
  const theme = config.theme || "Daily tech tips";
  const hook = config.reelHook ? `Start with this specific hook: "${config.reelHook}". ` : "";
  const companyName = config.companyName || "KalaburagiTech";
  
  const prompt =
    `You are an expert social media manager for "${companyName}". ` +
    `Write ONE highly engaging social media caption about: "${theme}". ` +
    hook +
    `Keep it professional, educational, and modern. Use 1-3 emojis. ` +
    `Include 5 relevant hashtags at the end, including #${companyName.replace(/\s+/g, "")}. ` +
    `Return ONLY the caption text itself. Do not include any meta-text, bullet points, or instructions. ` +
    `At the very end of the caption, ALWAYS append EXACTLY this contact information: \n\n` +
    `🏢 ${companyName}\n` +
    (config.website ? `🌐 ${config.website}\n` : `🌐 https://kalaburagitech.com/\n`) +
    (config.mobile ? `📱 ${config.mobile}\n` : `📱 9880020224\n`) +
    (config.email ? `✉️ ${config.email}` : `✉️ kalaburagitech@gmail.com`);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 400
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("OpenAI API Error:", data);
    throw new Error(data.error?.message || "Unknown error from OpenAI API");
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned no text");
  }
  return text;
}

// Generate an image using DALL-E 3
async function generateImageWithOpenAI(caption: string): Promise<string> {
  const prompt = 
    `Create a premium, modern, sleek 3D corporate technology illustration. ` +
    `Theme: ${caption.substring(0, 500)}. ` +
    `Focus on computers, code, glowing tech elements, futuristic offices, or abstract technology. ` +
    `DO NOT include any text, typography, letters, or words in the image. No people.`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("OpenAI DALL-E Error:", data);
    throw new Error(data.error?.message || "Unknown error from DALL-E API");
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data");
  }
  return b64;
}

export const previewCaption = action({
  args: { config: v.any() },
  handler: async (_ctx, args) => {
    return await generateWithOpenAI(args.config);
  },
});

export const generateCaption = internalAction({
  args: { config: v.any() },
  handler: async (_ctx, args) => {
    return await generateWithOpenAI(args.config);
  },
});

export const generateImagePrompt = internalAction({
  args: { theme: v.string() },
  handler: async (_ctx, args) => {
    return args.theme;
  },
});

export const generateImage = internalAction({
  args: { caption: v.string() },
  handler: async (_ctx, args) => {
    return await generateImageWithOpenAI(args.caption);
  },
});
