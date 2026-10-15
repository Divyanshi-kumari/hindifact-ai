const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export async function api(path, body) {
  let r;
  try {
    r = await fetch(BASE + path, body ? {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)} : undefined);
  } catch { throw new Error("Cannot reach the backend. Start it with: uvicorn app:app --port 8000"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || (typeof j.detail === "string" ? j.detail : "Request failed (" + r.status + ")"));
  return j;
}
