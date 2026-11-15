// Data panel: details and quality flags of the frame on screen, a deep
// co-added picture of the band, and a spectrum of the centre position.
import { useEffect, useState } from "react";
import type { LoadedFrame, View } from "../api/client";
import { fetchCoadd, fetchFrameMeta, fetchSpectrum, type CoaddResult, type FrameMeta, type Spectrum } from "./api";
import SpectrumChart from "./SpectrumChart";
import "./data.css";
import Info from "../glossary/Info";

interface Props {
  view: View;
  band: number;
  frame: LoadedFrame | null;
  playing: boolean;
}

type Async<T> = { status: "idle" } | { status: "loading" } | { status: "done"; value: T } | { status: "error"; message: string };

function FrameDetails({ view, frame, playing }: { view: View; frame: LoadedFrame | null; playing: boolean }) {
  const [meta, setMeta] = useState<FrameMeta | null>(null);
  const id = frame?.id ?? null;

  // Only ask while paused: during playback the frame changes several times a second.
  useEffect(() => {
    if (!id || playing) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      fetchFrameMeta(id, view, abort.signal).then(setMeta).catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [id, playing, view.ra, view.dec, view.fov]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!frame) return <p className="hint">No frame loaded yet.</p>;
  if (playing) return <p className="hint">Pause the blink to see this frame's details and quality flags.</p>;
  if (!meta || meta.frame.id !== frame.id) return <p className="hint">Loading frame details…</p>;

  const bad = meta.flags.filter((f) => f.bad);
  const info = meta.flags.filter((f) => !f.bad);
  const t = meta.target_pixel;
  return (
    <div className="frame-details">
      <dl>
        <dt>Wavelength<Info term="micron" /></dt>
        <dd>
          {meta.wavelength?.toFixed(3) ?? "?"} µm
          {meta.bandwidth ? <span className="muted"> (± {(meta.bandwidth / 2).toFixed(3)})</span> : null}
        </dd>
        <dt>Channel<Info term="channel" /></dt>
        <dd>
          {meta.channel_index !== null ? `${meta.channel_index + 1} of 102` : "outside nominal bands"}
          {meta.channel ? <span className="muted"> (D{meta.frame.detector}, {meta.channel} of 17)</span> : null}
        </dd>
        <dt>Exposure<Info term="exposure" /></dt>
        <dd>{meta.header.exposure_s?.toFixed(0) ?? "?"} s <span className="muted">{meta.frame.obs_id}</span></dd>
        <dt>Checks<Info term="flags" /></dt>
        <dd>
          Quality {meta.header.l1_quality ?? "?"}, astrometry {meta.header.fine_astrometry_ok === false ? "coarse only" : "good"}
        </dd>
        <dt>At centre</dt>
        <dd className={t.bad ? "warn" : ""}>
          {t.bad ? "Flagged pixel: " : "Clean pixel"}
          {t.flags.length > 0 && <span className={t.bad ? "" : "muted"}> {t.bad ? "" : "("}{t.flags.join(", ").toLowerCase()}{t.bad ? "" : ")"}</span>}
        </dd>
      </dl>
      <p className="hint">
        {(meta.bad_fraction * 100).toFixed(1)}% of this frame's pixels are flagged as unreliable. They are filled
        in from neighbours in the picture and left out of co-adds and spectra.
      </p>
      {bad.length > 0 && (
        <ul className="flag-list">
          {bad.map((f) => (
            <li key={f.bit} title={f.description}>
              <span className="flag bad">{f.name}</span> {f.pixels} px <span className="muted">{f.description}</span>
            </li>
          ))}
        </ul>
      )}
      {info.length > 0 && (
        <p className="hint">
          Informational only: {info.map((f) => `${f.name.toLowerCase()} ${(f.fraction * 100).toFixed(0)}%`).join(", ")}.
        </p>
      )}
    </div>
  );
}

function CoaddSection({ view, band }: { view: View; band: number }) {
  const [channel, setChannel] = useState(0); // 0 = whole band
  const [result, setResult] = useState<Async<CoaddResult>>({ status: "idle" });

  useEffect(() => setResult({ status: "idle" }), [view.ra, view.dec, view.fov, band, channel]);
  useEffect(() => () => {
    if (result.status === "done") URL.revokeObjectURL(result.value.url);
  }, [result]);

  const build = () => {
    setResult({ status: "loading" });
    fetchCoadd(view, band, channel || null, 384)
      .then((value) => setResult({ status: "done", value }))
      .catch((err) => setResult({ status: "error", message: String(err.message ?? err) }));
  };

  return (
    <div className="coadd">
      <div className="coadd-row">
        <select value={channel} onChange={(e) => setChannel(Number(e.target.value))} aria-label="Channel to co-add">
          <option value={0}>All of D{band}</option>
          {Array.from({ length: 17 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Channel {17 * (band - 1) + i + 1} of 102</option>
          ))}
        </select>
        <button onClick={build} disabled={result.status === "loading"}>
          {result.status === "loading" ? "Stacking…" : "Build deep image"}
        </button>
      </div>
      {result.status === "idle" && (
        <p className="hint">
          Averages every exposure of this band (or one of its 17 channels) into one deeper picture. Fixed
          objects get sharper, moving ones fade.
        </p>
      )}
      {result.status === "loading" && <p className="hint">Aligning and stacking. The first time takes up to a minute.</p>}
      {result.status === "error" && <p className="hint warn">{result.message}</p>}
      {result.status === "done" && (
        <>
          <img src={result.value.url} alt={`Co-added SPHEREx image, detector ${band}`} />
          <p className="hint">
            {result.value.framesUsed} exposures, {result.value.waveMin?.toFixed(2)} to {result.value.waveMax?.toFixed(2)} µm,
            same field and orientation as the main view. {(result.value.clipped * 100).toFixed(1)}% of samples rejected as outliers.{" "}
            <a href={result.value.fitsUrl} download="spherex_coadd.fits">Download FITS</a>
          </p>
        </>
      )}
    </div>
  );
}

function skipNote(s: Spectrum) {
  const skipped = s.points.filter((p) => !p.ok);
  if (skipped.length === 0) return "";
  const saturated = skipped.filter((p) => p.reason?.startsWith("saturated")).length;
  if (saturated > skipped.length / 2)
    return `${skipped.length} skipped: the source is saturated (too bright for SPHEREx) in most exposures, so its spectrum cannot be measured here. `;
  return `${skipped.length} skipped because flagged pixels cover the source. `;
}

/** Spectrum of one sky position. Also used by the 3D map's star cards. */
export function SpectrumSection({ view, label = "Measure spectrum at the centre", hint }: {
  view: { ra: number; dec: number };
  label?: string;
  hint?: string;
}) {
  const [result, setResult] = useState<Async<Spectrum>>({ status: "idle" });
  useEffect(() => setResult({ status: "idle" }), [view.ra, view.dec]);

  const measure = () => {
    setResult({ status: "loading" });
    fetchSpectrum(view.ra, view.dec)
      .then((value) => setResult({ status: "done", value }))
      .catch((err) => setResult({ status: "error", message: String(err.message ?? err) }));
  };

  const csv = (s: Spectrum) => {
    const rows = ["frame,detector,mjd,wavelength_um,flux_uJy,flux_err_uJy,ok,flags_at_target"];
    for (const p of s.points) {
      rows.push([p.id, p.detector, p.mjd, p.wavelength ?? "", p.flux_ujy ?? "", p.flux_err_ujy ?? "", p.ok,
        (p.flags_at_target ?? []).join(" ")].join(","));
    }
    return URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
  };

  return (
    <div className="spectrum">
      <button onClick={measure} disabled={result.status === "loading"}>
        {result.status === "loading" ? "Measuring…" : label}
      </button>
      {result.status === "idle" && (
        <p className="hint">
          {hint ?? "Measures the brightness at the marked centre in every exposure of all six detectors. Double-click an object first to centre it."}
        </p>
      )}
      {result.status === "loading" && (
        <p className="hint">Reading every exposure from the archive. A new position takes about a minute.</p>
      )}
      {result.status === "error" && <p className="hint warn">{result.message}</p>}
      {result.status === "done" && (
        <>
          {result.value.channels.length > 0 && <SpectrumChart spectrum={result.value} />}
          <p className="hint">
            {result.value.measured} of {result.value.total} exposures measured. {skipNote(result.value)}PSF-fitted flux
            with the local background removed.{" "}
            <a href={csv(result.value)} download="spherex_spectrum.csv">Download CSV</a>
          </p>
        </>
      )}
    </div>
  );
}

export default function DataPanel({ view, band, frame, playing }: Props) {
  return (
    <div className="data-panel">
      <h2>This frame</h2>
      <FrameDetails view={view} frame={frame} playing={playing} />
      <h2>Deep image (co-add)<Info term="coadd" /></h2>
      <CoaddSection view={view} band={band} />
      <h2>Spectrum<Info term="spectrum" /></h2>
      <SpectrumSection view={view} />
    </div>
  );
}
