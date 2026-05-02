export function parseJsonFromText<T>(text: string): T {
  const trimmed = text.trim();

  const candidates = new Set<string>([trimmed]);

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    candidates.add(fencedMatch[1].trim());
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.add(trimmed.slice(objectStart, objectEnd + 1).trim());
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.add(trimmed.slice(arrayStart, arrayEnd + 1).trim());
  }

  let lastError: unknown;
  for (const candidate of Array.from(candidates)) {
    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to parse JSON from model output");
}