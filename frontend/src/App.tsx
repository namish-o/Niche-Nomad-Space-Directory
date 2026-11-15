import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SourcesButton from "./sources/SourcesButton";
import Controls from "./components/Controls";
import EmbedPanel from "./components/EmbedPanel";
import ImageOpsPanel from "./components/ImageOpsPanel";
import SkyNavigator from "./components/SkyNavigator";
import StatusBar from "./components/StatusBar";
import ViewerOverlay from "./components/ViewerOverlay";
import BlinkCanvas from "./viewer/BlinkCanvas";
import PlayerControls from "./viewer/PlayerControls";
import { useFrames } from "./viewer/useFrames";
import { useImageOps } from "./viewer/useImageOps";
import { usePlayer } from "./viewer/usePlayer";
import { absoluteUrl, DEFAULT_STATE, parseUrl, useUrlState } from "./state/urlState";
import DescribePanel from "./describe/DescribePanel";
import { shortLabel, useDescription } from "./describe/useDescription";
import SavedPanel from "./saved/SavedPanel";
import AccountButton from "./saved/AccountButton";
import { useEmbedBridge } from "./state/embedBridge";
import { fetchTargets, type Target } from "./api/client";
import { formatDec, formatFov, formatRa } from "./lib/sky";
import { useMasonry } from "./lib/masonry";
import DataPanel from "./data/DataPanel";
import { LightCurvePanel, useCanvasExtras, useLightCurve } from "./lightcurve";
import ProductsPanel from "./data/ProductsPanel";
import { AladinPanel, OverlayPanel, SourceCard, mjdNow, useOverlayCanvas, useOverlays } from "./overlays";
import Info from "./glossary/Info";
import GlossaryPanel from "./glossary/GlossaryPanel";
import Tour from "./tour/Tour";
import { VIEWER_STEPS } from "./tour/steps";
import MoverPanel, { useMovers } from "./movers/MoverPanel";
import NicheChat from "./chat/NicheChat";

const IMAGE_SIZE = 384; // pixels requested from the backend per frame

export default function App() {
  const [state, update] = useUrlState();
  const [reloadKey, setReloadKey] = useState(0);
  const asideRef = useRef<HTMLElement>(null);
  useMasonry(asideRef);
  const [targets, setTargets] = useState<Target[]>([]);
  useEffect(() => {
    fetchTargets().then(setTargets).catch(() => setTargets([]));
  }, []);

  const view = useMemo(
    () => ({ ra: state.ra, dec: state.dec, fov: state.fov }),
    [state.ra, state.dec, state.fov],
  );
  const frames = useFrames(view, state.band, IMAGE_SIZE, reloadKey, state.plane);
  const player = usePlayer(frames.frames.length, { fps: state.fps, playing: state.play });
  const current = frames.frames[player.index] ?? null;
  const ops = useImageOps(frames.frames, player.index, state.op, state.ref, state.n, state.gain);
  const overlays = useOverlays(view);
  const frameMjd = useMemo(() => current?.mjd ?? mjdNow(), [current]);
  const overlayCanvas = useOverlayCanvas(overlays, view, frameMjd);
  const description = useDescription(state.ra, state.dec, state.fov);
  const movers = useMovers(frames.frames, view, state.band, overlays.results, description.curated?.name ?? description.highlight?.name ?? null);
  const { draw: drawOverlays } = overlayCanvas;
  const { draw: drawMovers } = movers;
  const drawExtra = useCallback(
    (ctx: CanvasRenderingContext2D, geom: Parameters<typeof drawMovers>[1]) => {
      drawOverlays(ctx, geom);
      drawMovers(ctx, geom);
    },
    [drawOverlays, drawMovers],
  );
  const lightCurve = useLightCurve(view);
  const canvasLayers = useMemo(() => ({ draw: drawExtra, pick: overlayCanvas.pick }), [drawExtra, overlayCanvas.pick]);
  const canvasExtras = useCanvasExtras(canvasLayers, lightCurve);

  // Frame from the URL: keep the paused player on that exposure while frames
  // are still arriving (new ones can be inserted before it in time order).
  const { playing, setIndex } = player;
  useEffect(() => {
    if (playing || !state.frame) return;
    const i = frames.frames.findIndex((f) => f.obs_id === state.frame);
    if (i >= 0 && i !== player.index) setIndex(i);
  }, [frames.frames, state.frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // ...and write the player back: the paused frame and the speed go in the URL.
  useEffect(() => {
    if (playing) update({ play: true });
    else if (current) update({ play: false, frame: current.obs_id });
    else update({ play: false });
  }, [player.index, playing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => update({ fps: player.fps }), [player.fps, update]);

  useEmbedBridge(state, update, player, current, frames.frames.length);

  // In an iframe the picture must also fit the height.
  const [winHeight, setWinHeight] = useState(window.innerHeight);
  useEffect(() => {
    const onResize = () => setWinHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // On a desktop the picture is as big as the window allows: everything below
  // the bars, with the player and cards beside it (see .viewer in styles.css).
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageTop, setStageTop] = useState(0);
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1100px)").matches);
  useEffect(() => {
    if (state.embed) return;
    const mq = window.matchMedia("(min-width: 1100px)");
    const measure = () => {
      setWide(mq.matches);
      const el = stageRef.current;
      if (el) setStageTop(Math.round(el.getBoundingClientRect().top + window.scrollY));

    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, [state.embed]);
  const maxSide = state.embed
    ? winHeight - (state.controls ? 190 : 50)
    : wide && stageTop > 0
      ? Math.max(360, winHeight - stageTop - 24)
      : undefined;

  // A short summary of what's on screen for the Niche helper (read when a question is sent).
  const chatContext = () => {
    const fr = frames.frames;
    const mv = movers.state.result;
    return {
      ra: +state.ra.toFixed(5),
      dec: +state.dec.toFixed(5),
      field_arcmin: +(state.fov * 60).toFixed(1),
      target: description.curated ? { name: description.curated.name, kind: description.curated.kind } : description.highlight?.name ?? null,
      band: state.band,
      frames: fr.length,
      dates: fr.length ? `${fr[0].date.slice(0, 10)} to ${fr[fr.length - 1].date.slice(0, 10)}` : null,
      showing: current ? { date: current.date.slice(0, 16), detector: current.detector, microns: `${current.wave_min.toFixed(2)}-${current.wave_max.toFixed(2)}` } : null,
      playing: player.playing,
      image_mode: ops.label ?? "single frames",
      product: state.plane,
      overlays_on: Object.entries(overlays.enabled).filter(([, on]) => on).map(([k]) => k),
      selected_source: overlays.selected ? overlays.selected.layer : null,
      movers: mv
        ? mv.note ?? mv.candidates.slice(0, 4).map((c) => ({ id: c.id, shift_arcsec: +c.shiftArcsec.toFixed(1), arcsec_per_yr: +c.ratePerYear.toFixed(1), dir: c.direction, note: movers.state.notes[c.id] ?? null }))
        : "not run",
      light_curve_at: lightCurve.target.picked ? "picked star" : "field centre",
      loading: frames.loading,
    };
  };

  // Keyboard: space = play/pause, arrows = step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        player.toggle();
      } else if (e.key === "ArrowLeft") player.step(-1);
      else if (e.key === "ArrowRight") player.step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player]);

  return (
    <div className={state.embed ? "app embed" : "app"}>
      <a className="skip-link" href="#viewer">Skip to the viewer</a>
      {!state.embed && (
        <header className="topbar">
          <div className="brand">
            <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
              <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-25 16 16)" />
              <circle cx="16" cy="16" r="3.2" fill="currentColor" />
              <circle cx="26.5" cy="11" r="1.8" className="logo-mover" />
            </svg>
            <div>
              <h1><a className="home-link" href={window.location.pathname}>Niche Space Directory</a></h1>
              <p className="tagline">Made for NASA Space Apps 2026</p>
            </div>
          </div>
          <p className="intro">
            These are NASA SPHEREx<Info term="spherex" /> infrared<Info term="infrared" /> pictures of one spot, taken on different days<Info term="blink" />. Most stars stay put.
            If a dot jumps between frames, it is probably close to us.{" "}
            <a href="#glossary" onClick={() => document.getElementById("glossary")?.setAttribute("open", "")}>What do these words mean?</a>
          </p>
          <Tour steps={VIEWER_STEPS} part="viewer" />
          <a className="new-search" href={`${window.location.pathname}?view=3d`}>Niche in 3D</a>
          <a className="new-search" href={window.location.pathname}>New search</a>
          <AccountButton savedPanelId="saved-views" />
        </header>
      )}

      {!state.embed && <Controls state={state} bands={frames.list?.bands ?? []} onChange={update} />}

      <main>
        <section
          className="viewer"
          id="viewer"
          aria-label="Blink viewer"
          style={!state.embed && maxSide ? ({ "--side": `${maxSide}px` } as React.CSSProperties) : undefined}
        >
          <div className="stage" ref={stageRef}>
            <BlinkCanvas
              frame={current}
              image={ops.image}
              view={view}
              invert={state.invert}
              showMarker={state.marker}
              zoom={state.zoom}
              onZoomChange={(zoom) => update({ zoom: +zoom.toFixed(2) })}
              onRecenter={(ra, dec) => update({ ra, dec })}
              onLoadView={(ra, dec, fov) => update({ ra, dec, fov })}
              maxSide={maxSide}
              drawExtra={canvasExtras.draw}
              onPick={canvasExtras.pick}
            >
              {overlays.selected && (
                <SourceCard
                  selection={overlays.selected}
                  layer={overlays.results[overlays.selected.layer]}
                  mjd={frameMjd}
                  onClose={() => overlays.setSelected(null)}
                  onCentre={(ra, dec) => update({ ra, dec })}
                />
              )}
            </BlinkCanvas>
            <ViewerOverlay
              frames={frames}
              band={state.band}
              onRetry={() => setReloadKey((k) => k + 1)}
              onBand={(band) => update({ band })}
              onExample={() => update({ ra: DEFAULT_STATE.ra, dec: DEFAULT_STATE.dec, band: DEFAULT_STATE.band })}
            />
          </div>
          {ops.label && <p className="ops-banner">{ops.label}</p>}
          {(!state.embed || state.controls) && <PlayerControls player={player} frames={frames.frames} />}
          {state.embed && (
            <p className="embed-credit">
              SPHEREx images: NASA/JPL-Caltech/IRSA.{" "}
              <a href={absoluteUrl(state, { embed: false })} target="_blank" rel="noreferrer">
                Open the full viewer
              </a>
            </p>
          )}
        </section>

        <aside ref={asideRef}>
          <section className="card">
            <h2>This view</h2>
            <dl>
              <dt>RA<Info term="ra" /></dt>
              <dd>{formatRa(state.ra)} <span className="muted">({state.ra.toFixed(5)}°)</span></dd>
              <dt>Dec<Info term="dec" /></dt>
              <dd>{formatDec(state.dec)} <span className="muted">({state.dec.toFixed(5)}°)</span></dd>
              <dt>Field<Info term="fov" /></dt>
              <dd>{formatFov(state.fov)} × {formatFov(state.fov)}, north up, east left</dd>
            </dl>
            <label className="check">
              <input type="checkbox" checked={state.marker} onChange={(e) => update({ marker: e.target.checked })} />
              Mark the target position
            </label>
            <label className="check">
              <input type="checkbox" checked={state.invert} onChange={(e) => update({ invert: e.target.checked })} />
              Invert colours
            </label>
          </section>
          <section className="card">
            <DescribePanel d={description} onCentre={(ra, dec) => update({ ra, dec })} />
          </section>
          <section className="card">
            <MoverPanel movers={movers} frames={frames.frames} loading={frames.loading} onCentre={(ra, dec) => update({ ra, dec })} />
          </section>
          <section className="card">
            <ProductsPanel plane={state.plane} frame={current} view={view} onChange={update} />
          </section>
          <section className="card">
            <h2>Add / subtract images<Info term="difference" /></h2>
            <ImageOpsPanel state={state} frames={frames.frames} current={current} label={ops.label} onChange={update} />
          </section>
          <section className="card">
            <OverlayPanel overlays={overlays} />
          </section>
          <section className="card">
            <LightCurvePanel lc={lightCurve} bands={(frames.list?.bands ?? []).map((b) => b.detector)} />
          </section>
          <section className="card">
            <DataPanel view={view} band={state.band} frame={current} playing={player.playing} />
            <p className="hint">
              Each SPHEREx exposure sees a slightly different wavelength at this spot, so brightness can
              change from frame to frame even for ordinary stars.
            </p>
          </section>
          <section className="card">
            <h2>Move around the sky<Info term="arcmin" /></h2>
            <SkyNavigator ra={state.ra} dec={state.dec} fov={state.fov} targets={targets} onJump={(ra, dec) => update({ ra, dec })} />
            <p className="hint">
              Scroll or pinch to zoom, drag to pan (Shift+arrows or WASD on a keyboard, + and − to zoom, 0 to
              fit). Double-click re-centres. Space plays or pauses, arrow keys step one frame.
            </p>
          </section>
          <section className="card">
            <SavedPanel
              state={state}
              suggestedName={description.curated?.name ?? description.highlight?.name ?? `RA ${formatRa(state.ra)} Dec ${formatDec(state.dec)}`}
              description={shortLabel(description)}
              onOpen={(query) => update({ ...parseUrl(query), embed: false, controls: true })}
            />
          </section>
          <section className="card">
            <GlossaryPanel />
          </section>
          <section className="card">
            <h2>Share</h2>
            <EmbedPanel state={state} />
            <AladinPanel ra={state.ra} dec={state.dec} fov={state.fov} />
          </section>
        </aside>
      </main>

      {!state.embed && <NicheChat context={chatContext} />}

      <StatusBar frames={frames} onRefresh={() => setReloadKey((k) => k + 1)} />

      {!state.embed && (
        <footer className="credits">
          SPHEREx data: NASA/JPL-Caltech, served by the{" "}
          <a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">
            NASA/IPAC Infrared Science Archive
          </a>
          . Built for the NASA Space Apps Challenge: Planet X and SPHEREx.
          <p className="team-credit">Niche Nomads: Anish M., Namish O., Jayanth J., Arnav B.</p>
          <SourcesButton />
        </footer>
      )}
    </div>
  );
}
