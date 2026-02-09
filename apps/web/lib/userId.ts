export function getOrCreateUserId() {
  if (typeof window === "undefined") return "anonymous";

  const key = "live_control_user_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `u_${crypto.randomUUID()}`
      : `u_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  window.localStorage.setItem(key, next);
  return next;
}

