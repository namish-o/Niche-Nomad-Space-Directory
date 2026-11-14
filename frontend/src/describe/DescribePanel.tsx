// "What's here?": a plain-language description of the centre of the view.
import "./describe.css";
import { formatSep, plainType } from "./simbad";
import type { Description } from "./useDescription";

export default function DescribePanel({ d, onCentre }: { d: Description; onCentre: (ra: number, dec: number) => void }) {
  return (
    <section className="describe" aria-live="polite">
      <h2>What's here?</h2>
      {d.curated && (
        <div className="describe-card">
          <p className="describe-title">
            <strong>{d.curated.name}</strong>
            <span className="muted"> · {d.curated.kind} · {d.curated.distance}</span>
          </p>
          <p>{d.curated.text}</p>
          <p className="describe-tip"><strong>What to look for:</strong> {d.curated.lookFor}</p>
        </div>
      )}
      {!d.curated && d.summary && <p>{d.summary}</p>}
      {!d.curated && d.loading && <p className="muted">Looking this spot up in the SIMBAD catalogue…</p>}
      {!d.curated && !d.loading && !d.error && !d.highlight && (
        <p className="muted">SIMBAD lists nothing catalogued near the centre. Most of the faint dots are distant stars and galaxies nobody has named yet.</p>
      )}
      {d.error && !d.curated && <p className="muted">Couldn't reach the SIMBAD catalogue ({d.error}).</p>}
      {d.others.length > 0 && (
        <details>
          <summary>Also in this field ({d.others.length})</summary>
          <ul className="describe-list">
            {d.others.map((o) => (
              <li key={o.name}>
                <button type="button" className="link" onClick={() => onCentre(o.ra, o.dec)} title="Centre the view here">
                  {o.name}
                </button>{" "}
                <span className="muted">{plainType(o.otype).split(",")[0]} · {formatSep(o.separationArcsec)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="hint">Descriptions come from the SIMBAD database (CDS, Strasbourg); the five challenge targets have hand-written notes.</p>
    </section>
  );
}
