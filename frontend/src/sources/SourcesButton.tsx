// "Sources" button for the footers. Opens a list of every archive, catalogue
// and library the site uses.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SOURCE_GROUPS } from "./sources";
import "./sources.css";

export default function SourcesButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <button type="button" className="sources-btn" onClick={() => setOpen(true)}>
        Our sources
      </button>
      {open &&
        createPortal(
          <div className="sources-scrim" onClick={() => setOpen(false)}>
            <div className="sources-box" role="dialog" aria-modal="true" aria-labelledby="sources-title" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="sources-close" aria-label="Close" onClick={() => setOpen(false)} autoFocus>
                ×
              </button>
              <h2 id="sources-title">Our sources</h2>
              <p className="sources-lead">Where the pictures, facts and code on this site come from.</p>
              {SOURCE_GROUPS.map((g) => (
                <section key={g.title}>
                  <h3>{g.title}</h3>
                  <ul>
                    {g.items.map((s) => (
                      <li key={s.name}>
                        <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
                        <span>{s.what}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
