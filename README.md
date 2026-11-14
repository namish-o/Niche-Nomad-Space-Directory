# SPHEREx Blink

A web tool for the NASA Space Apps challenge **Planet X and SPHEREx**.

Type a sky position (RA/Dec) and the site shows every public SPHEREx image of
that patch as a short movie. Stars stay still. Anything that moves from frame
to frame could be a nearby object, which is exactly how you would look for a
new planet or brown dwarf in our Sun's neighbourhood.

Images come live from NASA's archive (IRSA), so new SPHEREx observations show
up on their own.

## Open it

It is a plain static website: open the public URL in any browser. Nothing to
install, no Python, no server of our own. All the work (finding images,
reading the FITS files, lining frames up north-up, the catalogue overlays)
happens in your browser.

## Put it online (one step)

Connect the repository to **Netlify** or **Vercel** and press deploy. The
settings are already in `netlify.toml` / `vercel.json`, including the one
rewrite rule the site needs: NASA's archive (IRSA) does not allow direct
browser calls from other websites (no CORS headers), so the host forwards
`/irsa/*` to `https://irsa.ipac.caltech.edu`. That rule is the only "server"
involved and it is free.

GitHub Pages cannot forward requests. To use it anyway, deploy
`proxy/cloudflare-worker.js` as a free Cloudflare Worker and build with
`VITE_IRSA_BASE=https://<your-worker>.workers.dev`. More in
[docs/DEPLOY.md](docs/DEPLOY.md).

Sign-in and saved views use Supabase; see [docs/SAVED_VIEWS.md](docs/SAVED_VIEWS.md).

## Work on the code

Needs [Node.js 18+](https://nodejs.org).

```bash
npm run setup   # once
npm run dev     # http://localhost:5173 (the dev server forwards /irsa itself)
```

`npm run build` writes the site to `frontend/dist`.

## Using it

- Pick a **test target** (WISE 0855, Barnard's Star, Epsilon Indi B, RW Aurigae,
  R Draconis) or type coordinates such as `133.7951 -7.2451` or
  `08h55m10.8s -07d14m42s`.
- **Play / Pause**, change the **speed**, or step one frame at a time
  (space bar and arrow keys work too).
- **Scroll** or pinch to zoom, **drag** to pan (or `+`/`-`, WASD), **double-click**
  to re-centre. After zooming or panning, "Load sharper images" fetches new
  pictures of just that area.
- Jump anywhere with the **all-sky map**, or step one field N/S/E/W.
- Choose the **band** (SPHEREx has six detectors covering 0.75 to 5 microns)
  and any **field of view** from 1′ to 1°.
- **Subtract** the median of all frames to make stars vanish so movers stand
  out, or **Add** a few frames together to see fainter things.
- The address bar always describes the current view (position, frame, zoom,
  image arithmetic), so you can share it. "Share" gives a link and iframe
  embed code (`&embed=1`).

## How the code is organised

```
frontend/src/
  data/irsa.ts       finds SPHEREx images (IRSA SIA) and downloads cutouts
  data/fits.ts       reads FITS cutouts, stops downloading once it has the image
  data/wcs.ts        sky <-> pixel maths (TAN-SIP), like astropy.wcs
  data/align.ts      rotates each image north-up, zodi subtraction, scaling
  data/catalogs.ts   Gaia DR3 / CatWISE2020 overlays (IRSA Gator) + known movers
  data/targets.ts    test targets and coordinate parsing
  data/quality.ts    which pixels to trust (FLAGS bitmask names from the header)
  data/bands.ts      the 102 spectral channels
  data/science.ts    frame metadata, co-adds, spectra (forced PSF photometry)
  data/DataPanel.tsx data panel UI (co-add, spectrum, flags)
  api/client.ts      what the components call
  state/ viewer/ components/ overlays/   the interface
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together and
where to add new features.

## Data credit

SPHEREx data: NASA/JPL-Caltech, served by the NASA/IPAC Infrared Science
Archive (IRSA).
