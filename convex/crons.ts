import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";

const crons = cronJobs();

// Run every minute to publish scheduled posts
crons.interval(
  "publish-scheduled-posts",
  { minutes: 1 }, // every minute
  internal.crons.processScheduledPosts
);

export const processScheduledPosts = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get pending posts that are due
    const pendingPosts = await ctx.runQuery(internal.queries.getDuePosts);
    
    for (const post of pendingPosts) {
      try {
        // Try to publish
        const result = await ctx.runAction(internal.metaApi.publishPost, {
          platform: post.platforms[0], // simplified, ideally loop platforms
          content: post.content,
          // mediaUrl: post.mediaUrl, // Need to join with media table in a real app
        });

        // Mark success
        await ctx.runMutation(internal.mutations.updateScheduledPostStatus, {
          id: post._id,
          status: "published",
        });
      } catch (e: any) {
        // Log failure and retry logic
        await ctx.runMutation(internal.mutations.handlePostFailure, {
          id: post._id,
          error: e.message,
        });
      }
    }
  },
});

export default crons;
