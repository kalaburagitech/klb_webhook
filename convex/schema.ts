import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "active", "inactive"
  }),
  
  socialAccounts: defineTable({
    platform: v.string(), // "facebook", "instagram"
    accountId: v.string(),
    accountName: v.string(),
    accessToken: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "active", "disconnected"
  }).index("by_platform", ["platform"]).index("by_accountId", ["accountId"]),

  posts: defineTable({
    title: v.optional(v.string()),
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id("media"))),
    contentType: v.optional(v.string()), // "image" | "video" (defaults to image for legacy posts)
    mediaType: v.optional(v.string()), // "image" | "video" | "reels"
    platforms: v.array(v.string()), // ["facebook", "instagram"]
    authorId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "draft", "published", "scheduled", "failed"
  }),

  scheduledPosts: defineTable({
    postId: v.id("posts"),
    scheduledTime: v.number(),
    platforms: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "pending", "published", "failed"
  }).index("by_status_and_time", ["status", "scheduledTime"]),

  media: defineTable({
    type: v.string(), // "image", "video", "carousel", "reels", "stories"
    url: v.string(),
    fileId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "ready", "processing", "failed"
  }),

  publishHistory: defineTable({
    postId: v.id("posts"),
    platform: v.string(),
    platformPostId: v.optional(v.string()), // ID returned from Meta
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "success", "failed"
    errorMessage: v.optional(v.string()),
  }).index("by_post", ["postId"]),

  webhookLogs: defineTable({
    provider: v.string(), // "meta"
    payload: v.any(),
    processed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "received", "processed", "error"
  }),

  analytics: defineTable({
    platform: v.string(),
    platformPostId: v.string(),
    metrics: v.any(), // e.g., { likes: 10, comments: 2, shares: 1 }
    date: v.string(), // "YYYY-MM-DD"
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(),
  }).index("by_platformPostId", ["platformPostId"]),

  notifications: defineTable({
    message: v.string(),
    type: v.string(), // "info", "warning", "error", "success"
    read: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(),
  }),

  failedJobs: defineTable({
    jobType: v.string(), // e.g., "publishPost"
    payload: v.any(),
    error: v.string(),
    retries: v.number(),
    nextRetryAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "pending_retry", "failed_permanently"
  }).index("by_status", ["status"]),

  tokens: defineTable({
    platform: v.string(),
    token: v.string(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "valid", "expired"
  }),

  // Singleton config for the Gemini-powered daily auto-poster.
  autoPostConfig: defineTable({
    enabled: v.boolean(),
    theme: v.string(), // caption topic — what Gemini writes the caption about, e.g. "Daily tech tips"
    imagePrompt: v.optional(v.string()), // image style/prompt — used directly to generate the image
    videoPrompt: v.optional(v.string()), // video style/prompt — used directly to generate the video
    contentType: v.optional(v.string()), // default content type for manual generation: "image" | "video"
    // Daily mix: which content type each fixed slot publishes. Configurable from the dashboard.
    morningType: v.optional(v.string()), // "image" | "video" (8:00 AM IST slot)
    nightType: v.optional(v.string()), // "image" | "video" (8:00 PM IST slot)
    platforms: v.array(v.string()), // ["facebook", "instagram"]
    rotationIndex: v.number(), // next image in the pool to use
    lastRunSlot: v.optional(v.string()), // "morning" | "night" — last slot that ran
    lastRunAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Queue of media (images AND videos) the auto-poster publishes from.
  // Historically image-only (hence the name); now holds both content types.
  autoPostImages: defineTable({
    // For a video that is still generating, storageId/url are filled in once ready.
    storageId: v.optional(v.id("_storage")),
    url: v.optional(v.string()),
    caption: v.optional(v.string()),
    contentType: v.optional(v.string()), // "image" | "video" (undefined = legacy image)
    // Video-only fields:
    videoPrompt: v.optional(v.string()),
    videoStatus: v.optional(v.string()), // "generating" | "ready" | "failed"
    videoGenerationId: v.optional(v.string()), // Veo long-running operation name
    videoError: v.optional(v.string()),
    createdAt: v.number(),
  }),
});
