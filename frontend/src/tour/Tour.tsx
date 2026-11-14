import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../saved/useAuth";
import type { Step } from "./steps";
import "./tour.css";

// "home" = saw the homepage part; "done" = finished or skipped the whole tour.
const KEY = "spherex-tour";
const read = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
const write = (v: string | null) => {
  try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { /* private mode */ }
};

interface Props {
  steps: Step[];
  /** Which part of the site this is. The homepage only covers the search box. */
  part: "home" | "viewer";
}

/** A "Take the tour" button, plus the tour itself. Starts on its own for new, signed-out visitors. */
export default function Tour({ steps, part }: Props) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!auth.ready || auth.session) return;
    const seen = read();
    if (seen === "done" || (part === "home" && seen === "home")) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [auth.ready, auth.session, part]);

  const close = (finished: boolean) => {
    setOpen(false);
    write(part === "home" && finished ? "home" : "done");
  };

  return (
    <>
      <button type="button" className="tour-retake" onClick={() => setOpen(true)}>
        {read() ? "Retake tutorial" : "Tutorial"}
      </button>
      {open && <TourSteps steps={steps} onClose={close} />}
    </>
  );
}

function TourSteps({ steps, onClose }: { steps: Step[]; onClose: (finished: boolean) => void }) {
  const live = useRef(steps.filter((s) => document.querySelector(s.target))).current;
  const [i, setI] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const step = live[i];

  const measure = useCallback(() => {
    const el = step && document.querySelector(step.target);
    setBox(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    const el = step && document.querySelector(step.target);
    el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    measure();
    card.current?.focus();
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const last = i === live.length - 1;
  const next = () => (last ? onClose(true) : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose(false);
    else if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") back();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!step) onClose(true);
  }, [step, onClose]);
  if (!step) return null;

  // Put the card under the target if there is room, else above it, else pinned to the bottom.
  const pad = 8;
  const vh = window.innerHeight;
  const cardH = card.current?.offsetHeight ?? 180;
  let top: number | undefined;
  let bottom: number | undefined;
  if (box && box.bottom + pad + cardH < vh) top = box.bottom + pad;
  else if (box && box.top - pad - cardH > 0) bottom = vh - box.top + pad;
  else bottom = 16;
  const left = box ? Math.min(Math.max(16, box.left), window.innerWidth - Math.min(360, window.innerWidth - 32) - 16) : 16;

  return (
    <div className="tour" onKeyDown={onKey}>
      <div className="tour-scrim" onClick={() => onClose(false)} />
      {box && (
        <div
          className="tour-spot"
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }}
        />
      )}
      <div
        ref={card}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        style={{ top, bottom, left }}
      >
        <p className="tour-count">{i + 1} / {live.length}</p>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={() => onClose(false)}>Skip tour</button>
          {i > 0 && <button type="button" onClick={back}>Back</button>}
          <button type="button" className="primary" onClick={next}>{last ? "Done" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
