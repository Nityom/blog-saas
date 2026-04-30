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

export async function fetchPexelsImage(query: string): Promise<PexelsImage> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("No PEXELS_API_KEY found, using fallback image.");
    return FALLBACK_IMAGE;
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
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

    const photo = data.photos[0];
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
