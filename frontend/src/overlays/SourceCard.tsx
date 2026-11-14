// Small card over the picture with the basic facts of the clicked source.
import { formatDec, formatRa } from "../lib/sky";
import type { CatalogResult } from "./api";
import { LAYER_STYLE } from "./draw";
import { mjdToYear, positionAt, skyToOffset, totalPm } from "./motion";
import type { Selection } from "./useOverlays";
import Info from "../glossary/Info";

interface Props {
  selection: Selection;
  layer: CatalogResult | undefined;
  mjd: number; // date of the frame on screen
  onClose: () => void;
  onCentre?: (ra: number, dec: number) => void;
}

const LY_PER_PC = 3.2616;

export default function SourceCard({ selection, layer, mjd, onClose, onCentre }: Props) {
  const { source: s, layer: key } = selection;
  const epoch = s.epoch_mjd ?? layer?.epoch_mjd ?? mjd;
  const now = s.pm_ok === false ? s : positionAt(s.ra, s.dec, s.pmra, s.pmdec, epoch, mjd);
  const pm = totalPm(s.pmra, s.pmdec);
  const hasPm = s.pmra !== null || s.pmdec !== null;
  const moved = skyToOffset(s.ra, s.dec, now.ra, now.dec);
  const movedArcsec = moved ? Math.hypot(moved.east, moved.north) : 0;
  const year = mjdToYear(s.pm_ok === false ? epoch : mjd).toFixed(1);
  const simbad =
    `https://simbad.cds.unistra.fr/simbad/sim-coo?Coord=${s.ra.toFixed(6)}+${s.dec >= 0 ? "%2B" : ""}${s.dec.toFixed(6)}` +
    `&CooFrame=ICRS&Radius=10&Radius.unit=arcsec`;

  return (
    <div className="source-card" role="dialog" aria-label="Source details">
      <button className="source-close" onClick={onClose} aria-label="Close details">×</button>
      <div className="source-layer" style={{ color: LAYER_STYLE[key].color }}>{LAYER_STYLE[key].label}</div>
      <div className="source-name">{s.name ?? s.id}</div>
      {s.name && <div className="muted source-id">{s.id}</div>}
      <dl>
        <dt>Position {year}</dt>
        <dd>{formatRa(now.ra)}<br />{formatDec(now.dec)}</dd>
        {s.mag !== null && (
          <>
            <dt>Brightness<Info term="magnitude" /></dt>
            <dd>
              {layer?.mag_label} {s.mag.toFixed(2)}
              {s.w1 != null && <span className="muted"> · W1 {s.w1.toFixed(2)}</span>}
            </dd>
          </>
        )}
        {hasPm && (
          <>
            <dt>Motion<Info term="properMotion" /></dt>
            <dd>
              {pm >= 1000 ? `${(pm / 1000).toFixed(2)}″` : `${pm.toFixed(1)} mas`} per year
              {s.pm_err != null && <span className="muted"> ± {s.pm_err.toFixed(0)} mas</span>}
              {movedArcsec >= 1 && (
                <div className="muted">moved {movedArcsec.toFixed(1)}″ since {mjdToYear(epoch).toFixed(1)}</div>
              )}
            </dd>
          </>
        )}
        {s.parallax != null && s.parallax > 0 && (
          <>
            <dt>Distance</dt>
            <dd>
              {((1000 / s.parallax) * LY_PER_PC).toLocaleString(undefined, { maximumSignificantDigits: 3 })} light years
              {s.parallax < 1 && <span className="muted"> (uncertain)</span>}
            </dd>
          </>
        )}
      </dl>
      {s.note && <p className="source-note">{s.note}</p>}
      {s.pm_ok === false && (
        <p className="source-note">The catalogue's motion fit for this source is poor, so it is drawn where it was measured.</p>
      )}
      {s.spurious && <p className="source-note">Flagged by CatWISE as a likely artefact (halo, ghost or diffraction spike).</p>}
      {key === "wise" && s.pm_ok !== false && pm > 2000 && (
        <p className="source-note">CatWISE motions above 2″ a year are often wrong: very fast objects get split into pieces.</p>
      )}
      <div className="source-actions">
        <a href={simbad} target="_blank" rel="noreferrer">SIMBAD</a>
        {onCentre && <button onClick={() => onCentre(now.ra, now.dec)}>Centre here</button>}
      </div>
    </div>
  );
}
