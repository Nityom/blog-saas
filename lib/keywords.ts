export interface Keyword {
  _id: string;
  clinicId: string;
  term: string;
  localVariant: string;
  lastUsed?: number;
  timesUsed: number;
  performanceScore: number;
  lowRisk: boolean;
  paused: boolean;
  order?: number;
  createdAt: number;
}

export function selectNextKeyword(keywords: Keyword[]): Keyword | null {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
  const eligible = keywords.filter(kw => {
    if (kw.paused) return false;
    if (kw.lastUsed && kw.lastUsed > thirtyDaysAgo) return false;
    return true;
  });
  
  if (eligible.length === 0) return null;
  
  // Sort by order ASC (if present), then performanceScore DESC
  eligible.sort((a, b) => {
    const orderA = a.order ?? Infinity;
    const orderB = b.order ?? Infinity;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return b.performanceScore - a.performanceScore;
  });
  
  return eligible[0];
}
