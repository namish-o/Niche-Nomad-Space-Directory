import React from "react";
import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import App from "./App";
import Home from "./home/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { initMonitoring, reportError } from "./lib/monitoring";
import "./styles.css";

initMonitoring().catch((err) => console.warn("Error reporting is off:", err));
window.addEventListener("unhandledrejection", (e) => {
  if ((e.reason as Error | undefined)?.name !== "AbortError") reportError(e.reason);
});

// The homepage shows only on a bare address. Any link with a position (or an
// embed) opens the viewer directly, so shared links keep working.
const wantsViewer = () => {
  const p = new URLSearchParams(window.location.search);
  return p.has("ra") || p.has("dec") || p.has("embed");
};

function Root() {
  const [viewer, setViewer] = useState(wantsViewer);
  useEffect(() => {
    const onPop = () => setViewer(wantsViewer());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  if (viewer) return <App />;
  return (
    <Home
      onGo={({ ra, dec, band }) => {
        const p = new URLSearchParams({ ra: ra.toFixed(6), dec: dec.toFixed(6) });
        if (band) p.set("band", String(band));
        window.history.pushState(null, "", `${window.location.pathname}?${p}`);
        window.scrollTo(0, 0);
        setViewer(true);
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
);
