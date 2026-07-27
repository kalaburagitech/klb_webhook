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
  videoPrompt: "",
  contentType: "image",
  morningType: "image",
  nightType: "image",
  platforms: ["facebook", "instagram"],
  rotationIndex: 0,
};

// Given a queue item, what content type is it? (legacy items had no contentType.)
function itemType(item: any): "image" | "video" {
  return item?.contentType === "video" ? "video" : "image";
}

// Is a queue item ready to be published right now?
function isReady(item: any): boolean {
  if (!item?.url) return false;
  if (itemType(item) === "video") return item.videoStatus === "ready";
  return true;
}

// The mediaType to pass to metaApi.publishPost for a given content type + platform.
// Facebook uses /videos for video; Instagram publishes video as a Reel.
function mediaTypeFor(type: "image" | "video", platform: string): string {
  if (type !== "video") return "image";
  return platform === "instagram" ? "reels" : "video";
}

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

// Download a finished Veo video from its (authenticated) URI and store it in Convex.
async function downloadAndUploadVideo(
  ctx: any,
  videoUri: string
): Promise<{ storageId: any; url: string }> {
  // Veo's download URI needs the Gemini API key appended.
  const apiKey = process.env.GEMINI_API_KEY;
  const sep = videoUri.includes("?") ? "&" : "?";
  const downloadUrl = apiKey ? `${videoUri}${sep}key=${apiKey}` : videoUri;

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Failed to download generated video (HTTP ${res.status})`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "video/mp4";

  const blob = new Blob([bytes], { type: mimeType });
  const uploadUrl = await ctx.runMutation(api.mutations.generateUploadUrl);
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  const { storageId } = await uploadRes.json();

  const url = await ctx.runMutation(api.mutations.getUploadUrl, { storageId });
  if (!url) throw new Error("Failed to resolve generated video URL");
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

// VIDEO equivalent of generateAndSaveImage. Because Veo is a long-running job, this
// only STARTS generation and adds a "generating" item to the queue. The per-minute
// poller (pollGeneratingVideos) downloads + stores the video once Veo finishes, and
// the queue/preview updates reactively.
export const generateAndSaveVideo = action({
  args: {
    theme: v.optional(v.string()),
    videoPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const config = await ctx.runQuery(api.autoPost.getConfig);
    const theme = (args.theme ?? config.theme ?? "").trim() || "Daily tech tips";

    // Caption is written ABOUT the topic/theme (reuses the existing image caption path).
    const caption: string = await ctx.runAction(internal.gemini.generateCaption, { theme });

    // Video comes from the dedicated video prompt (verbatim). If none is set, let Gemini
    // build a detailed cinematic prompt from the caption topic.
    const videoPrompt = (args.videoPrompt ?? config.videoPrompt ?? "").trim();
    const prompt = videoPrompt
      ? videoPrompt
      : await ctx.runAction(internal.gemini.generateVideoPrompt, { theme });

    const { operationName } = await ctx.runAction(internal.gemini.startVideoGeneration, {
      prompt,
    });

    await ctx.runMutation(api.autoPost.addVideoJob, {
      caption,
      videoPrompt: prompt,
      videoGenerationId: operationName,
    });

    return caption;
  },
});

export const updateConfig = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    theme: v.optional(v.string()),
    imagePrompt: v.optional(v.string()),
    videoPrompt: v.optional(v.string()),
    contentType: v.optional(v.string()),
    morningType: v.optional(v.string()),
    nightType: v.optional(v.string()),
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
      contentType: "image",
      createdAt: Date.now(),
    });
  },
});

// Add a "generating" video item to the queue. url/storageId are filled in later by
// the poller once Veo finishes.
export const addVideoJob = mutation({
  args: {
    caption: v.optional(v.string()),
    videoPrompt: v.string(),
    videoGenerationId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("autoPostImages", {
      caption: args.caption,
      contentType: "video",
      videoPrompt: args.videoPrompt,
      videoGenerationId: args.videoGenerationId,
      videoStatus: "generating",
      createdAt: Date.now(),
    });
  },
});

export const removeImage = mutation({
  args: { id: v.id("autoPostImages") },
  handler: async (ctx, args) => {
    const img = await ctx.db.get(args.id);
    if (img) {
      if (img.storageId) {
        await ctx.storage.delete(img.storageId).catch(() => {});
      }
      await ctx.db.delete(args.id);
    }
  },
});

// ---------- Video generation poller (runs every minute via cron) ----------

export const getGeneratingVideos = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("autoPostImages")
      .filter((q) => q.eq(q.field("videoStatus"), "generating"))
      .collect();
  },
});

export const setVideoResult = internalMutation({
  args: {
    id: v.id("autoPostImages"),
    storageId: v.optional(v.id("_storage")),
    url: v.optional(v.string()),
    videoStatus: v.string(),
    videoError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const pollGeneratingVideos = internalAction({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.runQuery(internal.autoPost.getGeneratingVideos, {});
    for (const job of jobs) {
      if (!job.videoGenerationId) continue;
      try {
        const res = await ctx.runAction(internal.gemini.pollVideoOperation, {
          operationName: job.videoGenerationId,
        });
        if (!res.done) continue; // still generating

        if (res.error || !res.videoUri) {
          await ctx.runMutation(internal.autoPost.setVideoResult, {
            id: job._id,
            videoStatus: "failed",
            videoError: res.error || "Veo returned no video",
          });
          continue;
        }

        const { storageId, url } = await downloadAndUploadVideo(ctx, res.videoUri);
        await ctx.runMutation(internal.autoPost.setVideoResult, {
          id: job._id,
          storageId,
          url,
          videoStatus: "ready",
        });
      } catch (e: any) {
        await ctx.runMutation(internal.autoPost.setVideoResult, {
          id: job._id,
          videoStatus: "failed",
          videoError: e?.message || String(e),
        });
      }
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
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const contentType = args.contentType === "video" ? "video" : "image";

    // Record it in the Posts library so it shows up in the dashboard.
    await ctx.db.insert("posts", {
      content: args.caption,
      mediaUrl: args.mediaUrl,
      contentType,
      mediaType: contentType,
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

// Which content type should a given slot publish? Falls back to the default contentType.
function slotContentType(config: any, slot: string): "image" | "video" {
  const t =
    slot === "morning"
      ? config.morningType
      : slot === "night"
        ? config.nightType
        : config.contentType;
  return t === "video" ? "video" : "image";
}

// ---------- Slot-aware pre-generation (runs at 7:30 AM/PM via cron) ----------
// Reads the daily-mix config for the slot and pre-generates the right media type so
// it's ready for the 8:00 publish. Videos take a few minutes, hence the head-start.
export const generateScheduled = action({
  args: { slot: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const config = await ctx.runQuery(api.autoPost.getConfig);
    if (!config?.enabled) {
      console.log(`Auto-generate (${args.slot ?? "?"}) skipped: not enabled.`);
      return;
    }
    const type = slotContentType(config, args.slot ?? "");
    if (type === "video") {
      await ctx.runAction(api.autoPost.generateAndSaveVideo, {});
    } else {
      await ctx.runAction(api.autoPost.generateAndSaveImage, {});
    }
  },
});

// ---------- The scheduled job ----------

export const runAutoPost = internalAction({
  args: { slot: v.string() }, // "morning" | "night" | "manual_test"
  handler: async (ctx, args) => {
    const { config, images } = await ctx.runQuery(internal.autoPost.getState, {});

    if (!config || !config.enabled) {
      console.log(`Auto-post (${args.slot}) skipped: not enabled.`);
      return;
    }

    const slotType = slotContentType(config, args.slot);

    try {
      let caption = "";
      let mediaUrl = "";
      let contentType: "image" | "video" = slotType;
      let usedImageId: any = null;

      // Prefer a ready queue item matching the slot's content type; else any ready item.
      const readyItems = images.filter(isReady);
      const chosen =
        readyItems.find((i: any) => itemType(i) === slotType) ?? readyItems[0];

      if (chosen) {
        mediaUrl = chosen.url!;
        contentType = itemType(chosen);
        usedImageId = chosen._id;
        caption = chosen.caption
          ? chosen.caption
          : await ctx.runAction(internal.gemini.generateCaption, { theme: config.theme });
      } else if (slotType === "image") {
        // No ready media — generate an image on the fly (existing behavior).
        caption = await ctx.runAction(internal.gemini.generateCaption, { theme: config.theme });
        const imagePrompt = (config.imagePrompt ?? "").trim();
        const prompt = imagePrompt
          ? imagePrompt
          : await ctx.runAction(internal.gemini.generateImagePrompt, { theme: config.theme });
        const { url } = await generateAndUploadImage(ctx, prompt);
        mediaUrl = url;
        contentType = "image";
      } else {
        // Video slot but nothing ready. Video can't be generated synchronously in time,
        // so record it and skip — the 7:30 pre-generation should have produced it.
        await ctx.runMutation(internal.autoPost.recordError, {
          error:
            "No ready video in the queue to publish. Videos are pre-generated at 7:30 — check that auto-post was enabled and Veo generation succeeded.",
          slot: args.slot,
        });
        console.log(`Auto-post (${args.slot}) skipped: no ready video.`);
        return;
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
            mediaType: mediaTypeFor(contentType, platform),
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
        contentType,
      });

      if (usedImageId) {
        // Remove the posted item from the queue
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
