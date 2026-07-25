import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

const MODEL = "gemini-flash-latest";
const IMAGE_MODEL = "gemini-2.5-flash-image";

// Strip meta-text Gemini sometimes wraps around the caption (labels, markdown, quotes).
function cleanCaption(raw: string): string {
  let text = raw.trim();
  // Remove leading labels like "Caption:", "Text:**", "**Caption:**", etc.
  text = text.replace(/^\**\s*(caption|text|output|post)\s*:\**\s*/i, "");
  // Remove surrounding straight/smart quotes if the whole thing is quoted.
  text = text.replace(/^["'“”]+/, "").replace(/["'“”]+$/, "");
  return text.trim();
}

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
      generationConfig: {
        temperature: 0.8,
        // Generous budget so the caption never truncates (this model may spend
        // some tokens on internal reasoning before producing the caption).
        maxOutputTokens: 2048,
      },
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
  return cleanCaption(text);
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
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
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

// Generate an actual IMAGE with Gemini (gemini-2.5-flash-image / "Nano Banana").
// Returns the raw image bytes as base64 + mime type so the caller can upload it.
async function generateImageWithGemini(
  prompt: string
): Promise<{ data: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it with `npx convex env set GEMINI_API_KEY <key>`."
    );
  }

  // Follow the user's prompt for style; only enforce square framing + no text.
  const fullPrompt =
    `Create a 1:1 square social media image. ` +
    `${prompt}. ` +
    `Do NOT include any text, letters, words, logos, or watermarks in the image.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Gemini Image API Error:", data);
    throw new Error(data.error?.message || "Unknown error from Gemini image API");
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  if (!imagePart) {
    console.error("Gemini image response had no image part:", JSON.stringify(data).slice(0, 500));
    throw new Error("Gemini did not return an image. Check that the API key has access to gemini-2.5-flash-image.");
  }

  return {
    data: imagePart.inlineData.data as string,
    mimeType: (imagePart.inlineData.mimeType as string) || "image/png",
  };
}

export const generateImage = internalAction({
  args: { prompt: v.string() },
  handler: async (_ctx, args) => {
    return await generateImageWithGemini(args.prompt);
  },
});
