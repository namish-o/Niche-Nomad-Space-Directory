// IMAP solar wind card: the latest SWAPI numbers from IMAP's real-time
// (I-ALiRT) feed, and the proton energy spectrum they describe.
// Field names follow imap_processing/ialirt/l0/process_swapi.py.
import { useEffect, useMemo, useState } from "react";

interface Wind { speed: number; density: number; temperature: number; time: string | null }

// Quiet solar wind near Earth, used when the live feed can't be reached.
const TYPICAL: Wind = { speed: 400, density: 5, temperature: 100000, time: null };

const fmt = (d: Date) => d.toISOString().slice(0, 19);

async function latestWind(signal: AbortSignal): Promise<Wind> {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 3600 * 1000);
  const query = `/space-weather?instrument=swapi&time_utc_start=${fmt(start)}&time_utc_end=${fmt(end)}`;
  // Straight to IMAP first; the /ialirt proxy (dev server, Netlify) covers
  // the case where the browser blocks the cross-site call.
  let res: Response;
  try {
    res = await fetch(`https://ialirt.imap-mission.com${query}`, { signal });
  } catch (err) {
    if (signal.aborted) throw err;
    res = await fetch(`/ialirt${query}`, { signal });
  }
  if (!res.ok) throw new Error(`IMAP feed answered ${res.status}`);
  const rows = (await res.json()) as Record<string, unknown>[];
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    const speed = Number(r.swapi_pseudo_proton_speed);
    const density = Number(r.swapi_pseudo_proton_density);
    const temperature = Number(r.swapi_pseudo_proton_temperature);
    if (r.swapi_pseudo_proton_speed != null && speed > 0 && density > 0 && temperature > 0) {
      return { speed, density, temperature, time: typeof r.time_utc === "string" ? r.time_utc : null };
    }
  }
  throw new Error("no SWAPI readings in the last day");
}

const MP = 1.6726e-27; // proton mass, kg
const KB = 1.380649e-23;
const EV = 1.602177e-19;
const E_MIN = 100, E_MAX = 20000; // eV, roughly SWAPI's range
const W = 300, H = 140, PAD = { l: 8, r: 8, t: 8, b: 26 };

/** Proton count spectrum against energy for a drifting Maxwellian along the flow. */
function spectrum(w: Wind) {
  const v0 = w.speed * 1000;
  const vth = Math.sqrt((2 * KB * w.temperature) / MP);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const e = E_MIN * Math.pow(E_MAX / E_MIN, i / 120);
    const v = Math.sqrt((2 * e * EV) / MP);
    // counts in an electrostatic analyser scale like v^2 f(v)
    pts.push([e, v * v * Math.exp(-(((v - v0) / vth) ** 2))]);
  }
  const top = Math.max(...pts.map((p) => p[1])) || 1;
  const x = (e: number) => PAD.l + ((Math.log10(e) - Math.log10(E_MIN)) / Math.log10(E_MAX / E_MIN)) * (W - PAD.l - PAD.r);
  const y = (c: number) => H - PAD.b - (c / top) * (H - PAD.t - PAD.b);
  const peak = (0.5 * MP * v0 * v0) / EV;
  return { d: pts.map(([e, c], i) => `${i ? "L" : "M"}${x(e).toFixed(1)},${y(c).toFixed(1)}`).join(""), x, peak };
}

export default function SolarWind() {
  const [state, setState] = useState<{ wind: Wind; live: boolean; note?: string } | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    latestWind(ctl.signal)
      .then((wind) => setState({ wind, live: true }))
      .catch((err) => {
        if (ctl.signal.aborted) return;
        setState({ wind: TYPICAL, live: false, note: String(err?.message ?? err) });
      });
    return () => ctl.abort();
  }, []);

  const spec = useMemo(() => (state ? spectrum(state.wind) : null), [state]);
  if (!state || !spec) return <p className="s3d-sw-hint">Asking IMAP for the latest solar wind…</p>;
  const { wind, live } = state;

  return (
    <div className="s3d-sw">
      <p className="s3d-sw-title">
        {live ? "Solar wind right now, from IMAP SWAPI" : "Typical solar wind (IMAP's live feed didn't answer)"}
      </p>
      <dl>
        <div><dt>Speed</dt><dd>{Math.round(wind.speed)} km/s</dd></div>
        <div><dt>Density</dt><dd>{wind.density.toFixed(1)} /cm³</dd></div>
        <div><dt>Temperature</dt><dd>{Math.round(wind.temperature / 1000).toLocaleString()}k K</dd></div>
      </dl>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Proton energy spectrum">
        {[100, 1000, 10000].map((e) => (
          <g key={e}>
            <line x1={spec.x(e)} x2={spec.x(e)} y1={PAD.t} y2={H - PAD.b} className="s3d-sw-grid" />
            <text x={spec.x(e)} y={H - 8} textAnchor={e === 100 ? "start" : "middle"}>{e >= 1000 ? `${e / 1000} keV` : `${e} eV`}</text>
          </g>
        ))}
        <path d={spec.d} className="s3d-sw-line" />
        <line x1={spec.x(spec.peak)} x2={spec.x(spec.peak)} y1={PAD.t} y2={H - PAD.b} className="s3d-sw-peak" />
      </svg>
      <p className="s3d-sw-hint">
        Proton energy spectrum these numbers describe: a peak near {Math.round(spec.peak).toLocaleString()} eV set by the
        speed, and a width set by the temperature. SWAPI measures this by sweeping its energy filter.
        {live && wind.time ? ` Reading from ${wind.time} UTC.` : ""}
        {!live && state.note ? ` (${state.note})` : ""}
      </p>
    </div>
  );
}
