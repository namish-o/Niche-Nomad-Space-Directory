import { useEffect, useMemo, useState } from "react";
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
import { useEmbedBridge } from "./state/embedBridge";
import { fetchTargets, type Target } from "./api/client";
import { formatDec, formatFov, formatRa } from "./lib/sky";
import DataPanel from "./data/DataPanel";
import { AladinPanel, OverlayPanel, SourceCard, mjdNow, useOverlayCanvas, useOverlays } from "./overlays";
import Info from "./glossary/Info";
import GlossaryPanel from "./glossary/GlossaryPanel";

const IMAGE_SIZE = 384; // pixels requested from the backend per frame

export default function App() {
  const [state, update] = useUrlState();
  const [reloadKey, setReloadKey] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  useEffect(() => {
    fetchTargets().then(setTargets).catch(() => setTargets([]));
  }, []);

  const view = useMemo(
    () => ({ ra: state.ra, dec: state.dec, fov: state.fov }),
    [state.ra, state.dec, state.fov],
  );
  const frames = useFrames(view, state.band, IMAGE_SIZE, reloadKey);
  const player = usePlayer(frames.frames.length, { fps: state.fps, playing: state.play });
  const current = frames.frames[player.index] ?? null;
  const ops = useImageOps(frames.frames, player.index, state.op, state.ref, state.n, state.gain);
  const overlays = useOverlays(view);
  const frameMjd = useMemo(() => current?.mjd ?? mjdNow(), [current]);
  const overlayCanvas = useOverlayCanvas(overlays, view, frameMjd);
  const description = useDescription(state.ra, state.dec, state.fov);

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
  const maxSide = state.embed ? winHeight - (state.controls ? 190 : 50) : undefined;

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
              <h1>SPHEREx Blink</h1>
              <p className="tagline">Planet X hunter · NASA Space Apps 2026</p>
            </div>
          </div>
          <p className="intro">
            Flip through NASA SPHEREx<Info term="spherex" /> infrared<Info term="infrared" /> images of one patch of sky over time<Info term="blink" />. Stars stay put.
            Anything that moves between frames could be a nearby object.{" "}
            <a href="#glossary" onClick={() => document.getElementById("glossary")?.setAttribute("open", "")}>New to astronomy? Words explained ↓</a>
          </p>
        </header>
      )}

      {!state.embed && <Controls state={state} bands={frames.list?.bands ?? []} onChange={update} />}

      <main>
        <section className="viewer" id="viewer" aria-label="Blink viewer">
          <div className="stage">
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
              drawExtra={overlayCanvas.draw}
              onPick={overlayCanvas.pick}
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
              SPHEREx images: NASA/JPL-Caltech/IRSA ·{" "}
              <a href={absoluteUrl(state, { embed: false })} target="_blank" rel="noreferrer">
                Open full viewer ↗
              </a>
            </p>
          )}
        </section>

        <aside>
          <h2>This view</h2>
          <dl>
            <dt>RA<Info term="ra" /></dt>
            <dd>{formatRa(state.ra)} <span className="muted">({state.ra.toFixed(5)}°)</span></dd>
            <dt>Dec<Info term="dec" /></dt>
            <dd>{formatDec(state.dec)} <span className="muted">({state.dec.toFixed(5)}°)</span></dd>
            <dt>Field<Info term="fov" /></dt>
            <dd>{formatFov(state.fov)} × {formatFov(state.fov)}, north up, east left</dd>
          </dl>
          <DescribePanel d={description} onCentre={(ra, dec) => update({ ra, dec })} />
          <SavedPanel
            state={state}
            suggestedName={description.curated?.name ?? description.highlight?.name ?? `RA ${formatRa(state.ra)} Dec ${formatDec(state.dec)}`}
            description={shortLabel(description)}
            onOpen={(query) => update({ ...parseUrl(query), embed: false, controls: true })}
          />

          <label className="check">
            <input type="checkbox" checked={state.marker} onChange={(e) => update({ marker: e.target.checked })} />
            Mark the target position
          </label>
          <label className="check">
            <input type="checkbox" checked={state.invert} onChange={(e) => update({ invert: e.target.checked })} />
            Invert colours
          </label>
          <OverlayPanel overlays={overlays} />

          <h2>Move around the sky<Info term="arcmin" /></h2>
          <SkyNavigator ra={state.ra} dec={state.dec} fov={state.fov} targets={targets} onJump={(ra, dec) => update({ ra, dec })} />
          <p className="hint">
            Scroll or pinch to zoom, drag to pan (Shift+arrows or WASD on a keyboard, + and − to zoom, 0 to
            fit). Double-click re-centres. Space plays or pauses, arrow keys step one frame.
          </p>

          <h2>Add / subtract images<Info term="difference" /></h2>
          <ImageOpsPanel state={state} frames={frames.frames} current={current} label={ops.label} onChange={update} />

          <DataPanel view={view} band={state.band} frame={current} playing={player.playing} />

          <p className="hint">
            Each SPHEREx exposure sees a slightly different wavelength at this spot, so brightness can
            change from frame to frame even for ordinary stars.
          </p>

          <GlossaryPanel />

          <h2>Share</h2>
          <EmbedPanel state={state} />
          <AladinPanel ra={state.ra} dec={state.dec} fov={state.fov} />
        </aside>
      </main>

      <StatusBar frames={frames} onRefresh={() => setReloadKey((k) => k + 1)} />

      {!state.embed && (
        <footer className="credits">
          SPHEREx data: NASA/JPL-Caltech, served by the{" "}
          <a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">
            NASA/IPAC Infrared Science Archive
          </a>
          . Built for the NASA Space Apps Challenge: Planet X and SPHEREx.
        </footer>
      )}
    </div>
  );
}
