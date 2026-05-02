import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { encrypt } from "@/lib/encryption";

export const runtime = "edge";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function failRedirect(clinicId: string, error: string, baseUrl: string) {
  const url = new URL(`/super-admin/clinics/${clinicId}`, baseUrl);
  url.searchParams.set("socialError", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const publicAppId = process.env.NEXT_PUBLIC_META_APP_ID || appId;
  const code = request.nextUrl.searchParams.get("code");
  const clinicId = request.nextUrl.searchParams.get("state");

  if (!clinicId || !code || !appId || !appSecret || !publicAppId) {
    return failRedirect(clinicId || "", "missing_oauth_parameters", baseUrl);
  }

  try {
    const redirectUri = `${baseUrl}/api/connect/facebook/callback`;

    const shortTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${encodeURIComponent(publicAppId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`
    );
    const shortTokenPayload = await shortTokenResponse.json();
    if (!shortTokenResponse.ok) {
      throw new Error(JSON.stringify(shortTokenPayload));
    }

    const longTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(publicAppId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortTokenPayload.access_token)}`
    );
    const longTokenPayload = await longTokenResponse.json();
    if (!longTokenResponse.ok) {
      throw new Error(JSON.stringify(longTokenPayload));
    }

    const pageResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${encodeURIComponent(longTokenPayload.access_token)}`
    );
    const pagePayload = await pageResponse.json();
    if (!pageResponse.ok) {
      throw new Error(JSON.stringify(pagePayload));
    }

    const page = pagePayload.data?.[0];
    if (!page) {
      throw new Error("No Facebook Pages were returned for this account");
    }

    const instagramResponse = await fetch(
      `https://graph.facebook.com/v18.0/${encodeURIComponent(page.id)}?fields=instagram_business_account&access_token=${encodeURIComponent(page.access_token)}`
    );
    const instagramPayload = await instagramResponse.json();
    if (!instagramResponse.ok) {
      throw new Error(JSON.stringify(instagramPayload));
    }

    await convex.mutation(api.clinics.update, {
      clinicId: clinicId as Id<"clinics">,
      metaPageId: page.id,
      metaPageName: page.name,
      metaPageAccessTokenEncrypted: await encrypt(page.access_token),
      metaTokenExpiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
      metaInstagramAccountId: instagramPayload.instagram_business_account?.id,
    });

    const redirectUrl = new URL(`/super-admin/clinics/${clinicId}`, baseUrl);
    redirectUrl.searchParams.set("socialSuccess", "1");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return failRedirect(clinicId, message, baseUrl);
  }
}