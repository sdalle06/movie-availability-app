/**
 * Region usefulness for a France-based household.
 *
 * The app's whole point is surfacing cross-region streaming availability the
 * user reaches via VPN on services they pay for. The one tier that is NOT
 * useful is EU/EEA countries other than France: under the EU Cross-Border
 * Portability Regulation (2017/1128), a VPN to another EU/EEA state still
 * serves the subscriber their FRENCH home catalogue, so those listings can
 * never be acted on. Every other region (France itself, plus all non-EU/EEA
 * countries such as US, CA, GB, KR, and micro-states) is genuinely reachable.
 */

export const HOME_REGION = 'FR';

/**
 * Preferred fallback regions when a title isn't on the French catalogue. These
 * are the user's go-to VPN destinations (English audio/subs are fine), so they
 * get highlighted ahead of other non-EU regions.
 */
export const PREFERRED_REGIONS = ['US', 'CA'];

/**
 * EU + EEA member states EXCEPT France. Streaming availability in these is
 * locked away by portability rules, so it's treated as noise.
 */
export const PORTABILITY_LOCKED_REGIONS: ReadonlySet<string> = new Set([
  // EU member states (minus FR)
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI',
  'ES', 'SE',
  // EEA (non-EU) — portability was extended to these
  'IS', 'LI', 'NO'
]);

export function isHomeRegion(countryCode: string): boolean {
  return countryCode === HOME_REGION;
}

/** A preferred fallback region (US/CA) for when France doesn't have the title. */
export function isPreferredRegion(countryCode: string): boolean {
  return PREFERRED_REGIONS.includes(countryCode);
}

/**
 * Display rank for sorting usable regions: France first (0), then preferred
 * fallbacks US/CA (1), then all other VPN-reachable regions (2).
 */
export function regionRank(countryCode: string): number {
  if (isHomeRegion(countryCode)) return 0;
  if (isPreferredRegion(countryCode)) return 1;
  return 2;
}

/** EU/EEA-except-France: unreachable from France even with a VPN. */
export function isPortabilityLocked(countryCode: string): boolean {
  return PORTABILITY_LOCKED_REGIONS.has(countryCode);
}

/** France (home) or any non-EU/EEA country (VPN-reachable). */
export function isUsableRegion(countryCode: string): boolean {
  return !isPortabilityLocked(countryCode);
}
