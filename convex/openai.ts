import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const CHAT_MODEL = "gpt-4o-mini";
const IMAGE_MODEL = "gpt-image-1";

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Run: npx convex env set OPENAI_API_KEY sk-..."
    );
  }
  return key;
}

// Branding pulled from the Auto-Post settings, with the existing defaults.
function brand(config: any) {
  return {
    name: config?.companyName || "KalaburagiTech",
    website: config?.website || "https://kalaburagitech.com/",
    mobile: config?.mobile || "9880020224",
    email: config?.email || "kalaburagitech@gmail.com",
  };
}

async function chat(prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: maxTokens,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "OpenAI chat error");

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned no caption text");
  return text;
}

export const generateCaption = internalAction({
  args: { config: v.any() },
  handler: async (_ctx, args) => {
    const b = brand(args.config);
    const theme = args.config?.theme || "Daily tech tips";

    // Hooks are free text and people paste whole content calendars in. Feeding
    // 1000+ chars in verbatim makes the model answer with a content plan (often
    // JSON) instead of a caption, so only the opening line is used as the hook.
    const rawHook: string = args.config?.reelHook?.trim() || "";
    const hook = rawHook
      ? `Use this as the inspiration for your opening line: "${rawHook.slice(0, 180)}". `
      : "";

    const caption = await chat(
      `You are an expert social media manager for "${b.name}". ` +
        `Write ONE highly engaging social media caption about: "${theme}". ` +
        hook +
        `Keep it professional, educational and modern, and under 80 words. ` +
        `Use 1-3 emojis. ` +
        `End with 5 relevant hashtags including #${b.name.replace(/\s+/g, "")}. ` +
        `Return ONLY the caption as plain text. Never return JSON, never return ` +
        `a list of days or topics, never wrap it in quotes or code fences.`,
      600
    );

    // Themes get pasted in from other tools and carry template syntax like
    // {{dayNumber}}. Nothing unresolved should ever reach a published post.
    const clean = caption
      .replace(/\{\{[^}]*\}\}/g, "")
      .replace(/ {2,}/g, " ")
      .trim();

    // Contact block is appended in code, not asked of the model, so it is never
    // paraphrased, truncated or hallucinated.
    return (
      `${clean}\n\n` +
      `🏢 ${b.name}\n` +
      `🌐 ${b.website}\n` +
      `📱 ${b.mobile}\n` +
      `✉️ ${b.email}`
    );
  },
});

export const generateImage = internalAction({
  args: { theme: v.string(), config: v.any() },
  handler: async (_ctx, args): Promise<string> => {
    const b = brand(args.config);
    const logoUrl = args.config?.staticLogoUrl;

    const prompt =
      `A sleek, modern 3D corporate technology advertisement for an IT company. ` +
      `Subject: ${args.theme}. ` +
      `Style: high-end SaaS marketing graphic — glowing tech elements, code, ` +
      `futuristic office or abstract technology. Clean composition with empty ` +
      `space reserved for text. ` +
      (logoUrl
        ? `Place the provided company logo prominently in the top-left corner, ` +
          `preserving its exact colours and shape. `
        : "") +
      // The phone number is deliberately NOT rendered into the image: image
      // models drop digits from long numbers (9880020224 came out as 988002024)
      // and a wrong number on a live ad is worse than no number. It is appended
      // exactly, in code, to every caption instead.
      `Render this text in the image with bold, clean, perfectly spelled typography: ` +
      `"${b.name}" as the headline, and "${b.website}" as a footer. ` +
      `The footer must sit on a flat horizontal bar across the bottom — perfectly ` +
      `level, face-on, not skewed into perspective, and with clear margin so no ` +
      `letter is cropped by the frame edge. ` +
      `No other text anywhere in the image. Do not invent any phone number.`;

    let res: Response;

    if (logoUrl) {
      // Feed the real logo in as a reference so the ad carries the actual mark
      // instead of an AI impression of it.
      const logoRes = await fetch(logoUrl);
      if (!logoRes.ok) throw new Error("Could not download the uploaded company logo");

      const form = new FormData();
      form.append("model", IMAGE_MODEL);
      form.append("prompt", prompt);
      form.append("size", "1024x1024");
      form.append("output_format", "jpeg");
      form.append("image[]", await logoRes.blob(), "logo.png");

      res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey()}` },
        body: form,
      });
    } else {
      res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey()}`,
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt,
          size: "1024x1024",
          output_format: "jpeg", // Instagram rejects PNG containers
          n: 1,
        }),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI image error");

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image data");
    return b64;
  },
});
