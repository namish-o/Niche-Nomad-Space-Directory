// Main-thread side of Niche, the small AI model that runs in the visitor's
// own browser (see niche.worker.ts). Nothing is sent to a server and there is
// no API key. The model downloads only when someone first opens the Niche
// chat or uses plain-English search, and is cached after that.

export type Msg = { role: "system" | "user" | "assistant"; content: string };

export interface NicheStatus {
  phase: "idle" | "ask" | "loading" | "ready" | "error";
  /** Bytes so far and in total while downloading (0 when cached or unknown). */
  loaded: number;
  total: number;
  device: "server" | "webgpu" | "wasm" | null;
  error: string | null;
}

export class NicheUnavailable extends Error {
  constructor(message = "Niche couldn't start in this browser.") {
    super(message);
    this.name = "NicheUnavailable";
  }
}

let status: NicheStatus = { phase: "idle", loaded: 0, total: 0, device: null, error: null };
const listeners = new Set<(s: NicheStatus) => void>();
const set = (patch: Partial<NicheStatus>) => {
  status = { ...status, ...patch };
  listeners.forEach((f) => f(status));
};

export const nicheStatus = () => status;
export function onNicheStatus(f: (s: NicheStatus) => void) {
  listeners.add(f);
  return () => void listeners.delete(f);
}

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void; onText?: (t: string) => void }>();

function friendly(raw: string): string {
  if (/memory|alloc|OOM/i.test(raw)) return "Niche needs more memory than this device has free. Try closing other tabs, or use a laptop.";
  if (/fetch|network|Failed to load/i.test(raw)) return "Couldn't download Niche. Check your connection and try again.";
  return "Niche couldn't start in this browser. Try a recent Chrome or Edge on a laptop.";
}

// Ask before the first big download. Once someone says yes the model is in
// their browser cache, so we remember the answer and don't ask again.
const OK_KEY = "niche-download-ok";
const hasOk = () => {
  try {
    return localStorage.getItem(OK_KEY) === "yes";
  } catch {
    return false;
  }
};
let consent: Promise<boolean> | null = null;
let answer: ((yes: boolean) => void) | null = null;
/** Called by the popup (NicheConsent in NicheChat). */
export function answerNicheDownload(yes: boolean) {
  if (yes) {
    try {
      localStorage.setItem(OK_KEY, "yes");
    } catch {
      /* we'll just ask again next visit */
    }
  }
  answer?.(yes);
  answer = null;
  consent = null;
}

// The team's own computer can answer instead (api/niche.ts). Checked once per
// page; if it's up, nobody has to download anything.
const SERVER = "/api/niche";
let useServer: Promise<boolean> | null = null;
function serverUp(): Promise<boolean> {
  useServer ??= fetch(SERVER, { signal: AbortSignal.timeout(5000) })
    .then(async (r) => r.ok && (r.headers.get("content-type") ?? "").includes("json") && (await r.json()).ready === true)
    .catch(() => false);
  return useServer;
}

/** Get Niche ready: the server if it's up, otherwise the in-browser model. Safe to call many times. */
export async function loadNiche(): Promise<void> {
  if (ready) return ready;
  if (status.phase !== "ask" && (await serverUp())) {
    set({ phase: "ready", device: "server", error: null });
    return;
  }
  if (ready) return ready;
  if (!hasOk()) {
    // No popup on this page (the embed view): don't wait for an answer that can't come.
    if (!listeners.size) throw new NicheUnavailable("Niche isn't available in this view.");
    consent ??= new Promise<boolean>((resolve) => {
      answer = resolve;
      set({ phase: "ask", error: null });
    });
    if (!(await consent)) {
      set({ phase: "idle" });
      throw new NicheUnavailable("This needs Niche, which isn't downloaded yet.");
    }
  }
  return startNiche();
}

function startNiche(): Promise<void> {
  if (ready) return ready;
  if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
    set({ phase: "error", error: "This browser can't run Niche. The rest of the site works as normal." });
    return Promise.reject(new NicheUnavailable(status.error!));
  }
  set({ phase: "loading", error: null });
  worker ??= new Worker(new URL("./niche.worker.ts", import.meta.url), { type: "module" });
  ready = new Promise<void>((resolve, reject) => {
    worker!.onmessage = (e) => {
      const m = e.data as { type: string; id?: number; text?: string; error?: string; loaded?: number; total?: number; device?: "webgpu" | "wasm" };
      if (m.type === "device") set({ device: m.device });
      else if (m.type === "progress") set({ loaded: m.loaded ?? 0, total: m.total ?? 0 });
      else if (m.type === "ready") {
        set({ phase: "ready" });
        resolve();
      } else if (m.type === "token" && m.id) pending.get(m.id)?.onText?.(m.text ?? "");
      else if (m.type === "done" && m.id) {
        pending.get(m.id)?.resolve(m.text ?? "");
        pending.delete(m.id);
      } else if (m.type === "error") {
        console.warn("Niche:", m.error);
        if (m.id) {
          pending.get(m.id)?.reject(new Error("Niche got stuck on that one. Try asking another way."));
          pending.delete(m.id);
        } else {
          const msg = friendly(m.error ?? "");
          set({ phase: "error", error: msg });
          ready = null;
          reject(new NicheUnavailable(msg));
        }
      }
    };
    worker!.postMessage({ type: "load" });
  });
  return ready;
}

let queue: Promise<unknown> = Promise.resolve();

/** Ask the model. Loads it first if needed. One question at a time. */
export function askNiche(messages: Msg[], maxTokens: number, onText?: (t: string) => void): Promise<string> {
  const run = async (): Promise<string> => {
    await loadNiche();
    if (status.device === "server") {
      const r = await fetch(SERVER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, maxTokens }),
      }).catch(() => null);
      const body = r ? ((await r.json().catch(() => ({}))) as { text?: string; error?: string }) : {};
      if (r?.ok && typeof body.text === "string") {
        onText?.(body.text);
        return body.text;
      }
      // Rate limit or a bad question: the server is fine, so say why.
      if (r && (r.status === 429 || r.status === 400)) throw new Error(body.error ?? "Niche couldn't answer that one.");
      // Server went away: switch to the in-browser model for the rest of the visit.
      useServer = Promise.resolve(false);
      set({ phase: "idle", device: null });
      return run();
    }
    const id = nextId++;
    return new Promise<string>((resolve, reject) => {
      pending.set(id, { resolve, reject, onText });
      worker!.postMessage({ type: "ask", id, messages, maxTokens });
    });
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

export const STYLE = "Use plain words and short sentences, no markdown or lists. If you are not sure, say so instead of guessing.";

/** Pull the first JSON object out of a reply (models sometimes wrap it). */
export function parseJsonReply<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
