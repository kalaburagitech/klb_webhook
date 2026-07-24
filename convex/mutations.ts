import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateScheduledPostStatus = internalMutation({
  args: { id: v.id("scheduledPosts"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const handlePostFailure = internalMutation({
  args: { id: v.id("scheduledPosts"), error: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return;

    // simplistic retry logic: max 3 retries
    const existingJob = await ctx.db.query("failedJobs")
      .filter(q => q.eq(q.field("payload"), args.id))
      .first();

    if (existingJob) {
      const retries = existingJob.retries + 1;
      const status = retries >= 3 ? "failed_permanently" : "pending_retry";
      await ctx.db.patch(existingJob._id, {
        retries,
        status,
        error: args.error,
        updatedAt: Date.now(),
      });
      if (status === "failed_permanently") {
        await ctx.db.patch(args.id, { status: "failed", updatedAt: Date.now() });
      }
    } else {
      await ctx.db.insert("failedJobs", {
        jobType: "publishPost",
        payload: args.id,
        error: args.error,
        retries: 1,
        status: "pending_retry",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const createPost = mutation({
  args: {
    content: v.string(),
    platforms: v.array(v.string()),
    scheduledTime: v.optional(v.number()),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      content: args.content,
      platforms: args.platforms,
      mediaUrl: args.mediaUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: args.scheduledTime ? "scheduled" : "draft",
    });

    if (args.scheduledTime) {
      await ctx.db.insert("scheduledPosts", {
        postId,
        scheduledTime: args.scheduledTime,
        platforms: args.platforms,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "pending",
      });
    }

    return postId;
  },
});

export const updatePost = mutation({
  args: {
    id: v.id("posts"),
    content: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deletePost = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUploadUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
