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
    `You write social media posts for "KalaburagiTech", a tech company/IT training institute in Kalaburagi, India. ` +
    `Topic/theme: "${theme}". ` +
    `Write ONE engaging post caption for Facebook and Instagram. ` +
    `Keep it under 60 words, friendly and professional, use 1-3 relevant emojis. ` +
    `End with 5-8 relevant hashtags on their own line (always include #KalaburagiTech). ` +
    `Return ONLY the caption text, no preamble, no quotes, no markdown.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.0, maxOutputTokens: 400 },
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
    `You write highly descriptive image generation prompts. ` +
    `Topic/theme: "${theme}". ` +
    `Write ONE highly detailed, visual description of an image that represents this theme. ` +
    `Include lighting, style (e.g. 3D render, sleek, modern), colors, and composition. ` +
    `IMPORTANT: DO NOT include any text, typography, letters, or words in the image description. The image must be purely visual/illustrative without any written text. ` +
    `Keep it under 40 words. ` +
    `Return ONLY the description text, no preamble, no quotes, no markdown.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.0, maxOutputTokens: 200 },
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
