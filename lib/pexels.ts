export interface PexelsImage {
  imageUrl: string;
  imageCredit: string;
  imageCreditUrl: string;
}

const FALLBACK_IMAGE: PexelsImage = {
  imageUrl: "/dental-placeholder.jpg",
  imageCredit: "Unsplash",
  imageCreditUrl: "https://unsplash.com",
};

export async function fetchPexelsImage(
  query: string,
  excludeUrls: string[] = []
): Promise<PexelsImage> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("No PEXELS_API_KEY found, using fallback image.");
    return FALLBACK_IMAGE;
  }

  const excludeSet = new Set(excludeUrls);

  try {
    // Fetch enough results so we can skip already-used images.
    const perPage = Math.min(excludeSet.size + 15, 80);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!res.ok) {
      console.warn(`Pexels API error: ${res.statusText}, using fallback.`);
      return FALLBACK_IMAGE;
    }

    const data = await res.json();
    if (!data.photos || data.photos.length === 0) {
      return FALLBACK_IMAGE;
    }

    // Pick the first photo whose URL hasn't already been used.
    const photo =
      data.photos.find((p: { src: { large: string; original: string } }) => {
        const url = p.src.large || p.src.original;
        return !excludeSet.has(url);
      }) ?? data.photos[0];

    return {
      imageUrl: photo.src.large || photo.src.original,
      imageCredit: photo.photographer,
      imageCreditUrl: photo.photographer_url,
    };
  } catch (error) {
    console.error("Failed to fetch Pexels image:", error);
    return FALLBACK_IMAGE;
  }
}
