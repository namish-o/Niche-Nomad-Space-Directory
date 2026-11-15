# Deploying

The site is static. The only thing a host must do besides serving files is
forward `/irsa/*` to `https://irsa.ipac.caltech.edu/*`, because IRSA does not
send CORS headers and browsers block direct calls from other sites.

| Host | What to do |
| --- | --- |
| Render | New > Blueprint. `render.yaml` has the build and the rewrite. Step by step below. |
| Netlify | Import the repo. `netlify.toml` already has the build and the rewrite. |
| Vercel | Import the repo. `vercel.json` already has the build and the rewrite. |
| Cloudflare Pages | Build command `cd frontend && npm ci && npm run build`, output `frontend/dist`, and set `VITE_IRSA_BASE` to a Worker from `proxy/cloudflare-worker.js`. |
| GitHub Pages | Same as Cloudflare Pages: deploy the Worker, build with `VITE_IRSA_BASE`, publish `frontend/dist`. |

Optional: set `VITE_SENTRY_DSN` at build time to report browser errors to Sentry.

Niche (the chat helper, plain-English search and mover notes) needs no key or
server. It is a small model (Qwen3 0.6B) that each visitor's browser downloads
from Hugging Face the first time they open Niche or search in plain English,
and then keeps in its cache. It is fastest with WebGPU (recent Chrome or Edge);
other browsers fall back to the slower CPU version. Optionally, Niche can run
from one of our own computers instead (no download for visitors); see
[NICHE_SERVER.md](NICHE_SERVER.md).

## Render, step by step

Render hosts static sites for free. Whoever owns the GitHub repo (or has
admin rights on it) should do steps 1 to 3, because Render needs permission
to read the repo.

1. Go to <https://render.com> and click **Get Started**. Choose **GitHub**
   and sign in with the GitHub account that owns the repo.
2. In the Render dashboard click **New +** (top right), then **Blueprint**.
3. Render asks to connect GitHub. Click **Connect GitHub**, pick the
   account that owns the repo, choose **Only select repositories**, tick
   `Niche-Nomad-Space-Directory`, and click **Install**.
4. Back in Render, click **Connect** next to the repo.
5. Give the Blueprint any name (for example `spherex-blink`). Render reads
   `render.yaml` and shows one service, a static site called
   `spherex-blink`. It may ask for `VITE_SENTRY_DSN`: leave it blank, or
   paste the Sentry DSN if you want error reports.
6. Click **Apply** (or **Deploy Blueprint**). The first build takes about
   two minutes. When the status turns **Live**, the address is shown at the
   top, like `https://spherex-blink.onrender.com`.
7. Check it works: open the site and load Barnard's Star. Images should
   appear within a minute. You can also open
   `https://<your-site>.onrender.com/irsa/SIA?POS=circle%20269.45%204.69%200.01&INSTRUMENT=SPHEREx&RESPONSEFORMAT=VOTABLE`,
   which should show a page of XML from NASA, not an error.

After that, every merge to `main` redeploys the site by itself.

If step 7 shows an error instead of XML, Render is not forwarding to IRSA.
Deploy `proxy/cloudflare-worker.js` as a Cloudflare Worker, then in Render
open the site, go to **Environment**, add `VITE_IRSA_BASE` set to the
Worker's URL, and click **Manual Deploy > Clear build cache & deploy**.

Notes
- IRSA answers "503 Server busy" above about four parallel requests per client,
  so the site downloads four cutouts at a time and retries with backoff.
- Each cutout file ends with a ~4 MB PSF table the viewer does not need. The
  browser stops reading after the image planes (a few kB), and closing the
  connection also frees IRSA.
