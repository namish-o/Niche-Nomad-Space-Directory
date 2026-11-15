// Optional: answer Niche questions from our own computer instead of the
// visitor's browser. The computer runs Ollama (qwen3:8b) and is reachable
// through an ngrok tunnel. Its address lives only in the NICHE_SERVER_URL
// environment variable here, so visitors never see it. If it isn't set, or
// the computer is off, GET says ready: false and the site falls back to the
// in-browser model.
//
// Guards: small max tokens, capped input, a per-visitor rate limit and a
// daily cap (kept in memory, so per server instance; fine for a hackathon).

const MAX_TOKENS = 400;
const MAX_INPUT_CHARS = 6000;
const PER_IP_LIMIT = 30; // requests per visitor...
const PER_IP_WINDOW_MS = 10 * 60 * 1000; // ...per 10 minutes
const DAILY_LIMIT = Number(env().NICHE_DAILY_LIMIT ?? 2000);

type Msg = { role: "system" | "user" | "assistant"; content: string };

function env(): Record<string, string | undefined> {
  return (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
}
const base = () => env().NICHE_SERVER_URL?.replace(/\/$/, "");
const model = () => env().NICHE_MODEL || "qwen3:8b";
// ngrok shows a warning page to browsers unless this header is sent.
const HEADERS = { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" };

const hits = new Map<string, number[]>();
let day = "";
let dayCount = 0;
function rateLimited(ip: string): string | null {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  if (dayCount >= DAILY_LIMIT) return "Niche has answered a lot today. Try again tomorrow.";
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < PER_IP_WINDOW_MS);
  if (recent.length >= PER_IP_LIMIT) return "That's a lot of questions in a short time. Wait a few minutes and try again.";
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  dayCount++;
  return null;
}

async function serverUp(): Promise<boolean> {
  const url = base();
  if (!url) return false;
  try {
    const r = await fetch(`${url}/api/tags`, { headers: HEADERS, signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

function cleanMessages(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .filter((m): m is Msg => ["system", "user", "assistant"].includes(m?.role) && typeof m?.content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  if (JSON.stringify(msgs).length > MAX_INPUT_CHARS) return null;
  return msgs;
}

interface NodeReq {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}
interface NodeRes {
  status(code: number): NodeRes;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

export default async function handler(req: NodeReq, res: NodeRes) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ ready: await serverUp() });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const url = base();
  if (!url) return res.status(503).json({ code: "off", error: "No Niche server is set up." });

  let body = req.body as { messages?: unknown; maxTokens?: unknown } | string | undefined;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Body must be JSON" });
    }
  }
  const b = (body ?? {}) as { messages?: unknown; maxTokens?: unknown };
  const messages = cleanMessages(b.messages);
  if (!messages) return res.status(400).json({ error: "Bad question" });
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const limited = rateLimited(ip);
  if (limited) return res.status(429).json({ error: limited });

  try {
    const r = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: HEADERS,
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: model(),
        messages,
        stream: false,
        think: false,
        options: { num_predict: Math.min(MAX_TOKENS, Number(b.maxTokens) || 200), temperature: 0.3 },
      }),
    });
    if (!r.ok) return res.status(503).json({ code: "off", error: `Niche server said ${r.status}` });
    const data = (await r.json()) as { message?: { content?: string } };
    const text = (data.message?.content ?? "").replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
    return res.status(200).json({ text });
  } catch {
    return res.status(503).json({ code: "off", error: "Couldn't reach the Niche server." });
  }
}
