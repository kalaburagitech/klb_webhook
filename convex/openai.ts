import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// The brief is the brain of the whole post, so it gets a real model. Overridable
// because the custom gateway does not carry every model name.
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o";
const IMAGE_MODEL = "gpt-image-1";

// Pulled from kalaburagitech.com itself: #F97316 is the accent used 280 times
// across the homepage, #0B1220 is the site's own dark theme-color. Letting the
// model pick a fresh accent per post is what made the feed look like six
// different companies.
const BRAND_ACCENT = "#F97316";
const BRAND_BG = "#0B1220";

// What the company actually builds, per its own services page. Keeps the topic
// picker from advertising work they do not sell.
const CAPABILITIES =
  "custom software, web apps and PWAs (MERN: MongoDB, Express, React, Node), " +
  "Android and iOS apps (React Native), cloud and infrastructure (AWS, Azure), " +
  "cybersecurity and data protection, AI and machine learning, real-time " +
  "systems and automation (GPS tracking, face recognition), IT consulting, and " +
  "final-year projects for engineering colleges";

// Already shipped. Named so the topic picker stays near proven ground and the
// captions can speak from experience rather than aspiration.
const SHIPPED =
  "a School Bus Tracker with live GPS, face-recognition access control, and " +
  "the MLH Spoken English learning platform";

// One concrete buildable thing per post. The cursor walks this list so a single
// audience never gets two days in a row, and student and client work alternate.
const SEGMENTS = [
  {
    key: "student-project",
    audience: "student",
    want:
      "ONE final-year engineering project a student would actually build, demo " +
      "and defend in a viva. Name the system exactly, e.g. 'Real-Time Bus " +
      "Location Tracking System', 'Driver Drowsiness Detection', 'Smart Attendance " +
      "with Face Recognition'.",
  },
  {
    key: "client-website",
    audience: "client",
    want:
      "ONE website a local business owner is searching for right now. Name the " +
      "business type AND the one feature that sells it, e.g. 'Restaurant Website " +
      "with Online Table Booking', 'Gym Website with Membership Payments', " +
      "'Real Estate Site with Map Search'.",
  },
  {
    key: "ai-ml",
    audience: "student",
    want:
      "ONE applied AI/ML build with a real dataset and a measurable outcome, " +
      "e.g. 'Crop Disease Detection from Leaf Photos', 'Resume Screening with NLP'.",
  },
  {
    key: "mobile-app",
    audience: "client",
    want:
      "ONE mobile app a local business or small startup would pay to have built, " +
      "e.g. 'Clinic Appointment App with WhatsApp Reminders', 'Delivery Tracking " +
      "App for a Kirana Store'.",
  },
  {
    key: "trending-tech",
    audience: "student",
    want:
      "ONE technology students are searching for this month, plus the small " +
      "working thing they could build with it in a weekend.",
  },
];

// Each layout is a literal drawing instruction. `for` keeps client posts off the
// viva-slide layouts and student posts off the sales-mockup ones.
const LAYOUTS: Record<string, { for: "student" | "client" | "both"; draw: string }> = {
  architecture: {
    for: "student",
    draw:
      "A full system-architecture diagram, the hero of the poster: labelled " +
      "rectangular nodes joined by thin glowing connector lines with arrowheads, " +
      "arranged in tiers — devices/sensors on top, API and processing in the " +
      "middle, database and dashboard at the bottom. Each node carries its LABEL " +
      "inside and its DETAIL in small grey text underneath. The data visibly " +
      "flows through the diagram.",
  },
  "process-flow": {
    for: "student",
    draw:
      "A left-to-right pipeline of numbered nodes (1, 2, 3, 4) across the middle. " +
      "Each node is a rounded square holding a thin-line icon, its LABEL directly " +
      "beneath, its DETAIL in small grey text. Glowing arrow connectors run from " +
      "each node to the next.",
  },
  "tech-stack": {
    for: "student",
    draw:
      "A stack of horizontal layer bars, widest at the bottom and narrowing " +
      "upward, each bar carrying a thin-line icon on the left, its LABEL in bold, " +
      "and its DETAIL right-aligned in grey. Subtle glow between the layers.",
  },
  "ui-showcase": {
    for: "client",
    draw:
      "A realistic desktop browser window, centred and tilted very slightly, " +
      "showing a finished website homepage for this exact business — visible nav " +
      "bar, a hero band with a large photo-illustration of that business, a bright " +
      "call-to-action button, and a row of section cards below the fold. Around " +
      "the browser, the LABEL/DETAIL pairs float as small chips with thin-line " +
      "icons and hairline leader lines pointing at the part of the page they " +
      "describe.",
  },
  "mobile-showcase": {
    for: "client",
    draw:
      "Three phone frames overlapping in a fan, the centre one upright and in " +
      "focus, each showing a different real screen of this app (list, detail, " +
      "confirmation) with believable UI — headers, cards, buttons. The " +
      "LABEL/DETAIL pairs sit as chips down the right side with thin-line icons.",
  },
  "feature-grid": {
    for: "both",
    draw:
      "Four glassmorphic cards in a 2x2 grid across the lower two-thirds. Each " +
      "card: a thin-line neon icon at the top, its LABEL in bold below it, its " +
      "DETAIL in smaller light grey text under that. Equal card sizes, even gutters.",
  },
  comparison: {
    for: "both",
    draw:
      "Two vertical columns split by a thin glowing divider: the left headed " +
      "'BEFORE' in muted grey with a dim icon, the right headed 'AFTER' in bright " +
      "accent colour with a crisp icon. Each column lists its LABEL/DETAIL pairs " +
      "as short ticked lines.",
  },
  "stat-spotlight": {
    for: "both",
    draw:
      "One enormous number or metric centred in the upper-middle, set in a heavy " +
      "font with a neon glow, its DETAIL directly under it. The remaining " +
      "LABEL/DETAIL pairs sit as a row of small supporting chips along the bottom.",
  },
};

function layoutsFor(audience: string) {
  return Object.keys(LAYOUTS).filter(
    (k) => LAYOUTS[k].for === audience || LAYOUTS[k].for === "both"
  );
}

// Model output is JSON, so strip any fence it adds anyway and fail loudly with
// the actual text rather than a bare "Unexpected token".
function parseJson<T>(raw: string, what: string): T {
  const json = raw.replace(/^```(?:json)?|```$/g, "").trim();
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(`${what} was not valid JSON: ${json.slice(0, 200)}`);
  }
}

export type Topic = { topic: string; audience: string; angle: string; segment: string };

// Picks the one thing this post is about. `recent` is every topic already used,
// passed in as a hard ban list — that, not randomness, is what stops repeats.
export const pickTopic = internalAction({
  args: { recent: v.array(v.string()), cursor: v.number(), config: v.any() },
  handler: async (_ctx, args): Promise<Topic> => {
    const seg = SEGMENTS[Math.abs(args.cursor) % SEGMENTS.length];
    const hook: string = args.config?.reelHook?.trim() || "";

    const raw = await chat(
      `You plan the content calendar for a software studio in Kalaburagi, India ` +
        `in North Karnataka. It builds: ${CAPABILITIES}. It has already ` +
        `shipped ${SHIPPED}.\n\n` +
        `Pick today's post subject. It must be: ${seg.want}\n\n` +
        (hook ? `Lean it toward this idea if it fits: "${hook.slice(0, 200)}".\n\n` : "") +
        (args.recent.length
          ? `ALREADY POSTED — you may not pick any of these, or anything a ` +
            `follower would read as the same thing:\n${args.recent
              .map((t) => `- ${t}`)
              .join("\n")}\n\n`
          : "") +
        `Return ONLY minified JSON: ` +
        `{"topic":"the exact name of the one system, site or app — 3 to 7 words, ` +
        `title case, specific enough that someone could quote you a price for it",` +
        `"angle":"one sentence on why someone searches for this right now"}\n\n` +
        `It must be something this studio could actually deliver with the stack ` +
        `above, and a single concrete buildable thing — never a category, never ` +
        `a listicle. "Real-Time Location Tracking System" is right. ` +
        `"Web Development Services", "Top 5 AI Trends" and "Digital Transformation" ` +
        `are all wrong.`,
      400
    );

    const t = parseJson<{ topic: string; angle: string }>(raw, "Topic pick");
    if (!t.topic?.trim()) throw new Error("Topic pick came back empty");
    return {
      topic: t.topic.trim(),
      angle: t.angle || "",
      audience: seg.audience,
      segment: seg.key,
    };
  },
});

type Brief = {
  layout: string;
  headline: string;
  subhead: string;
  blocks: { label: string; detail: string; icon: string }[];
};

// Asks for the poster copy as data instead of prose, so every string drawn into
// the image is short, known and countable. Long unique strings are what
// gpt-image-1 misspells, so nothing here is allowed to be long.
async function designBrief(topic: Topic): Promise<Brief> {
  const allowed = layoutsFor(topic.audience);

  const raw = await chat(
    `You are an award-winning infographic designer. Design ONE premium ` +
      `Instagram poster whose single subject is: "${topic.topic}".` +
      (topic.angle ? ` Context: ${topic.angle}` : "") +
      `\n\nThe viewer is ${
        topic.audience === "client"
          ? "a local business owner deciding who to hire. Show them what they " +
            "would be buying and what it does for their business."
          : "an engineering student choosing a final-year project. Show them how " +
            "the system is actually built."
      }\n\n` +
      `Return ONLY minified JSON, no code fences, with exactly these keys:\n` +
      `{"layout":one of ${allowed.join("|")},` +
      `"headline":"3-5 WORDS, UPPERCASE — the name of this one thing, not a slogan",` +
      `"subhead":"max 8 words, sentence case, what it does",` +
      `"blocks":[exactly 4 items of {"label":"1-3 words","detail":"2-5 words, ` +
      `concrete","icon":"one common noun an icon designer would draw, e.g. ` +
      `satellite, map-pin, database, shield"}]}\n\n` +
      `Every block must be specific to "${topic.topic}" and to nothing else — ` +
      `name the real modules, the real stack, the real numbers, the real screens. ` +
      `A reader must finish the poster understanding how this thing works. ` +
      `Banned words: solutions, innovation, excellence, empowering, seamless, ` +
      `cutting-edge. Pick the layout that genuinely suits this subject. Spell ` +
      `every word correctly.`,
    800
  );

  const b = parseJson<Brief>(raw, "Design brief");
  if (!LAYOUTS[b.layout] || !allowed.includes(b.layout)) b.layout = allowed[0];
  b.blocks = (b.blocks || []).slice(0, 4);
  if (!b.blocks.length) throw new Error("Design brief came back with no content blocks");
  return b;
}

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

// Hooks are written as "Part 3 — ..." so one campaign reads as a series. The
// number drives both the caption opener and the badge drawn on the image.
function seriesPart(hook: string): string | null {
  return /^\s*part\s+(\d+)/i.exec(hook || "")?.[1] ?? null;
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
  args: { config: v.any(), topic: v.optional(v.any()) },
  handler: async (_ctx, args) => {
    const b = brand(args.config);
    const topic: Topic | null = args.topic ?? null;
    const theme = topic?.topic || args.config?.theme || "Daily tech tips";

    // Hooks are free text and people paste whole content calendars in. Feeding
    // 1000+ chars in verbatim makes the model answer with a content plan (often
    // JSON) instead of a caption, so only the opening line is used as the hook.
    const rawHook: string = args.config?.reelHook?.trim() || "";
    const part = seriesPart(rawHook);
    const hook = rawHook
      ? `Use this as the inspiration for your opening line: "${rawHook.slice(0, 180)}". `
      : "";
    const series = part
      ? `Begin the caption with exactly "Part ${part} — " so it reads as one ` +
        `entry in an ongoing series. `
      : "";

    const caption = await chat(
      `You are the content lead at "${b.name}", a software studio that builds ` +
        `websites, mobile apps, AI/ML systems and final-year college projects. ` +
        `Today's post is about exactly one thing: "${theme}". ` +
        (topic?.angle ? `Why it matters now: ${topic.angle} ` : "") +
        (topic?.audience === "client"
          ? `You are talking to a local business owner who wants this built for ` +
            `their business. Sell the outcome, not the tech. `
          : topic
            ? `You are talking to an engineering student who might build this as ` +
              `their final-year project. Be technical and useful. `
            : "") +
        hook +
        series +
        `Structure it exactly like this and nothing else:\n` +
        `- Line 1: a scroll-stopping hook naming "${theme}", max 10 words, one emoji.\n` +
        `- A blank line, then 3 or 4 bullet lines each starting with "▸ ". Every ` +
        `bullet must be about "${theme}" specifically — a real module, a named ` +
        `tool, a real number, a real screen. Nothing that could be copy-pasted ` +
        `onto a different project.\n` +
        `- A blank line, then one short call to action inviting a DM ` +
        `about this exact ${topic?.audience === "client" ? "project" : "project idea"}.\n` +
        `- A blank line, then exactly 8 hashtags on one line, including ` +
        `#${b.name.replace(/\s+/g, "")}, #Kalaburagi and #Gulbarga — the city ` +
        `is searched under both names.\n` +
        `Sound like a senior engineer who ships, not a marketing brochure. Ban ` +
        `these words entirely: solutions, innovation, excellence, empowering, ` +
        `unlock, elevate, cutting-edge, seamless, game-changer. ` +
        `Return ONLY the caption as plain text — never JSON, never a content ` +
        `calendar, never code fences, never surrounding quotes.`,
      800
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
      `✉️ ${b.email}\n` +
      `📍 Kalaburagi (Gulbarga), Karnataka`
    );
  },
});

export const generateImage = internalAction({
  args: { topic: v.any(), config: v.any() },
  handler: async (_ctx, args): Promise<string> => {
    const b = brand(args.config);
    const logoUrl = args.config?.staticLogoUrl;
    const part = seriesPart(args.config?.reelHook || "");
    const topic: Topic = args.topic;

    const brief = await designBrief(topic);

    // Protocol and trailing slash are extra characters for the model to get
    // wrong, and nobody types them anyway.
    const domain = b.website.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    // Every string that must appear is listed explicitly and counted. Anything
    // not on this list is banned, which is what stops the model inventing
    // garbled filler text in the empty corners.
    const copy = brief.blocks
      .map((x, i) => `  ${i + 1}. LABEL "${x.label}" / DETAIL "${x.detail}" / icon: ${x.icon}`)
      .join("\n");

    // The mockup layouts need a rendered product on screen, so they cannot carry
    // the flat-vector "no screens, no photos" ban the diagram layouts rely on.
    const isMockup = brief.layout.endsWith("-showcase");

    const prompt =
      `A premium poster for a software studio — the kind of design that wins on ` +
      `Dribbble. Square 1:1. Its single subject is "${topic.topic}" and every ` +
      `element on it must be about that one thing.\n\n` +
      `LAYOUT: ${LAYOUTS[brief.layout].draw}\n\n` +
      `TEXT TO RENDER, spelled exactly, and nothing else anywhere in the image:\n` +
      `  HEADLINE (largest, bold, top of the poster): "${brief.headline}"\n` +
      `  SUBHEAD (small, light grey, directly under the headline): "${brief.subhead}"\n` +
      `  COMPANY NAME (small, top-left): "${b.name}"\n` +
      `${copy}\n` +
      `  FOOTER BAR — a slim solid bar pinned edge to edge across the very ` +
      `bottom, its text large enough to read on a phone: left side "${b.mobile}", ` +
      `right side "${domain}", both in one line. Copy these two strings ` +
      `character by character; they are a real phone number and a real domain and ` +
      `a single wrong character makes the poster useless.\n\n` +
      `STYLE: background is a deep navy ${BRAND_BG} gradient carrying a faint ` +
      `technical grid and thin circuit traces with small round nodes, echoing the ` +
      `company's circular circuit-board logo. Frosted-glass cards with 1px ` +
      `luminous borders, thin-line outline icons. ${BRAND_ACCENT} warm orange is ` +
      `the ONE accent colour in the whole poster — icons, arrows, the big number, ` +
      `the footer bar and the underline beneath the headline all use it. ` +
      `Everything else is white or light grey on navy. Do not introduce blue, ` +
      `purple, green or teal accents. Crisp geometric sans-serif typography with a clear ` +
      `size hierarchy. Generous padding, everything aligned to a strict grid. ` +
      (isMockup
        ? `The mockup screens must look like a real finished product — believable ` +
          `nav bars, buttons, cards and imagery for this exact business — not ` +
          `grey placeholder boxes. Keep the screen text to short legible labels.`
        : `Flat vector only. No people, no photographs, no 3D renders, no ` +
          `stock-photo glow, no laptop or phone mockups.`) +
      `\n\n` +
      (logoUrl
        ? `Place the provided company logo in the top-left corner beside the ` +
          `company name, preserving its exact colours and shape. `
        : "") +
      // The footer contact was requested deliberately, and it is the one risky
      // part of this prompt: over five earlier renders gpt-image-1 got the domain
      // right 1/5 (kkalaburagaitech.com, kalaburaggitech.com) and dropped a digit
      // from the phone number. Short familiar words render reliably, long unique
      // strings do not. The exact strings are still appended to the caption in
      // code, so a bad render costs a reader, not the lead.
      // ponytail: prompt-only guarantee. Composite the footer bar in code if a
      // misspelling ever ships.
      (part
        ? `Also render a small, bold, high-contrast pill badge in the TOP-RIGHT ` +
          `corner reading exactly "PART ${part}" — two words, nothing else in it. ` +
          `Inset it well away from the edges so the whole badge, including its ` +
          `rounded ends, sits fully inside the frame and nothing is cropped. `
        : "") +
      `Keep all text perfectly level and face-on, never skewed into perspective, ` +
      `with clear margin from the frame edges so no letter is cropped. Every word ` +
      `must be real, legible and correctly spelled — no gibberish letterforms, no ` +
      `lorem ipsum, no duplicated words. ` +
      `Render ONLY the strings listed above and nothing else — no extra taglines, ` +
      `no email address, no hashtags, no paragraphs of body text.`;

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
      form.append("quality", "high");
      form.append("output_format", "jpeg");
      form.append("image", await logoRes.blob(), "logo.png");

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
          quality: "high",
          output_format: "jpeg",
          n: 1,
        }),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI image error");

    // By default OpenAI returns a URL if we don't specify response_format
    let b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      const url = data.data?.[0]?.url;
      if (!url) throw new Error("OpenAI returned no image data or url");
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error("Failed to download generated image from URL");
      const buffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      b64 = btoa(binary);
    }
    
    return b64;
  },
});
