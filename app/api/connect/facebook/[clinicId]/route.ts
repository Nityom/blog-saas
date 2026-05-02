import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  const appId = process.env.META_APP_ID;
  const publicAppId = process.env.NEXT_PUBLIC_META_APP_ID || appId;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (!appId || !publicAppId) {
    return NextResponse.redirect(
      new URL(`/super-admin/clinics/${params.clinicId}?socialError=missing_meta_app_id`, baseUrl)
    );
  }

  const redirectUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  redirectUrl.searchParams.set("client_id", publicAppId);
  redirectUrl.searchParams.set("redirect_uri", `${baseUrl}/api/connect/facebook/callback`);
  redirectUrl.searchParams.set(
    "scope",
    "pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish"
  );
  redirectUrl.searchParams.set("state", params.clinicId);
  redirectUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(redirectUrl);
}