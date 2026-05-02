import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { storageId } = await request.json();

    if (!storageId) {
      return Response.json({ error: "storageId is required" }, { status: 400 });
    }

    const url = await convex.mutation(api.posts.getStorageUrl, { 
      storageId: storageId as Id<"_storage"> 
    });

    if (!url) {
      return Response.json({ error: "Failed to get storage URL" }, { status: 400 });
    }

    return Response.json({ url });
  } catch (error: unknown) {
    console.error("Error getting storage URL:", error);
    return Response.json(
      { error: (error as Error).message || "Failed to get storage URL" },
      { status: 500 }
    );
  }
}
