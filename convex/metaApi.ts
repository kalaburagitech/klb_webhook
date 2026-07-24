import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Generate appsecret_proof using Web Crypto (HMAC-SHA256)
async function generateAppSecretProof(accessToken: string, appSecret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(accessToken));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper to make graph API requests
async function graphApiRequest(endpoint: string, method: string, body?: any, token?: string) {
  let url = `https://graph.facebook.com/v25.0/${endpoint}`;
  const accessToken = token || process.env.META_ACCESS_TOKEN;
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    throw new Error("META_APP_SECRET is not configured in Convex Environment Variables. You must set it in the Convex Dashboard to generate the appsecret_proof.");
  }

  if (accessToken && appSecret) {
    const proof = await generateAppSecretProof(accessToken, appSecret);
    if (method === "POST" && body) {
      body.appsecret_proof = proof;
    } else {
      url += (url.includes("?") ? "&" : "?") + `appsecret_proof=${proof}`;
    }
  }
  
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error("Meta API Error:", data);
    const err = data.error;
    // code 190 = access token expired / invalid. Surface a clear, actionable message.
    if (err?.code === 190) {
      throw new Error(
        "Meta access token is expired or invalid. Regenerate it in the Graph API Explorer and update it with `npx convex env set META_ACCESS_TOKEN <new_token>`. " +
        (err.message || "")
      );
    }
    throw new Error(err?.message || "Unknown error from Meta API");
  }

  return data;
}

export const publishPost = action({
  args: {
    platform: v.string(), // "facebook" or "instagram"
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(v.string()), // "image", "video", "carousel", "reels"
  },
  handler: async (ctx, args) => {
    // This is a simplified example. In production, you'd fetch the specific page/account ID
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const igId = process.env.INSTAGRAM_BUSINESS_ID;

    if (args.platform === "facebook") {
      if (!pageId) throw new Error("FACEBOOK_PAGE_ID not configured");
      
      let endpoint = `${pageId}/feed`;
      let payload: any = { message: args.content };
      
      if (args.mediaUrl) {
        if (args.mediaType === "image") {
          endpoint = `${pageId}/photos`;
          payload = { message: args.content, url: args.mediaUrl };
        } else if (args.mediaType === "video") {
          endpoint = `${pageId}/videos`;
          payload = { description: args.content, file_url: args.mediaUrl };
        }
      }
      
      return await graphApiRequest(endpoint, "POST", payload);
    } 
    
    if (args.platform === "instagram") {
      if (!igId) throw new Error("INSTAGRAM_BUSINESS_ID not configured");
      
      // Instagram requires a two-step process: Create a container, then publish it.
      let containerPayload: any = { caption: args.content };
      
      if (args.mediaUrl) {
        if (args.mediaType === "image") {
          containerPayload.image_url = args.mediaUrl;
        } else if (args.mediaType === "video" || args.mediaType === "reels") {
          containerPayload.video_url = args.mediaUrl;
          containerPayload.media_type = args.mediaType === "reels" ? "REELS" : "VIDEO";
        }
      } else {
        throw new Error("Instagram requires media (image or video)");
      }

      // Step 1: Create Container
      const containerResponse = await graphApiRequest(`${igId}/media`, "POST", containerPayload);
      const creationId = containerResponse.id;

      // Step 1b: Wait for Meta to finish processing the container before publishing.
      // Publishing too early fails with "Media ID is not available". Poll status_code
      // until FINISHED (images are usually quick; videos/reels take longer).
      const maxAttempts = 30; // ~60s max
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const statusResp = await graphApiRequest(
          `${creationId}?fields=status_code,status`,
          "GET"
        );
        const code = statusResp.status_code;
        if (code === "FINISHED") break;
        if (code === "ERROR" || code === "EXPIRED") {
          throw new Error(
            `Instagram media processing failed (status: ${code}). ${statusResp.status || ""}`
          );
        }
        if (attempt === maxAttempts - 1) {
          throw new Error(
            "Instagram media is still processing after 60s. Try again, or use a smaller/standard image."
          );
        }
        // wait 2s before checking again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Step 2: Publish Container
      const publishResponse = await graphApiRequest(`${igId}/media_publish`, "POST", {
        creation_id: creationId,
      });

      return publishResponse;
    }

    throw new Error(`Unsupported platform: ${args.platform}`);
  },
});

export const getInsights = action({
  args: { platform: v.string(), objectId: v.string(), metric: v.string() },
  handler: async (ctx, args) => {
    return await graphApiRequest(`${args.objectId}/insights?metric=${args.metric}`, "GET");
  },
});
