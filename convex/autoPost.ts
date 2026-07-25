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
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Could not resolve uploaded image URL");
    await ctx.db.insert("autoPostImages", {
      storageId: args.storageId,
      url,
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
    if (images.length === 0) {
      await ctx.runMutation(internal.autoPost.recordError, {
        error: "No images in the pool — upload at least one image to auto-post.",
        slot: args.slot,
      });
      console.log(`Auto-post (${args.slot}) skipped: image pool empty.`);
      return;
    }

    try {
      // Pick the next image in rotation.
      const index = config.rotationIndex % images.length;
      const image = images[index];
      const nextRotation = (index + 1) % images.length;

      // Generate the caption with Gemini.
      const caption: string = await ctx.runAction(
        internal.gemini.generateCaption,
        { theme: config.theme }
      );

      // Publish to each configured platform.
      const errors: string[] = [];
      let successCount = 0;
      
      for (const platform of config.platforms) {
        try {
          await ctx.runAction(api.metaApi.publishPost, {
            platform,
            content: caption,
            mediaUrl: image.url,
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
        mediaUrl: image.url,
        platforms: config.platforms,
        nextRotation,
        slot: args.slot,
      });

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
