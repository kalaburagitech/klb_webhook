import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

const MODEL = "gemini-flash-latest";

// Ask Gemini to write a social-media caption + hashtags for the given theme.
async function generateWithGemini(theme: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it with `npx convex env set GEMINI_API_KEY <key>`."
    );
  }

  const prompt =
    `You are an expert social media manager for "KalaburagiTech", a modern IT training institute and software company. ` +
    `Write ONE highly engaging social media caption about: "${theme}". ` +
    `Keep it professional, educational, and modern. Use 1-3 emojis. ` +
    `Include 5 relevant hashtags at the end, including #KalaburagiTech. ` +
    `Return ONLY the caption text itself. Do not include any meta-text, bullet points, or instructions.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Gemini API Error:", data);
    throw new Error(data.error?.message || "Unknown error from Gemini API");
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned no text");
  }
  return text;
}

// Public: used by the dashboard "Preview" button to show a sample caption.
export const previewCaption = action({
  args: { theme: v.string() },
  handler: async (_ctx, args) => {
    return await generateWithGemini(args.theme);
  },
});

// Internal: used by the auto-post cron.
export const generateCaption = internalAction({
  args: { theme: v.string() },
  handler: async (_ctx, args) => {
    return await generateWithGemini(args.theme);
  },
});

// Ask Gemini to write a highly descriptive prompt for Pollinations AI image generation
async function generateImagePromptWithGemini(theme: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it with `npx convex env set GEMINI_API_KEY <key>`."
    );
  }

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Gemini API Error:", data);
    throw new Error(data.error?.message || "Unknown error from Gemini API");
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned no text");
  }
  return text;
}

export const generateImagePrompt = internalAction({
  args: { theme: v.string() },
  handler: async (_ctx, args) => {
    return await generateImagePromptWithGemini(args.theme);
  },
});
