import { useEffect, useState } from "react";
import { curatedNear, type Curated } from "./curated";
import { coneSearch, pickHighlight, summarise, type SimbadObject } from "./simbad";

export interface Description {
  curated: Curated | null;
  highlight: SimbadObject | null;
  summary: string | null; // plain-English sentence for the highlight
  others: SimbadObject[]; // a few more named objects in the field
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, SimbadObject[]>();

/** Look up what is at the centre of the view (debounced, cached per position). */
export function useDescription(ra: number, dec: number, fovArcmin: number): Description {
  const curated = curatedNear(ra, dec);
  const radius = Math.min(10, Math.max(1, fovArcmin / 2));
  const key = `${ra.toFixed(4)},${dec.toFixed(4)},${radius.toFixed(1)}`;
  const [state, setState] = useState<{ key: string; objs: SimbadObject[] | null; error: string | null }>({ key: "", objs: null, error: null });

  useEffect(() => {
    const hit = cache.get(key);
    if (hit) return setState({ key, objs: hit, error: null });
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      coneSearch(ra, dec, radius, ctl.signal)
        .then((objs) => {
          cache.set(key, objs);
          setState({ key, objs, error: null });
        })
        .catch((e) => {
          if (!ctl.signal.aborted) setState({ key, objs: null, error: e instanceof Error ? e.message : String(e) });
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const objs = state.key === key ? state.objs : null;
  const highlight = objs ? pickHighlight(objs) : null;
  return {
    curated,
    highlight,
    summary: highlight ? summarise(highlight) : null,
    others: (objs ?? []).filter((o) => o !== highlight && !/^(\[|2MASS|Gaia|TYC|UCAC|SDSS|LEDA|GALEX|USNO)/.test(o.name)).slice(0, 4),
    loading: state.key !== key,
    error: state.key === key ? state.error : null,
  };
}

/** One line for a saved view's list entry. */
export function shortLabel(d: Description): string | null {
  if (d.curated) return `${d.curated.name}: ${d.curated.kind.toLowerCase()}`;
  if (d.highlight) return d.summary;
  return null;
}
