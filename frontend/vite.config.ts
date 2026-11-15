import { defineConfig, loadEnv, type Plugin } from "vite";
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

// /api/niche is a Vercel function in production (api/niche.ts). Serve the same
// code locally so the home-server option can be tried: put
// NICHE_SERVER_URL=http://localhost:11434 in frontend/.env.local.
function nicheApi(): Plugin {
  const mount = (server: { middlewares: import("vite").Connect.Server }) => {
    server.middlewares.use("/api/niche", async (req, res) => {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const { default: handler } = await import("../api/niche");
      const out = {
        status(code: number) {
          res.statusCode = code;
          return out;
        },
        setHeader: (k: string, v: string) => res.setHeader(k, v),
        json(body: unknown) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        },
      };
      await handler({ method: req.method, body: raw, headers: req.headers, socket: req.socket }, out);
    });
  };
  return { name: "niche-api", configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "NICHE_");
  for (const k in env) process.env[k] ??= env[k];
  return {
  plugins: [react(), nicheApi()],
  // The Niche model runs in a module worker that imports transformers.js.
  worker: { format: "es" },
  server: { port: 5173, proxy: { "/irsa": irsa, "/simbad": simbad, "/ialirt": ialirt } },
  preview: { port: 4173, proxy: { "/irsa": irsa, "/simbad": simbad, "/ialirt": ialirt } },
  };
});
