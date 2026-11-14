// Landing page: type a position (or click the sky, or pick a known mover) and
// it opens the blink viewer there. The viewer reads its position from the URL,
// so all this page does is build that URL.
import Tour from "../tour/Tour";
import { HOME_STEPS } from "../tour/steps";
import { useEffect, useMemo, useState } from "react";
import { fetchTargets, resolveQuery, type Target } from "../api/client";
import { eclipticToEquatorial, formatDec, formatRa, galacticToEquatorial } from "../lib/sky";
import "./home.css";
import AccountButton from "../saved/AccountButton";

interface Props {
  onGo: (pos: { ra: number; dec: number; band?: number }) => void;
}

const W = 720;
const H = 360;
const x = (ra: number) => ((360 - ra) / 360) * W;
const y = (dec: number) => ((90 - dec) / 180) * H;

function skyPath(points: { ra: number; dec: number }[]): string {
  let d = "";
  let prevX: number | null = null;
  for (const p of points) {
    const px = x(p.ra);
    const py = y(p.dec);
    d += prevX === null || Math.abs(px - prevX) > W / 2 ? `M${px.toFixed(1)},${py.toFixed(1)}` : `L${px.toFixed(1)},${py.toFixed(1)}`;
    prevX = px;
  }
  return d;
}

export default function Home({ onGo }: Props) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [hover, setHover] = useState<{ ra: number; dec: number } | null>(null);

  useEffect(() => {
    fetchTargets().then(setTargets).catch(() => setTargets([]));
  }, []);

  const guides = useMemo(() => {
    const steps = Array.from({ length: 361 }, (_, i) => i);
    return {
      galactic: skyPath(steps.map((l) => galacticToEquatorial(l, 0))),
      ecliptic: skyPath(steps.map((l) => eclipticToEquatorial(l))),
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Type a position first, for example 133.7951 -7.2451");
      return;
    }
    try {
      const pos = await resolveQuery(query);
      const known = targets.find((t) => Math.abs(t.ra - pos.ra) < 1e-4 && Math.abs(t.dec - pos.dec) < 1e-4);
      setError(null);
      onGo({ ra: pos.ra, dec: pos.dec, band: known?.suggested_band });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that position");
    }
  };

  const fromEvent = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    return { ra: (((360 - fx * 360) % 360) + 360) % 360, dec: Math.max(-89.9, Math.min(89.9, 90 - fy * 180)) };
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
          <h1>Spot what's <em>moving</em> out there.</h1>
          <p className="home-lede">
            SPHEREx has photographed the whole sky several times since 2025. Type a position and we line up
            every picture of that spot and play them like a flipbook. Far away stars stay still. Something close
            by, like a cold brown dwarf, shifts a little from one picture to the next.
          </p>
          <form className="home-search" onSubmit={submit}>
            <label htmlFor="home-coords">Sky position (RA and Dec)</label>
            <div className="home-search-row">
              <input
                id="home-coords"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="133.7951 -7.2451"
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              <button type="submit" className="primary">Look</button>
            </div>
            <p className="home-help">
              Degrees like <code>133.7951 -7.2451</code>, or hours like <code>08h55m10.8s -07d14m42s</code>.
              A name like <code>Barnard's Star</code> works too, or click anywhere on the map.
            </p>
            {error && <p className="home-error" role="alert">{error}</p>}
          </form>
          <ol className="home-steps">
            <li><b>1</b> Type a position or click the map.</li>
            <li><b>2</b> Press play and let the pictures flip.</li>
            <li><b>3</b> Look for a dot that hops while the rest sit still.</li>
          </ol>
        </section>

        <figure className="home-chart">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Map of the whole sky. Click a spot to look there."
            onClick={(e) => {
              const p = fromEvent(e);
              onGo({ ra: +p.ra.toFixed(5), dec: +p.dec.toFixed(5) });
            }}
            onMouseMove={(e) => setHover(fromEvent(e))}
            onMouseLeave={() => setHover(null)}
          >
            <rect width={W} height={H} className="hc-bg" />
            {[-60, -30, 30, 60].map((d) => (
              <line key={`d${d}`} x1={0} x2={W} y1={y(d)} y2={y(d)} className="hc-grid" />
            ))}
            <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="hc-grid hc-eq" />
            {Array.from({ length: 11 }, (_, i) => (i + 1) * 2).map((h) => (
              <g key={`h${h}`}>
                <line y1={0} y2={H} x1={x(h * 15)} x2={x(h * 15)} className="hc-grid" />
                <text x={x(h * 15) + 4} y={y(0) - 5} className="hc-label">{h}h</text>
              </g>
            ))}
            {[-60, -30, 30, 60].map((d) => (
              <text key={`t${d}`} x={4} y={y(d) - 4} className="hc-label">{d > 0 ? `+${d}°` : `${d}°`}</text>
            ))}
            <path d={guides.galactic} className="hc-mw" />
            <path d={guides.ecliptic} className="hc-ecl" />
            {targets.map((t) => (
              <g
                key={t.id}
                className="hc-target"
                onClick={(e) => {
                  e.stopPropagation();
                  onGo({ ra: t.ra, dec: t.dec, band: t.suggested_band });
                }}
              >
                <circle cx={x(t.ra)} cy={y(t.dec)} r={9} className="hc-ring" />
                <circle cx={x(t.ra)} cy={y(t.dec)} r={2.5} className="hc-dot" />
                <text x={x(t.ra) + 12} y={y(t.dec) + 4} className="hc-name">{t.name}</text>
              </g>
            ))}
            {hover && (
              <g pointerEvents="none" className="hc-cursor">
                <line x1={x(hover.ra)} x2={x(hover.ra)} y1={0} y2={H} />
                <line x1={0} x2={W} y1={y(hover.dec)} y2={y(hover.dec)} />
              </g>
            )}
          </svg>
          <figcaption>
            <span>
              <i className="hc-key hc-key-mw" /> Milky Way <i className="hc-key hc-key-ecl" /> path of the planets
            </span>
            <span className="hc-readout">
              {hover ? `RA ${formatRa(hover.ra)}  Dec ${formatDec(hover.dec)}` : <span className="hc-hint">Point at the map to read a position</span>}
            </span>
          </figcaption>
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
      </footer>
    </div>
  );
}
