const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const createStream = async (broadcasterId) => {
  const response = await fetch(`${API_BASE}/api/streams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ broadcasterId }),
  });
  if (!response.ok) {
    throw new Error("Failed to create stream");
  }
  return response.json();
};

export const fetchStreams = async () => {
  const response = await fetch(`${API_BASE}/api/streams`);
  if (!response.ok) {
    throw new Error("Failed to load streams");
  }
  return response.json();
};
