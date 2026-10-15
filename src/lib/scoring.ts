// TypeScript mirror of Section 7 (Steps 1-3), used for unit tests.
export type Component = 'self' | 'manager' | 'upward' | 'slt';
export const avgOf = (scores: (number | null | undefined)[]) => {
  const v = scores.filter((s): s is number => s != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export type Weights = Record<Component, number>;
export function composite(
  s: Record<Component, number | null>,
  w: Weights,
  mode: 'renormalize' | 'require_all' = 'renormalize',
): number | null {
  const keys = (Object.keys(w) as Component[]).filter((k) => w[k] > 0);
  if (mode === 'require_all' && keys.some((k) => s[k] == null)) return null;
  const present = keys.filter((k) => s[k] != null);
  const den = present.reduce((a, k) => a + w[k], 0);
  if (!den) return null;
  return present.reduce((a, k) => a + w[k] * (s[k] as number), 0) / den;
}
