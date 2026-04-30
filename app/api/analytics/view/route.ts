import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = 'edge';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// In-memory store for edge rate limiting
// Note: This works per-edge-isolate. For a global true rate limit, use Redis.
// But this is sufficient for basic protection as requested.
const rateLimitMap = new Map<string, number>();

function cleanupRateLimits() {
  const oneHourAgo = Date.now() - 3600 * 1000;
  for (const [key, timestamp] of rateLimitMap.entries()) {
    if (timestamp < oneHourAgo) {
      rateLimitMap.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, clinicId } = body;

    if (!postId || !clinicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    const rateKey = `${ip}:${postId}`;
    const now = Date.now();

    cleanupRateLimits();

    if (rateLimitMap.has(rateKey)) {
      const lastViewTime = rateLimitMap.get(rateKey)!;
      if (now - lastViewTime < 3600 * 1000) {
        return NextResponse.json(
          { message: "Rate limited" },
          { headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
    }

    rateLimitMap.set(rateKey, now);

    await convex.mutation(api.analytics.recordView, {
      clinicId: clinicId as any,
      postId: postId as any,
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
