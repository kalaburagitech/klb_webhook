import { NextResponse } from "next/server";

// This Next.js API route handles Meta Webhook verification
// and forwards actual webhook events to Convex.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WEBHOOK_VERIFIED by Next.js");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  // Read the raw payload
  const payload = await request.text();
  
  // Forward to Convex HTTP action to actually save to DB
  // This uses the NEXT_PUBLIC_CONVEX_URL, but changes .cloud to .site
  const convexUrl = (process.env.NEXT_PUBLIC_CONVEX_URL || "").replace(".cloud", ".site") + "/webhook";
  
  if (convexUrl) {
    try {
      fetch(convexUrl, {
        method: "POST",
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": request.headers.get("x-hub-signature-256") || "",
        },
      }).catch(e => console.error("Error forwarding webhook to Convex", e));
    } catch (error) {
      console.error("Failed to forward to Convex", error);
    }
  }

  // Always return 200 OK immediately to Meta
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
