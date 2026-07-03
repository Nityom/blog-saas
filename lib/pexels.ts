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

async function searchPexels(
  query: string,
  perPage: number,
  apiKey: string
): Promise<{ src: { large: string; original: string }; photographer: string; photographer_url: string }[]> {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    {
      headers: {
        Authorization: apiKey,
      },
    }
  );

  if (!res.ok) {
    console.warn(`Pexels API error for query "${query}": ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  return data.photos ?? [];
}

/**
 * Fetches a relevant image from Pexels.
 * Accepts a single query string or an ordered list of queries to try in
 * sequence — the first query that returns a non-excluded photo wins.
 */
export async function fetchPexelsImage(
  queries: string | string[],
  excludeUrls: string[] = []
): Promise<PexelsImage> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("No PEXELS_API_KEY found, using fallback image.");
    return FALLBACK_IMAGE;
  }

  const excludeSet = new Set(excludeUrls);
  const queryList = Array.isArray(queries) ? queries : [queries];
  const perPage = Math.min(excludeSet.size + 15, 80);

  try {
    for (const query of queryList) {
      const photos = await searchPexels(query, perPage, apiKey);
      if (photos.length === 0) continue;

      // Prefer a photo not already used by this clinic.
      const photo =
        photos.find((p) => {
          const url = p.src.large || p.src.original;
          return !excludeSet.has(url);
        }) ?? photos[0];

      return {
        imageUrl: photo.src.large || photo.src.original,
        imageCredit: photo.photographer,
        imageCreditUrl: photo.photographer_url,
      };
    }

    return FALLBACK_IMAGE;
  } catch (error) {
    console.error("Failed to fetch Pexels image:", error);
    return FALLBACK_IMAGE;
  }
}
