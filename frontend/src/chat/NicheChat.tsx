// Niche: a little helper button you can drag anywhere on the screen. It opens
// a small chat that answers questions about the current view (we send a short
// summary of what's on screen) and about SPHEREx in general. Answers come from
// a small model (Qwen3 0.6B) running in this browser; it downloads the first
// time the chat is opened. Only the last few turns are used, to keep it quick.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { answerNicheDownload, askNiche, loadNiche, NicheUnavailable, nicheStatus, onNicheStatus, STYLE, type Msg, type NicheStatus } from "../ai/niche";
import "./chat.css";

type Turn = { role: "user" | "assistant"; content: string };

const SIZE = 52; // button size, px
const GAP = 12; // space kept from edges, the header and the footer
const KEY = "niche-chat-pos";

const SYSTEM =
  "You are Niche, the helper inside the Niche Space Directory, a website that blinks NASA SPHEREx infrared images " +
  "of one patch of sky taken on different dates, so moving objects stand out. Answer questions about the user's " +
  "screen, SPHEREx, infrared astronomy and how to use the site, in 1 to 3 short sentences. Only use the screen facts " +
  "and well-known astronomy. Politely decline unrelated topics. " + STYLE;

const mb = (b: number) => Math.round(b / 1e6);

const STARTERS = ["What am I looking at?", "What is SPHEREx?", "How do I spot a mover?"];

/** Saved spot as fractions of the window, so it survives resizes. */
function loadPos(): { fx: number; fy: number } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (typeof v?.fx === "number" && typeof v?.fy === "number") return v;
  } catch {
    /* first visit or storage blocked */
  }
  return { fx: 1, fy: 1 }; // bottom right
}

/** Keep the button on screen and clear of the header (Sign in, tutorial) and the footer. */
function clamp(x: number, y: number) {
  let top = GAP;
  let bottom = window.innerHeight - SIZE - GAP;
  const header = document.querySelector("header");
  const hb = header?.getBoundingClientRect();
  if (hb && hb.bottom > 0) top = Math.max(top, hb.bottom + GAP);
  const footer = document.querySelector("footer");
  const fb = footer?.getBoundingClientRect();
  if (fb && fb.top < window.innerHeight) bottom = Math.min(bottom, fb.top - SIZE - GAP);
  const right = window.innerWidth - SIZE - GAP;
  return {
    x: Math.min(Math.max(x, GAP), Math.max(GAP, right)),
    y: Math.min(Math.max(y, top), Math.max(top, bottom)),
  };
}

export default function NicheChat({ context }: { context: () => unknown }) {
  const [frac, setFrac] = useState(loadPos);
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [partial, setPartial] = useState("");
  const [model, setModel] = useState<NicheStatus>(nicheStatus);
  useEffect(() => onNicheStatus(setModel), []);
  // Start the download the first time the chat is opened.
  useEffect(() => {
    if (open) loadNiche().catch(() => undefined);
  }, [open]);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Place from the saved fractions, and re-place on scroll/resize so the
  // header and footer push it out of the way when they come into view.
  useLayoutEffect(() => {
    const place = () => {
      if (drag.current) return;
      const w = window.innerWidth - SIZE - 2 * GAP;
      const h = window.innerHeight - SIZE - 2 * GAP;
      setPos(clamp(GAP + frac.fx * w, GAP + frac.fy * h));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [frac]);

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [turns, busy]);

  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const x = e.clientX - d.dx;
    const y = e.clientY - d.dy;
    if (!d.moved && Math.hypot(x - pos.x, y - pos.y) < 5) return;
    d.moved = true;
    setPos(clamp(x, y));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) return setOpen((o) => !o);
    const next = {
      fx: (pos.x - GAP) / Math.max(1, window.innerWidth - SIZE - 2 * GAP),
      fy: (pos.y - GAP) / Math.max(1, window.innerHeight - SIZE - 2 * GAP),
    };
    setFrac(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* fine, it just won't be remembered */
    }
  };

  const ask = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setText("");
    setNote(null);
    setBusy(true);
    setPartial("");
    try {
      const messages: Msg[] = [
        { role: "system", content: `${SYSTEM}\n\nOn screen now: ${JSON.stringify(context() ?? {}).slice(0, 1500)}` },
        ...next.slice(-4).map((t) => ({ role: t.role, content: t.content.slice(0, 500) })),
      ];
      const reply = await askNiche(messages, 200, setPartial);
      setTurns([...next, { role: "assistant", content: reply || "Sorry, I don't have an answer for that." }]);
    } catch (err) {
      // A failed load is already shown by the status line below.
      if (!(err instanceof NicheUnavailable)) setNote((err as Error).message);
    } finally {
      setPartial("");
      setBusy(false);
    }
  };

  // Panel opens toward the middle of the screen from wherever the button sits.
  const left = pos.x + SIZE / 2 < window.innerWidth / 2;
  const above = pos.y + SIZE / 2 > window.innerHeight / 2;
  const panelStyle: React.CSSProperties = {
    [left ? "left" : "right"]: left ? pos.x : window.innerWidth - pos.x - SIZE,
    [above ? "bottom" : "top"]: above ? window.innerHeight - pos.y + 8 : pos.y + SIZE + 8,
  };

  return (
    <>
      <button
        type="button"
        className={open ? "niche-btn open" : "niche-btn"}
        style={{ left: pos.x, top: pos.y }}
        aria-expanded={open}
        aria-controls="niche-panel"
        title="Ask Niche (drag to move)"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M6 8.5A3.5 3.5 0 0 1 9.5 5h13A3.5 3.5 0 0 1 26 8.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-5.5 5v-5h0A3 3 0 0 1 6 18z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="1.6" fill="currentColor" />
          <circle cx="20" cy="13" r="1.6" fill="currentColor" />
          <circle cx="25.5" cy="5.5" r="2.4" className="niche-spark" />
        </svg>
        <span className="sr-only">Ask Niche</span>
      </button>

      {model.phase === "ask" && (
        <div className="niche-ask-wrap" onClick={() => answerNicheDownload(false)} onKeyDown={(e) => e.key === "Escape" && answerNicheDownload(false)}>
          <div className="niche-ask" role="dialog" aria-modal="true" aria-labelledby="niche-ask-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="niche-ask-title">Download Niche?</h2>
            <p>
              Niche is the small AI helper behind the chat and plain-English search. It runs on your own device, so
              nothing you type leaves your browser.
            </p>
            <p>
              The first time, your browser downloads it once (around half a gigabyte), then keeps it for next time.
              It works best in Chrome or Edge on a laptop. Wi-Fi recommended.
            </p>
            <div className="niche-ask-buttons">
              <button type="button" onClick={() => answerNicheDownload(false)}>Not now</button>
              <button type="button" className="primary" autoFocus onClick={() => answerNicheDownload(true)}>Download Niche</button>
            </div>
          </div>
        </div>
      )}

      {!open && model.phase === "loading" && (
        <div className="niche-toast niche-load" role="status">
          <span>{model.total ? `Downloading Niche for plain-English search: ${mb(model.loaded)} of ${mb(model.total)} MB. Only the first time.` : "Starting Niche…"}</span>
          <progress max={model.total || 1} value={model.total ? model.loaded : undefined} />
        </div>
      )}

      {open && (
        <div className="niche-panel" id="niche-panel" role="dialog" aria-label="Ask Niche" style={panelStyle}>
          <div className="niche-head">
            <strong>Niche</strong>
            <span>answers questions about this view or SPHEREx</span>
            <button type="button" className="niche-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <div className="niche-log" ref={logRef} aria-live="polite">
            {turns.length === 0 && (
              <>
                <p className="niche-msg bot">Hi, I'm Niche. Ask me about what's on screen or anything about SPHEREx.</p>
                <div className="niche-starters">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)}>{s}</button>
                  ))}
                </div>
              </>
            )}
            {turns.map((t, i) => (
              <p key={i} className={t.role === "user" ? "niche-msg me" : "niche-msg bot"}>{t.content}</p>
            ))}
            {busy && <p className={partial ? "niche-msg bot" : "niche-msg bot thinking"}>{partial || (model.phase === "ready" ? "Thinking…" : "Waiting for Niche to load…")}</p>}
            {model.phase === "loading" && (
              <div className="niche-load" role="status">
                <span>
                  {model.total
                    ? `Downloading Niche to this browser: ${mb(model.loaded)} of ${mb(model.total)} MB. Only the first time.`
                    : "Starting Niche…"}
                </span>
                <progress max={model.total || 1} value={model.total ? model.loaded : undefined} />
              </div>
            )}
            {model.phase === "idle" && !busy && (
              <p className="niche-note">
                Niche isn't downloaded yet.{" "}
                <button type="button" className="niche-link" onClick={() => loadNiche().catch(() => undefined)}>Download it</button>
              </p>
            )}
            {model.phase === "error" && <p className="niche-note">{model.error} The rest of the site works as normal.</p>}
            {note && <p className="niche-note">{note}</p>}
          </div>
          <form className="niche-form" onSubmit={(e) => (e.preventDefault(), ask(text))}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Ask a question"
              aria-label="Your question"
              autoFocus
            />
            <button type="submit" disabled={busy || !text.trim()}>Ask</button>
          </form>
          <p className="niche-foot">
            {model.device === "server" ? "Runs on our team's own computer" : "Runs on your device"}
            {model.device === "wasm" ? " (no GPU found, so it's slower)" : ""}. Small model, answers can be wrong.
          </p>
        </div>
      )}
    </>
  );
}
