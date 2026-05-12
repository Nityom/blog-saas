import { ImageResponse } from "next/og";

// Edge runtime is fastest for OG images and lets next/og work without bundling
// Node-only modules.
export const runtime = "edge";
export const revalidate = 60 * 60 * 24; // cache 1 day at the edge

const SIZE = { width: 1200, height: 630 };

/**
 * Dynamic Open Graph / Twitter card generator.
 *
 * Usage: `<meta property="og:image" content="/api/og?title=...&clinic=...&city=..." />`
 *
 * Fallback for posts that don't have a great Pexels image. Branded, on-message
 * social cards lift click-through from Facebook, WhatsApp, LinkedIn, X.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "Dental Insights").slice(0, 120);
  const clinic = (searchParams.get("clinic") || "").slice(0, 80);
  const city = (searchParams.get("city") || "").slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background:
            "linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #3b82f6 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            opacity: 0.9,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            🦷
          </div>
          <span style={{ fontSize: 24, fontWeight: 600 }}>{clinic || "Dental Blog"}</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <h1
            style={{
              fontSize: title.length > 70 ? 56 : 68,
              fontWeight: 800,
              lineHeight: 1.1,
              margin: 0,
              maxWidth: 1080,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          {city && (
            <p
              style={{
                fontSize: 28,
                margin: 0,
                opacity: 0.85,
                fontWeight: 500,
              }}
            >
              {city}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            opacity: 0.8,
          }}
        >
          <span>Read on the blog →</span>
          {clinic && <span style={{ fontWeight: 600 }}>{clinic}</span>}
        </div>
      </div>
    ),
    SIZE,
  );
}
