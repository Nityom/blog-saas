function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function buildSvgOverlay(storyText: string, clinicName: string) {
  const wrappedStory = wrapText(storyText, 24);
  const storyLines = wrappedStory
    .map((line, index) => `<tspan x="540" dy="${index === 0 ? 0 : 88}">${escapeXml(line)}</tspan>`)
    .join("");

  const clinicLines = wrapText(clinicName, 28)
    .map((line, index) => `<tspan x="540" dy="${index === 0 ? 0 : 44}">${escapeXml(line)}</tspan>`)
    .join("");

  return Buffer.from(`
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
        </filter>
      </defs>
      <rect width="1080" height="1920" fill="transparent" />
      <g filter="url(#softShadow)">
        <text x="540" y="870" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" text-anchor="middle">${storyLines}</text>
        <text x="540" y="1120" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="600" text-anchor="middle">${clinicLines}</text>
        <text x="540" y="1800" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" text-anchor="middle">🦷</text>
      </g>
    </svg>
  `);
}

export async function createStoryImage(
  imageUrl: string,
  storyText: string,
  clinicName: string
): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status}`);
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());

  try {
    return await sharp(sourceBuffer)
      .resize(1080, 1920, { fit: "cover", position: "center" })
      .composite([
        {
          input: Buffer.from(`
            <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
              <rect width="1080" height="1920" fill="rgba(0,0,0,0.45)" />
            </svg>
          `),
        },
        {
          input: buildSvgOverlay(storyText, clinicName),
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    const retryResponse = await fetch(imageUrl);
    if (!retryResponse.ok) {
      return sourceBuffer;
    }

    return Buffer.from(await retryResponse.arrayBuffer());
  }
}