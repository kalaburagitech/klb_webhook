import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

export const getDuePosts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_status_and_time", (q) => 
        q.eq("status", "pending").lte("scheduledTime", now)
      )
      .collect();

    // Join with posts table to get content
    const fullPosts = await Promise.all(
      posts.map(async (sp) => {
        const post = await ctx.db.get(sp.postId);
        return { ...sp, content: post?.content || "" };
      })
    );
    
    return fullPosts;
  },
});

export const getScheduledPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_status_and_time", (q) => 
        q.eq("status", "pending")
      )
      .collect();

    // Join with posts table to get content
    const fullPosts = await Promise.all(
      posts.map(async (sp) => {
        const post = await ctx.db.get(sp.postId);
        return { ...sp, content: post?.content || "" };
      })
    );
    
    return fullPosts;
  },
});

export const listDashboardPosts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posts").order("desc").collect();
  },
});

export const listWebhookLogs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("webhookLogs").order("desc").take(50);
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const totalPosts = (await ctx.db.query("posts").collect()).length;
    const scheduledPosts = (await ctx.db.query("scheduledPosts").filter(q => q.eq(q.field("status"), "pending")).collect()).length;
    const failedJobs = (await ctx.db.query("failedJobs").filter(q => q.eq(q.field("status"), "pending_retry")).collect()).length;

    return { totalPosts, scheduledPosts, failedJobs };
  }
});
