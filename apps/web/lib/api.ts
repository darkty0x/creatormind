const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export async function getStatus() {
  const res = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function createGoal(body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/goals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runCycle(body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/cycle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
