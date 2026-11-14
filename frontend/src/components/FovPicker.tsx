// Field of view: any value from 1′ to 60′ (1°), typed, slid or picked from presets.
// The slider is logarithmic so small fields get as much room as large ones.
import { useEffect, useState } from "react";
import { FOV_CHOICES, FOV_MAX, FOV_MIN } from "../state/urlState";
import { formatFov } from "../lib/sky";
import Info from "../glossary/Info";

interface Props {
  value: number; // arcmin
  onChange: (fov: number) => void;
}

const LOG_MIN = Math.log(FOV_MIN);
const LOG_MAX = Math.log(FOV_MAX);
const toSlider = (fov: number) => Math.round(((Math.log(fov) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000);
const fromSlider = (v: number) => {
  const fov = Math.exp(LOG_MIN + (v / 1000) * (LOG_MAX - LOG_MIN));
  return fov < 10 ? Math.round(fov * 10) / 10 : Math.round(fov);
};

export default function FovPicker({ value, onChange }: Props) {
  // The slider moves freely; images are only re-requested when it is let go.
  const [draft, setDraft] = useState(value);
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setDraft(value);
    setText(String(+value.toFixed(3)));
  }, [value]);

  const commit = (fov: number) => {
    const v = Math.min(FOV_MAX, Math.max(FOV_MIN, fov));
    if (Number.isFinite(v) && Math.abs(v - value) > 1e-6) onChange(v);
    else {
      setDraft(value);
      setText(String(+value.toFixed(3)));
    }
  };

  return (
    <fieldset className="fov-picker">
      <legend>Field of view<Info term="fov" /></legend>
      <div className="fov-row">
        <input
          type="range"
          min={0}
          max={1000}
          value={toSlider(draft)}
          onChange={(e) => setDraft(fromSlider(Number(e.target.value)))}
          onPointerUp={() => commit(draft)}
          onKeyUp={() => commit(draft)}
          onBlur={() => commit(draft)}
          aria-label="Field of view"
          aria-valuetext={formatFov(draft)}
        />
        <label className="fov-number">
          <input
            type="number"
            min={FOV_MIN}
            max={FOV_MAX}
            step="any"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit(Number(text))}
            onBlur={() => commit(Number(text))}
            aria-label="Field of view in arcminutes"
          />
          <span>arcmin</span>
        </label>
      </div>
      <div className="fov-presets">
        {FOV_CHOICES.map((f) => (
          <button
            key={f}
            type="button"
            className={Math.abs(f - value) < 1e-6 ? "chip active" : "chip"}
            onClick={() => onChange(f)}
            aria-pressed={Math.abs(f - value) < 1e-6}
          >
            {formatFov(f)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
