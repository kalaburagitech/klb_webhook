import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Helper to make graph API requests
async function graphApiRequest(endpoint: string, method: string, body?: any, token?: string) {
  const url = `https://graph.facebook.com/v25.0/${endpoint}`;
  const accessToken = token || process.env.META_ACCESS_TOKEN;
  
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
    throw new Error(data.error?.message || "Unknown error from Meta API");
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
