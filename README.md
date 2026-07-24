# KalaburagiTech Social Media Automation

A production-ready Next.js 15 and Convex application for automating and scheduling social media posts via the Meta Graph API.

## Architecture

- **Frontend:** Next.js 15 (App Router), Tailwind CSS (v4), Lucide React
- **Backend/Database:** Convex (Serverless Database, Scheduled Crons, HTTP Webhooks)
- **APIs:** Meta Graph API (Facebook Pages API, Instagram Business API)

## Getting Started Locally

1. **Install Dependencies:**
   Ensure you run `npm install` to install all Next.js and Convex dependencies.

2. **Environment Variables:**
   A `.env.local` file has been created. Ensure it contains your Meta App IDs, secrets, tokens, and Convex deployment URLs.
   
3. **Run Development Servers:**
   Due to Next.js and Convex needing separate processes, you can run:
   - `npm run dev` (Starts Next.js frontend on http://localhost:3000)
   - `npx convex dev` (Syncs schema and starts Convex local dev connection)

   *(Note: If you encounter SSL proxy errors like `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on Windows, try running with `NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev`)*

## Deployment to Vercel

This project is fully ready to be deployed to Vercel.

1. Push your code to a GitHub repository.
2. Import the project into Vercel.
3. In the Vercel Dashboard, add all Environment Variables from your `.env.local` file.
   - `CONVEX_DEPLOYMENT`
   - `NEXT_PUBLIC_CONVEX_URL`
   - `CONVEX_URL`
   - `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN`
   - `VERIFY_TOKEN` (Ensure this matches your Meta Developer Portal webhook config)
   - `FACEBOOK_PAGE_ID`, `INSTAGRAM_BUSINESS_ID`
   - `ADMIN_PASSWORD` (Used for the simple admin login page)
4. Click Deploy. Vercel will automatically build the Next.js app. Convex runs independently on its cloud.

## Meta App & Webhook Configuration

1. Go to the [Meta App Dashboard](https://developers.facebook.com/).
2. Under your App > **Webhooks**, subscribe to the relevant Page/Instagram objects.
3. Use the following URL for the Webhook Callback:
   `https://usable-stingray-452.convex.site/webhook`
4. Use the `VERIFY_TOKEN` defined in your environment variables.
5. Meta will send a `GET` request which Convex `http.ts` will verify and respond with the challenge.
6. Once verified, subscribe to fields like `feed`, `messages`, `comments`, etc.

## Testing Guide (Postman)

To test the Webhook locally or verify the HTTP action, you can use Postman or cURL.

**1. Test Webhook Verification (GET):**
```bash
curl -X GET "https://usable-stingray-452.convex.site/webhook?hub.mode=subscribe&hub.verify_token=kalaburagitech_secure_verify_token&hub.challenge=123456789"
```
*Expected Response:* `123456789` (HTTP 200)

**2. Test Webhook Event (POST):**
```bash
curl -X POST "https://usable-stingray-452.convex.site/webhook" \
     -H "Content-Type: application/json" \
     -d '{"object":"page","entry":[{"id":"PAGE_ID","time":1620000000,"changes":[{"field":"feed","value":{"item":"post","verb":"add"}}]}]}'
```
*Expected Response:* `EVENT_RECEIVED` (HTTP 200)

**3. Test Convex Cron Jobs:**
Open the [Convex Dashboard](https://usable-stingray-452.convex.cloud), navigate to the **Functions** or **Logs** tab, and you can manually invoke `crons.processScheduledPosts` to test the publishing flow without waiting for the next minute tick.
