export function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function secondsLeft(endsAtIso: string | null | undefined): number | null {
  const ms = parseIsoMs(endsAtIso);
  if (ms === null) return null;
  return Math.max(0, Math.ceil((ms - Date.now()) / 1000));
}

