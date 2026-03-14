const FRACTIONS: [number, string][] = [
  [0.125, "1/8"],
  [0.167, "1/6"],
  [0.25, "1/4"],
  [0.333, "1/3"],
  [0.375, "3/8"],
  [0.5, "1/2"],
  [0.625, "5/8"],
  [0.667, "2/3"],
  [0.75, "3/4"],
  [0.833, "5/6"],
  [0.875, "7/8"],
];

/**
 * Convert a decimal quantity to a human-friendly fraction string.
 * Snaps to the nearest common fraction (within ~5% tolerance).
 * Examples: 0.25 → "1/4", 1.5 → "1 1/2", 0.38 → "1/3", 2.667 → "2 2/3"
 */
export function formatQuantity(value: number | null | undefined): string {
  if (value == null) return "";
  if (value === 0) return "0";

  const whole = Math.floor(value);
  const frac = value - whole;

  // No fractional part
  if (frac < 0.03) return String(whole);

  // Find closest fraction match
  let bestMatch: string | null = null;
  let bestDist = Infinity;

  for (const [dec, label] of FRACTIONS) {
    const dist = Math.abs(frac - dec);
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = label;
    }
  }

  // Snap if within ~5% tolerance (handles weird AI values like 0.38 → 1/3)
  if (bestMatch && bestDist < 0.05) {
    return whole > 0 ? `${whole} ${bestMatch}` : bestMatch;
  }

  // Close to 1.0 — round up to next whole
  if (frac > 0.95) return String(whole + 1);

  // No fraction match — show clean decimal
  return String(parseFloat(value.toFixed(2)));
}
