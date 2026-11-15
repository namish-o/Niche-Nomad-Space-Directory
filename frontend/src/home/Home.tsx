// Landing page: type a position (or click the sky, or pick a known mover) and
// it opens the blink viewer there. The viewer reads its position from the URL,
// so all this page does is build that URL.
import Tour from "../tour/Tour";
import SourcesButton from "../sources/SourcesButton";
import { HOME_STEPS } from "../tour/steps";
import { lazy, Suspense, useEffect, useState } from "react";
import { fetchTargets, type Target } from "../api/client";
import { rememberSearchNote, smartResolve } from "../ai/search";
import { formatDec, formatRa } from "../lib/sky";
import "./home.css";
import AccountButton from "../saved/AccountButton";

interface Props {
  onGo: (pos: { ra: number; dec: number; band?: number }) => void;
}

const Space3D = lazy(() => import("../space3d/Space3D"));

export default function Home({ onGo }: Props) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchTargets().then(setTargets).catch(() => setTargets([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Type a position first, for example 133.7951 -7.2451");
      return;
    }
    setBusy(true);
    try {
      const pos = await smartResolve(query);
      setError(null);
      rememberSearchNote(pos);
      onGo({ ra: pos.ra, dec: pos.dec, band: pos.band });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that position");
    } finally {
      setBusy(false);
    }
  };



  return (
    <div className="home">
      <header className="home-bar">
        <span className="home-mark">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
            <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-25 16 16)" />
            <circle cx="16" cy="16" r="3.2" fill="currentColor" />
          </svg>
          Niche Space Directory
        </span>
        <span className="home-bar-note">Our entry for NASA Space Apps 2026 (Planet X and SPHEREx)</span>
        <Tour steps={HOME_STEPS} part="home" />
        <AccountButton />
      </header>

      <main className="home-main">
        <section className="home-hero">
          <h1>Welcome to the <em>niche</em> directory</h1>
          <p className="home-lede">
            Flip through SPHEREx pictures of any spot in the sky and watch nearby objects move.
          </p>
          <form className="home-search" onSubmit={submit}>
            <label htmlFor="home-coords">Where should we look?</label>
            <div className="home-search-row">
              <input
                id="home-coords"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="133.7951 -7.2451  or  a cold brown dwarf near Orion"
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              <button type="submit" className="primary" disabled={busy}>{busy ? "Looking…" : "Look"}</button>
            </div>
            <p className="home-help">
              Degrees like <code>133.7951 -7.2451</code>, or hours like <code>08h55m10.8s -07d14m42s</code>.
              A name like <code>Barnard's Star</code> works too. You can also just describe it, like{" "}
              <code>the fastest star in the sky</code>, or pick a star in Niche in 3D.
            </p>
            {error && <p className="home-error" role="alert">{error}</p>}
          </form>
          <ol className="home-steps">
            <li><b>1</b> Type a position or pick a star on the map.</li>
            <li><b>2</b> Press play and let the pictures flip.</li>
            <li><b>3</b> Look for a dot that hops while the rest sit still.</li>
          </ol>
        </section>

        <figure className="home-chart">
          <p className="home-chart-tag">SPHEREx images, sorted by Niche</p>
          <Suspense fallback={<div className="s3d-loading">Loading Niche in 3D…</div>}>
            <Space3D embedded onOpen={(o) => onGo({ ra: o.ra, dec: o.dec, band: o.band })} />
          </Suspense>
        </figure>

        <section className="home-targets" aria-labelledby="known-movers">
          <h2 id="known-movers">Not sure where to look? Try one of these</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Object</th>
                <th scope="col" className="home-col-note">What it is</th>
                <th scope="col">RA</th>
                <th scope="col">Dec</th>
                <th scope="col"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id}>
                  <th scope="row">{t.name}</th>
                  <td className="home-col-note">{t.note.split(". ")[0].replace(/\.$/, "")}.</td>
                  <td className="home-num">{formatRa(t.ra)}</td>
                  <td className="home-num">{formatDec(t.dec)}</td>
                  <td>
                    <button type="button" onClick={() => onGo({ ra: t.ra, dec: t.dec, band: t.suggested_band })}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <footer className="home-foot">
        Pictures from SPHEREx (NASA/JPL-Caltech), downloaded live from the{" "}
        <a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">
          NASA/IPAC Infrared Science Archive
        </a>
        .
        <p className="team-credit">Niche Nomads: Anish M., Namish O., Jayanth J., Arnav B.</p>
        <SourcesButton />
      </footer>
    </div>
  );
}
