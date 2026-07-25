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
  platforms: ["facebook", "instagram"],
  rotationIndex: 0,
};

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
  args: {},
  handler: async (ctx) => {
    const config = await ctx.runQuery(api.autoPost.getConfig);
    const theme = config.theme || "Daily tech tips";
    
    // Generate the caption first
    const caption: string = await ctx.runAction(internal.gemini.generateCaption, { theme });
    
    // Use the highly-detailed caption to generate the image
    const prompt = await ctx.runAction(internal.gemini.generateImagePrompt, { theme: caption });
    
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Failed to generate image");
    
    const blob = await imageRes.blob();
    const uploadUrl = await ctx.runMutation(api.mutations.generateUploadUrl);
    
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
    const { storageId } = await uploadRes.json();
    
    await ctx.runMutation(api.autoPost.addImage, { storageId, caption });
    
    return caption;
  },
});

export const updateConfig = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    theme: v.optional(v.string()),
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
        // Pool is empty! Generate image on-the-fly based on the caption itself for hyper-relevance.
        caption = await ctx.runAction(internal.gemini.generateCaption, { theme: config.theme });
        const prompt = await ctx.runAction(internal.gemini.generateImagePrompt, { theme: caption });
        
        const seed = Math.floor(Math.random() * 1000000);
        const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
        
        const imageRes = await fetch(generatedImageUrl);
        if (!imageRes.ok) throw new Error("Failed to generate on-the-fly image from Pollinations");
        
        const blob = await imageRes.blob();
        const uploadUrl = await ctx.runMutation(api.mutations.generateUploadUrl);
        
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        const { storageId } = await uploadRes.json();
        
        // Get public URL using existing getUploadUrl mutation
        const publicUrl = await ctx.runMutation(api.mutations.getUploadUrl, { storageId });
        if (!publicUrl) throw new Error("Failed to resolve generated image URL");
        
        mediaUrl = publicUrl;
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
