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
  
  // Sort by performanceScore DESC
  eligible.sort((a, b) => b.performanceScore - a.performanceScore);
  
  return eligible[0];
}
