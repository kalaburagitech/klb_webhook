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

const DEFAULT_CONFIG: any = {
  enabled: false,
  theme: "Daily tech tips",
  platforms: ["facebook", "instagram"],
  rotationIndex: 0,
};

// Writes a caption + branded image and returns both. Shared by the manual
// "Generate preview" button and the cron, so there is exactly one image path.
async function generateBrandedPost(ctx: any, config: any) {
  const caption: string = await ctx.runAction(internal.openai.generateCaption, {
    config,
  });

  const b64: string = await ctx.runAction(internal.openai.generateImage, {
    theme: caption,
    config,
  });

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const storageId = await ctx.storage.store(
    new Blob([bytes], { type: "image/jpeg" })
  );
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("Could not resolve the generated image URL");

  return { caption, storageId, url };
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
  args: {},
  handler: async (ctx): Promise<string> => {
    const state = await ctx.runQuery(internal.autoPost.getState);
    const config = state.config || DEFAULT_CONFIG;

    // Temporarily set the hook for preview purposes if one exists
    if (state.nextHook) {
      config.reelHook = state.nextHook.hook;
    }

    const { caption, storageId } = await generateBrandedPost(ctx, config);
    await ctx.runMutation(api.autoPost.addImage, { storageId, caption });

    return caption;
  },
});

// Cron entry point — unlike the manual button, this respects the master switch
// so a disabled auto-poster does not quietly burn OpenAI credits twice a day.
export const generateIfEnabled = internalAction({
  args: {},
  handler: async (ctx) => {
    const { config } = await ctx.runQuery(internal.autoPost.getState);
    if (!config?.enabled) {
      console.log("Auto-generate skipped: not enabled.");
      return;
    }
    await ctx.runAction(api.autoPost.generateAndSaveImage, {});
  },
});

export const updateConfig = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    theme: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
    useStaticLogo: v.optional(v.boolean()),
    staticLogoStorageId: v.optional(v.id("_storage")),
    companyName: v.optional(v.string()),
    website: v.optional(v.string()),
    mobile: v.optional(v.string()),
    email: v.optional(v.string()),
    reelHook: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let staticLogoUrl = undefined;
    if (args.staticLogoStorageId) {
      const url = await ctx.storage.getUrl(args.staticLogoStorageId);
      if (url) staticLogoUrl = url;
    }

    const existing = await ctx.db.query("autoPostConfig").first();
    const now = Date.now();
    
    const patchData: any = { ...args, updatedAt: now };
    if (staticLogoUrl) patchData.staticLogoUrl = staticLogoUrl;

    if (existing) {
      await ctx.db.patch(existing._id, patchData);
    } else {
      await ctx.db.insert("autoPostConfig", {
        ...DEFAULT_CONFIG,
        ...patchData,
        createdAt: now,
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
    const nextHook = await ctx.db.query("reelHooks").filter(q => q.eq(q.field("usedAt"), undefined)).first();
    return { config, images, nextHook };
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

export const addReelHook = mutation({
  args: { hook: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("reelHooks", {
      hook: args.hook,
      createdAt: Date.now(),
    });
  }
});

export const getReelHooks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reelHooks").order("desc").collect();
  }
});

export const removeReelHook = mutation({
  args: { id: v.id("reelHooks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  }
});

export const markHookUsed = internalMutation({
  args: { id: v.id("reelHooks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { usedAt: Date.now() });
  }
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
    const { config, images, nextHook } = await ctx.runQuery(internal.autoPost.getState, {});

    // "Run Auto-Post Now" bypasses the master switch so you can test without
    // arming the twice-daily cron.
    if (!config || (!config.enabled && args.slot !== "manual_test")) {
      console.log(`Auto-post (${args.slot}) skipped: not enabled.`);
      return;
    }

    try {
      let caption = "";
      let mediaUrl = "";
      let usedImageId: any = null;

      // Set the dynamic reelHook for this run
      if (nextHook) {
        config.reelHook = nextHook.hook;
      }

      if (config.useStaticLogo && config.staticLogoUrl) {
        // Post the logo as-is, do not pop from the queue
        mediaUrl = config.staticLogoUrl;
        caption = await ctx.runAction(internal.openai.generateCaption, { config });
      } else if (images.length === 0) {
        // Pool is empty — generate a fresh branded ad on the fly.
        const generated = await generateBrandedPost(ctx, config);
        caption = generated.caption;
        mediaUrl = generated.url;
      } else {
        // Use the first image in the queue
        const image = images[0];
        mediaUrl = image.url;
        usedImageId = image._id;
        
        if (image.caption) {
          caption = image.caption;
        } else {
          caption = await ctx.runAction(internal.openai.generateCaption, { config });
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

      if (nextHook) {
        await ctx.runMutation(internal.autoPost.markHookUsed, { id: nextHook._id });
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
