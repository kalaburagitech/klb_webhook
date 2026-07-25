import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  internalAction,
  action,
} from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

const DEFAULT_CONFIG = {
  enabled: false,
  theme: "Daily tech tips",
  imagePrompt: "",
  platforms: ["facebook", "instagram"],
  rotationIndex: 0,
};

// Generate an image for the given prompt, upload it to Convex storage, and
// return both the storageId and its public URL.
//
// Primary: Gemini image model (best prompt adherence, but needs a billing-enabled
// Google AI account). Fallback: Pollinations (free) using the same verbatim prompt,
// so image generation still works on the free tier.
async function generateAndUploadImage(
  ctx: any,
  prompt: string
): Promise<{ storageId: any; url: string }> {
  let bytes: Uint8Array;
  let mimeType: string;

  try {
    const res = await ctx.runAction(internal.gemini.generateImage, { prompt });
    const binary = atob(res.data);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    mimeType = res.mimeType || "image/png";
  } catch (e: any) {
    // Gemini image gen unavailable (e.g. free-tier quota = 0). Fall back to
    // Pollinations with the exact same prompt.
    console.warn(
      "Gemini image generation failed, falling back to Pollinations:",
      e?.message || String(e)
    );
    const seed = Math.floor(Math.random() * 1000000);
    const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
    const pollRes = await fetch(pollUrl);
    if (!pollRes.ok) {
      throw new Error("Both Gemini and Pollinations image generation failed");
    }
    bytes = new Uint8Array(await pollRes.arrayBuffer());
    mimeType = "image/jpeg";
  }

  const blob = new Blob([bytes], { type: mimeType });
  const uploadUrl = await ctx.runMutation(api.mutations.generateUploadUrl);
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  const { storageId } = await uploadRes.json();

  const url = await ctx.runMutation(api.mutations.getUploadUrl, { storageId });
  if (!url) throw new Error("Failed to resolve generated image URL");
  return { storageId, url };
}

// ---------- Public queries / mutations (dashboard) ----------

export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("autoPostConfig").first();
    return doc ?? DEFAULT_CONFIG;
  },
});

export const triggerAutoPost = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(internal.autoPost.runAutoPost, { slot: "manual_test" });
  },
});

export const generateAndSaveImage = action({
  args: {
    theme: v.optional(v.string()),
    imagePrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(api.autoPost.getConfig);
    // Prefer values passed from the form (preview), else fall back to saved config.
    const theme = (args.theme ?? config.theme ?? "").trim() || "Daily tech tips";

    // Caption is written ABOUT the topic/theme.
    const caption: string = await ctx.runAction(internal.gemini.generateCaption, { theme });

    // Image comes from the dedicated image prompt (used verbatim). If none is set,
    // fall back to letting Gemini build one from the caption topic.
    const imagePrompt = (args.imagePrompt ?? config.imagePrompt ?? "").trim();
    const prompt = imagePrompt
      ? imagePrompt
      : await ctx.runAction(internal.gemini.generateImagePrompt, { theme });

    const { storageId } = await generateAndUploadImage(ctx, prompt);

    await ctx.runMutation(api.autoPost.addImage, { storageId, caption });

    return caption;
  },
});

export const updateConfig = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    theme: v.optional(v.string()),
    imagePrompt: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("autoPostConfig").first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("autoPostConfig", {
        ...DEFAULT_CONFIG,
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const listImages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("autoPostImages").order("desc").collect();
  },
});

export const addImage = mutation({
  args: { 
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Could not resolve uploaded image URL");
    await ctx.db.insert("autoPostImages", {
      storageId: args.storageId,
      url,
      caption: args.caption,
      createdAt: Date.now(),
    });
  },
});

export const removeImage = mutation({
  args: { id: v.id("autoPostImages") },
  handler: async (ctx, args) => {
    const img = await ctx.db.get(args.id);
    if (img) {
      await ctx.storage.delete(img.storageId).catch(() => {});
      await ctx.db.delete(args.id);
    }
  },
});

// ---------- Internal helpers used by the cron action ----------

export const getState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("autoPostConfig").first();
    const images = await ctx.db.query("autoPostImages").order("asc").collect();
    return { config, images };
  },
});

export const finalizeSuccess = internalMutation({
  args: {
    caption: v.string(),
    mediaUrl: v.string(),
    platforms: v.array(v.string()),
    nextRotation: v.number(),
    slot: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record it in the Posts library so it shows up in the dashboard.
    await ctx.db.insert("posts", {
      content: args.caption,
      mediaUrl: args.mediaUrl,
      platforms: args.platforms,
      createdAt: now,
      updatedAt: now,
      status: "published",
    });

    const config = await ctx.db.query("autoPostConfig").first();
    if (config) {
      await ctx.db.patch(config._id, {
        rotationIndex: args.nextRotation,
        lastRunSlot: args.slot,
        lastRunAt: now,
        lastError: undefined,
        updatedAt: now,
      });
    }
  },
});

export const recordError = internalMutation({
  args: { error: v.string(), slot: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("autoPostConfig").first();
    if (config) {
      await ctx.db.patch(config._id, {
        lastError: args.error,
        lastRunSlot: args.slot,
        lastRunAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// ---------- The scheduled job ----------

export const runAutoPost = internalAction({
  args: { slot: v.string() }, // "morning" | "night"
  handler: async (ctx, args) => {
    const { config, images } = await ctx.runQuery(internal.autoPost.getState, {});

    if (!config || !config.enabled) {
      console.log(`Auto-post (${args.slot}) skipped: not enabled.`);
      return;
    }

    try {
      let caption = "";
      let mediaUrl = "";
      let usedImageId: any = null;

      if (images.length === 0) {
        // Pool is empty! Generate caption + image on-the-fly.
        caption = await ctx.runAction(internal.gemini.generateCaption, { theme: config.theme });

        // Image comes from the dedicated image prompt (verbatim), else Gemini builds one from the theme.
        const imagePrompt = (config.imagePrompt ?? "").trim();
        const prompt = imagePrompt
          ? imagePrompt
          : await ctx.runAction(internal.gemini.generateImagePrompt, { theme: config.theme });

        const { url } = await generateAndUploadImage(ctx, prompt);
        mediaUrl = url;
      } else {
        // Use the first image in the queue
        const image = images[0];
        mediaUrl = image.url;
        usedImageId = image._id;
        
        if (image.caption) {
          caption = image.caption;
        } else {
          caption = await ctx.runAction(internal.gemini.generateCaption, { theme: config.theme });
        }
      }

      // Publish to each configured platform.
      const errors: string[] = [];
      let successCount = 0;
      
      for (const platform of config.platforms) {
        try {
          await ctx.runAction(api.metaApi.publishPost, {
            platform,
            content: caption,
            mediaUrl: mediaUrl,
            mediaType: "image",
          });
          successCount++;
        } catch (err: any) {
          console.error(`Failed to publish to ${platform}:`, err);
          errors.push(`${platform}: ${err.message || String(err)}`);
        }
      }

      if (successCount === 0 && errors.length > 0) {
        throw new Error(errors.join(" | "));
      }

      await ctx.runMutation(internal.autoPost.finalizeSuccess, {
        caption,
        mediaUrl: mediaUrl,
        platforms: config.platforms,
        nextRotation: config.rotationIndex, // No longer used for queue, but kept for schema compatibility
        slot: args.slot,
      });

      if (usedImageId) {
        // Remove the posted image from the queue
        await ctx.runMutation(api.autoPost.removeImage, { id: usedImageId });
      }

      if (errors.length > 0) {
        // Record partial failure
        await ctx.runMutation(internal.autoPost.recordError, {
          error: "Partial success. Errors: " + errors.join(" | "),
          slot: args.slot,
        });
      }

      console.log(`Auto-post (${args.slot}) finished.`);
    } catch (e: any) {
      await ctx.runMutation(internal.autoPost.recordError, {
        error: e.message || String(e),
        slot: args.slot,
      });
      console.error(`Auto-post (${args.slot}) failed:`, e);
      throw e;
    }
  },
});
