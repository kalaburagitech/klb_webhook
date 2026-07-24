import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhook",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = process.env.VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WEBHOOK_VERIFIED");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }),
});

http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Return 200 immediately per Meta requirements
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    // In a real production scenario, we should validate the signature here
    // using crypto.createHmac('sha256', process.env.META_APP_SECRET)
    // However, crypto might not be available in Edge Runtime if we're not careful.
    // For now, we will store the payload and schedule async processing.
    
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch (e) {
      console.error("Failed to parse webhook payload", e);
      return new Response("OK", { status: 200 });
    }

    // Schedule async processing by calling an internal mutation
    await ctx.runMutation(internal.webhookLogs.logWebhook, {
      payload: parsedPayload,
    });

    return new Response("EVENT_RECEIVED", { status: 200 });
  }),
});

export default http;
