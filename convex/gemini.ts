import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

const MODEL = "gemini-flash-latest";

async function generateWithGemini(config: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");

  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

async function generateImagePromptWithGemini(theme: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt =
    `You write highly descriptive image generation prompts for an IT company. ` +
    `Theme: "${theme}". ` +
    `Write ONE highly detailed visual description of an image for this theme. ` +
    `CRITICAL RULES: ` +
    `1. The style MUST be sleek, modern, 3D corporate technology illustration (like high-end SaaS graphics). ` +
    `2. Focus on computers, code, glowing tech elements, futuristic offices, or abstract technology. ` +
    `3. DO NOT include traditional or cultural human figures. Only modern tech professionals or abstract tech elements. ` +
    `4. DO NOT include any text, typography, letters, or words in the image. ` +
    `Keep it under 40 words. Return ONLY the description.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");

  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

export const previewCaption = action({
  args: { config: v.any() },
  handler: async (_ctx, args) => {
    return await generateWithGemini(args.config);
  },
});

export const generateCaption = internalAction({
  args: { config: v.any() },
  handler: async (_ctx, args) => {
    return await generateWithGemini(args.config);
  },
});

export const generateImagePrompt = internalAction({
  args: { theme: v.string() },
  handler: async (_ctx, args) => {
    return await generateImagePromptWithGemini(args.theme);
  },
});

export const generateImage = internalAction({
  args: { caption: v.string() },
  handler: async (_ctx, args) => {
    return args.caption;
  },
});
