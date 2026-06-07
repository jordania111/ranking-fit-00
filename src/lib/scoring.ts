export type Assessment = {
  id: string;
  user_id: string;
  assessment_date: string;
  weight: number;
  body_fat_pct: number | null;
  lean_mass: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  notes?: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  initial_weight: number | null;
  initial_body_fat: number | null;
  initial_lean_mass: number | null;
  start_date: string;
};

export function calcBMI(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Returns a 0–100 evolution score.
 *  40% body fat reduction, 40% lean mass gain, 20% weight loss.
 *  Caps each component so a single huge swing doesn't dominate.
 */
export function evolutionScore(p: {
  initialWeight?: number | null;
  currentWeight?: number | null;
  initialFat?: number | null;
  currentFat?: number | null;
  initialLean?: number | null;
  currentLean?: number | null;
}) {
  const fatDelta = (p.initialFat ?? 0) - (p.currentFat ?? 0); // positive = good
  const leanDelta = (p.currentLean ?? 0) - (p.initialLean ?? 0); // positive = good
  const weightDelta = (p.initialWeight ?? 0) - (p.currentWeight ?? 0); // positive = good

  // Normalize: 8% fat loss = full, 5kg lean = full, 10kg weight loss = full
  const fatScore = Math.max(0, Math.min(1, fatDelta / 8));
  const leanScore = Math.max(0, Math.min(1, leanDelta / 5));
  const wScore = Math.max(0, Math.min(1, weightDelta / 10));

  return Math.round((fatScore * 0.4 + leanScore * 0.4 + wScore * 0.2) * 100);
}

export type RankingMetric =
  | "evolution"
  | "weight_loss"
  | "fat_loss"
  | "lean_gain";

export type RankedUser = {
  profile: Profile;
  latest: Assessment | null;
  weightLoss: number;
  fatLoss: number;
  leanGain: number;
  score: number;
};

export function buildRanking(
  profiles: Profile[],
  assessments: Assessment[],
  metric: RankingMetric,
): RankedUser[] {
  const byUser = new Map<string, Assessment[]>();
  for (const a of assessments) {
    const arr = byUser.get(a.user_id) ?? [];
    arr.push(a);
    byUser.set(a.user_id, arr);
  }

  const ranked: RankedUser[] = profiles.map((p) => {
    const list = (byUser.get(p.id) ?? []).sort(
      (a, b) => +new Date(a.assessment_date) - +new Date(b.assessment_date),
    );
    const latest = list[list.length - 1] ?? null;
    const iw = p.initial_weight ?? list[0]?.weight ?? null;
    const ifat = p.initial_body_fat ?? list[0]?.body_fat_pct ?? null;
    const ilean = p.initial_lean_mass ?? list[0]?.lean_mass ?? null;

    const weightLoss = iw && latest ? iw - latest.weight : 0;
    const fatLoss =
      ifat != null && latest?.body_fat_pct != null
        ? ifat - latest.body_fat_pct
        : 0;
    const leanGain =
      ilean != null && latest?.lean_mass != null
        ? latest.lean_mass - ilean
        : 0;

    const score = evolutionScore({
      initialWeight: iw,
      currentWeight: latest?.weight,
      initialFat: ifat,
      currentFat: latest?.body_fat_pct,
      initialLean: ilean,
      currentLean: latest?.lean_mass,
    });

    return { profile: p, latest, weightLoss, fatLoss, leanGain, score };
  });

  const key: Record<RankingMetric, (r: RankedUser) => number> = {
    evolution: (r) => r.score,
    weight_loss: (r) => r.weightLoss,
    fat_loss: (r) => r.fatLoss,
    lean_gain: (r) => r.leanGain,
  };

  return ranked
    .filter((r) => r.latest != null)
    .sort((a, b) => key[metric](b) - key[metric](a));
}
