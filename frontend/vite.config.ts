// Build config for the static site (redeploy after the Vercel limit reset).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is fully static. IRSA does not allow direct browser calls (no CORS
// headers), so /irsa/* is forwarded to IRSA: here by the dev server, in
// production by one rewrite rule in netlify.toml or vercel.json.
const irsa = {
  target: "https://irsa.ipac.caltech.edu",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/irsa/, ""),
  // The viewer stops reading a cutout once it has the image planes; close the
  // IRSA connection too, so IRSA does not count it as busy.
  configure: (proxy: import("http-proxy").Server) => {
    proxy.on("proxyReq", (proxyReq, _req, res) => {
      res.on("close", () => {
        if (!res.writableFinished) proxyReq.destroy();
      });
    });
  },
};

const simbad = {
  target: "https://simbad.cds.unistra.fr",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/simbad/, ""),
};

// IMAP's real-time (I-ALiRT) space weather feed, for the 3D map's solar wind card.
const ialirt = {
  target: "https://ialirt.imap-mission.com",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/ialirt/, ""),
};

export default defineConfig({
  plugins: [react()],
  // The Niche model runs in a module worker that imports transformers.js.
  worker: { format: "es" },
  server: { port: 5173, proxy: { "/irsa": irsa, "/simbad": simbad, "/ialirt": ialirt } },
  preview: { port: 4173, proxy: { "/irsa": irsa, "/simbad": simbad, "/ialirt": ialirt } },
});
