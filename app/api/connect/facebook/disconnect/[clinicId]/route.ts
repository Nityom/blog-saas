import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const runtime = "edge";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    await convex.mutation(api.clinics.clearMetaConnection, {
      clinicId: params.clinicId as Id<"clinics">,
    });

    const redirectUrl = new URL(`/super-admin/clinics/${params.clinicId}`, baseUrl);
    redirectUrl.searchParams.set("socialDisconnected", "1");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const redirectUrl = new URL(`/super-admin/clinics/${params.clinicId}`, baseUrl);
    redirectUrl.searchParams.set("socialError", error instanceof Error ? error.message : "disconnect_failed");
    return NextResponse.redirect(redirectUrl);
  }
}