// "Words explained": every definition in one list, with a search box.
import { useState } from "react";
import { TERMS } from "./terms";
import "./glossary.css";

const ALL = Object.values(TERMS).sort((a, b) => a.word.localeCompare(b.word));

export default function GlossaryPanel() {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? ALL.filter((t) => (t.word + " " + t.text).toLowerCase().includes(needle)) : ALL;
  return (
    <details className="glossary" id="glossary">
      <summary>
        <h2>Words explained</h2>
        <span className="muted">New to astronomy? Every term on this page in plain English.</span>
      </summary>
      <input type="search" aria-label="Search the glossary" placeholder="Search, e.g. infrared" value={q} onChange={(e) => setQ(e.target.value)} />
      <dl>
        {shown.map((t) => (
          <div key={t.word}>
            <dt>{t.word}</dt>
            <dd>{t.text}</dd>
          </div>
        ))}
      </dl>
      {!shown.length && <p className="muted">No match. Try a shorter word.</p>}
    </details>
  );
}
