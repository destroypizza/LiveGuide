export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL?.trim() || API_BASE || "http://localhost:4000";

