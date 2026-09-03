const PROFANITY_PATTERNS = [
  /\bput[ao]s?\b/i,
  /\bpendej[oa]s?\b/i,
  /\bmalparid[oa]s?\b/i,
  /\bimbecil(es)?\b/i,
  /\bestupid[oa]s?\b/i,
  /\bidiot[ao]s?\b/i,
  /\bmaric[oa]s?\b/i,
  /\bcoño\b/i,
  /\bconch[ao]s?\b/i,
  /\bverga\b/i,
  /\bchinga(r|da)?\b/i,
  /\bcul[oe]\b/i,
  /\bmierda\b/i,
  /\bcarajo\b/i,
  /\bhp\b/i,
  /\bhdp\b/i,
  /\bfuck(ing)?\b/i,
  /\bshit\b/i,
  /\bbitch(es)?\b/i,
  /\basshole\b/i,
];

export interface ProfanityCheckResult {
  hasProfanity: boolean;
  matches: string[];
}

export function detectProfanity(text: string): ProfanityCheckResult {
  const normalized = text.trim();
  if (!normalized) {
    return { hasProfanity: false, matches: [] };
  }

  const matches: string[] = [];

  for (const pattern of PROFANITY_PATTERNS) {
    const match = normalized.match(pattern);
    if (match?.[0]) {
      matches.push(match[0]);
    }
  }

  return {
    hasProfanity: matches.length > 0,
    matches: [...new Set(matches)],
  };
}
