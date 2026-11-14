// Side-panel section: switch catalogue layers on and off.
import type { LayerKey } from "./api";
import { LAYER_STYLE } from "./draw";
import { LAYER_KEYS, type OverlaysState } from "./useOverlays";
import Info from "../glossary/Info";

const HELP: Record<LayerKey, string> = {
  gaia: "Optical stars with precise motions (ESA Gaia, 3rd release).",
  wise: "Infrared sources from NASA WISE, including cold brown dwarfs Gaia cannot see.",
  movers: "Famous fast movers the catalogues miss, such as WISE 0855.",
};

export default function OverlayPanel({ overlays }: { overlays: OverlaysState }) {
  const { enabled, setEnabled, status, results, followMotion, setFollowMotion } = overlays;
  return (
    <div className="overlay-panel">
      <h2>Catalogue overlays<Info term="catalogue" /></h2>
      {LAYER_KEYS.map((key) => {
        const st = status[key];
        const r = results[key];
        let detail = "";
        if (enabled[key]) {
          if (st?.loading) detail = "loading…";
          else if (st?.error) detail = "failed";
          else if (r) detail = r.total > r.sources.length ? `${r.sources.length} of ${r.total}` : `${r.total}`;
        }
        return (
          <div key={key} className="overlay-layer">
            <label className="check" title={HELP[key]}>
              <input type="checkbox" checked={enabled[key]} onChange={(e) => setEnabled(key, e.target.checked)} />
              <span className={`ov-swatch ov-swatch-${key}`} style={{ borderColor: LAYER_STYLE[key].color }} />
              {LAYER_STYLE[key].label}
              <Info term={key} />
              {detail && <span className="muted overlay-count">{detail}</span>}
            </label>
            {enabled[key] && st?.error && (
              <p className="overlay-error">{st.error}. Switch it off and on to try again.</p>
            )}
          </div>
        );
      })}
      <label className="check" title="Uses each star's proper motion to place it where it was on the date of the frame on screen">
        <input type="checkbox" checked={followMotion} onChange={(e) => setFollowMotion(e.target.checked)} />
        Move stars to each frame's date
      </label>
      <p className="hint">
        Click a marker for details. <span style={{ color: LAYER_STYLE.movers.color }}>Pink</span> markers
        move faster than 0.1″ a year; the dashed line runs from where the catalogue measured them.
      </p>
    </div>
  );
}
