// Per-post outline & angle rotation.
//
// Without this, every clinic on the same keyword produces a near-identical
// article. Google deduplicates aggressively, especially for medical content.
// We deterministically rotate among multiple outline templates and content
// angles so the same keyword across clinics produces structurally different
// articles, and successive posts on the same clinic don't feel formulaic.

export const OUTLINE_TEMPLATES: { id: string; name: string; outline: string }[] = [
  {
    id: "patient-journey",
    name: "Patient Journey",
    outline: `## Why patients in {city} ask about this
## What to expect step-by-step
## Recovery, aftercare and timelines
## Costs and what affects them
## How {clinic} approaches this treatment
## Frequently asked questions`,
  },
  {
    id: "comparison",
    name: "Comparison / Decision Guide",
    outline: `## What is {keyword}? A plain-English explanation
## How it compares to the alternatives
## Who is (and isn't) a good candidate
## What it really costs in {city}
## Choosing the right dentist for {keyword}
## Frequently asked questions`,
  },
  {
    id: "myth-busting",
    name: "Myth-Busting / Concerns",
    outline: `## Common myths about {keyword} (and the truth)
## Real risks vs imagined ones
## What modern technology has changed
## Recovery: what's normal vs what to call your dentist about
## When to seek treatment in {city}
## Frequently asked questions`,
  },
  {
    id: "cost-deep-dive",
    name: "Cost Deep-Dive",
    outline: `## Typical cost range for {keyword} in {city}
## What drives the price up or down
## Hidden fees most patients miss
## Insurance, EMI and payment options
## Why cheapest isn't always best
## Frequently asked questions`,
  },
  {
    id: "prevention-first",
    name: "Prevention-First",
    outline: `## How to prevent the need for {keyword}
## Early warning signs you shouldn't ignore
## At-home care that actually works
## When prevention isn't enough: treatment options
## Long-term outcomes to expect
## Frequently asked questions`,
  },
];

export const CONTENT_ANGLES: { id: string; instruction: string }[] = [
  { id: "data-driven", instruction: "Lead with concrete numbers, percentages, recovery timelines and cost ranges. Cite typical figures for India where relevant." },
  { id: "storytelling", instruction: "Open with a relatable patient scenario (anonymised, no fake testimonials). Use second person (\"you\") throughout." },
  { id: "expert-explainer", instruction: "Write as the doctor explaining to a curious adult patient — clinical but warm, naming techniques and tools where appropriate." },
  { id: "fast-answers", instruction: "Front-load every section with a 1-sentence direct answer in **bold**, then expand. Optimised for Google featured snippets." },
  { id: "decision-helper", instruction: "Frame the post as helping the reader decide: lots of pros/cons lists, \"if X then consider Y\" guidance, no fluff." },
];

/**
 * Pick deterministically based on the post count for that clinic so each
 * successive post rotates through the templates. Uses keyword + clinic to
 * also vary across clinics writing on the same topic.
 */
export function pickRotation(seed: string, postIndex: number) {
  const hash = stringHash(seed);
  const outlineIdx = (postIndex + hash) % OUTLINE_TEMPLATES.length;
  const angleIdx = (postIndex * 3 + hash * 7) % CONTENT_ANGLES.length;
  return {
    outline: OUTLINE_TEMPLATES[Math.abs(outlineIdx)],
    angle: CONTENT_ANGLES[Math.abs(angleIdx)],
  };
}

function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Build the "Unique facts the AI must weave in" block from clinic data.
 * Returns "" when there is nothing distinctive — caller should detect that
 * and warn the operator (because it's the #1 cause of duplicate content).
 */
export function buildClinicFactsBlock(clinic: {
  clinicFacts?: string;
  uniqueSellingPoints?: string[];
  equipmentBrands?: string[];
  neighborhoodLandmarks?: string;
  establishedYear?: number;
  authorBio?: string;
}): string {
  const lines: string[] = [];
  if (clinic.establishedYear) {
    lines.push(`- Clinic established: ${clinic.establishedYear}`);
  }
  if (clinic.uniqueSellingPoints?.length) {
    lines.push(`- Unique selling points: ${clinic.uniqueSellingPoints.join("; ")}`);
  }
  if (clinic.equipmentBrands?.length) {
    lines.push(`- Equipment / brands used: ${clinic.equipmentBrands.join(", ")}`);
  }
  if (clinic.neighborhoodLandmarks?.trim()) {
    lines.push(`- Location landmarks: ${clinic.neighborhoodLandmarks.trim()}`);
  }
  if (clinic.authorBio?.trim()) {
    lines.push(`- Doctor background: ${clinic.authorBio.trim()}`);
  }
  if (clinic.clinicFacts?.trim()) {
    lines.push(clinic.clinicFacts.trim());
  }
  return lines.join("\n");
}
