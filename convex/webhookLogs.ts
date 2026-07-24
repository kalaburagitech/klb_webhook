import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const logWebhook = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhookLogs", {
      provider: "meta",
      payload: args.payload,
      processed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "received",
    });
    // In a real application, you would parse the webhook payload
    // and trigger relevant actions based on the event type (e.g., messages, comments).
  },
});
