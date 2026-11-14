// Top controls: where to look (search box, test targets) and how (band, field of view).
import { useEffect, useState } from "react";
import { fetchTargets, resolveQuery, type BandInfo, type Target } from "../api/client";
import { type ViewState } from "../state/urlState";
import FovPicker from "./FovPicker";
import Info from "../glossary/Info";

interface Props {
  state: ViewState;
  bands: BandInfo[];
  onChange: (patch: Partial<ViewState>) => void;
}

export default function Controls({ state, bands, onChange }: Props) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTargets().then(setTargets).catch(() => setTargets([]));
  }, []);

  const current = targets.find(
    (t) => Math.abs(t.ra - state.ra) < 1e-4 && Math.abs(t.dec - state.dec) < 1e-4,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const pos = await resolveQuery(query);
      setError(null);
      onChange({ ra: pos.ra, dec: pos.dec });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that position");
    }
  };

  return (
    <div className="controls">
      <form onSubmit={submit} className="search">
        <label htmlFor="coords">RA / Dec</label><Info term="coordinates" />
        <input
          id="coords"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="133.7951 -7.2451  or  08h55m10.8s -07d14m42s"
          spellCheck={false}
        />
        <button type="submit" className="primary">Go</button>
      </form>

      <label>
        Test target
        <select
          value={current?.id ?? ""}
          onChange={(e) => {
            const t = targets.find((x) => x.id === e.target.value);
            if (t) onChange({ ra: t.ra, dec: t.dec, band: t.suggested_band });
          }}
        >
          <option value="">Custom position</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Band<Info term="band" /></span>
        <select value={state.band} onChange={(e) => onChange({ band: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6].map((d) => {
            const b = bands.find((x) => x.detector === d);
            return (
              <option key={d} value={d}>
                {b ? `D${d} · ${b.wave_min.toFixed(2)}–${b.wave_max.toFixed(2)} µm (${b.count})` : `D${d}`}
              </option>
            );
          })}
        </select>
      </label>

      <FovPicker value={state.fov} onChange={(fov) => onChange({ fov })} />

      {error && <p className="error" role="alert">{error}</p>}
      {current && <p className="note">{current.note}</p>}
    </div>
  );
}
