// A small "?" button that explains a word. Works with a mouse, a keyboard and a tap.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TERMS, type Term, type TermKey } from "./terms";
import "./glossary.css";

export default function Info({ term }: { term: TermKey }) {
  const t = TERMS[term];
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLSpanElement>(null);

  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 12));
    setPos({ left, top: r.bottom + 8 });
  };

  // Not enough room below the button: flip the box above it (or pin it on screen).
  useLayoutEffect(() => {
    if (!pos || !box.current || !btn.current) return;
    const h = box.current.offsetHeight;
    if (pos.top + h <= window.innerHeight - 8) return;
    const r = btn.current.getBoundingClientRect();
    const top = Math.max(8, Math.min(r.top - 8 - h, window.innerHeight - 8 - h));
    if (top !== pos.top) setPos({ ...pos, top });
  }, [pos]);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e.target instanceof Node && (btn.current?.contains(e.target) || box.current?.contains(e.target))) return;
      setPos(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="info-btn"
        aria-label={`What does "${t.word}" mean?`}
        aria-expanded={!!pos}
        onClick={(e) => {
          e.preventDefault(); // don't toggle the checkbox of a surrounding <label>
          e.stopPropagation();
          pos ? setPos(null) : open();
        }}
      >
        ?
      </button>
      {pos &&
        createPortal(
        <span
          ref={box}
          role="tooltip"
          className="info-pop"
          style={{ left: pos.left, top: pos.top, width: Math.min(280, window.innerWidth - 24) }}
        >
          <strong>{t.word}</strong>
          {t.text}
          <MoreLink term={t} />
        </span>,
          document.body, // outside panels with backdrop-filter, which would break position: fixed
        )}
    </>
  );
}

/** "Learn more on ESA/Hubble" link for terms that have one. */
export function MoreLink({ term }: { term: Term }) {
  if (!term.more) return null;
  return (
    <a className="info-more" href={term.more} target="_blank" rel="noreferrer">
      Learn more on ESA/Hubble
    </a>
  );
}
