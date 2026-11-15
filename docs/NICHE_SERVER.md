# Running Niche from our own computer

By default Niche (the chat helper and plain-English search) runs a small model
inside each visitor's browser, which means a big first download. If one of our
computers is switched on and serving a model, the site uses that instead: no
download, faster and better answers. If that computer is off, the site quietly
falls back to the in-browser model.

## On the computer (Windows, RTX 4060 is plenty)

1. Install Ollama from ollama.com and pick **run model locally**.
2. In a terminal: `ollama pull qwen3:8b`
3. Make a free account at ngrok.com. In the dashboard, copy your authtoken
   and claim your free static domain (looks like `something.ngrok-free.app`).
4. `winget install ngrok.ngrok`, then `ngrok config add-authtoken <token>`
5. Start the tunnel and leave the window open:
   `ngrok http 11434 --host-header=localhost:11434 --url=something.ngrok-free.app`
6. Set Windows to never sleep while plugged in (Settings > System > Power).

Ollama starts by itself when Windows starts; only the ngrok window needs
reopening after a restart.

## On Vercel (whoever owns the project)

Project > Settings > Environment Variables, add for Production **and** Preview:

| Name | Value |
| --- | --- |
| `NICHE_SERVER_URL` | `https://something.ngrok-free.app` |
| `NICHE_MODEL` (optional) | `qwen3:8b` (the default) |
| `NICHE_DAILY_LIMIT` (optional) | answers per day across all visitors, default 2000 |

Then redeploy. To check, open `https://<site>/api/niche`: it should say
`{"ready":true}` while the computer is on.

## Trying it locally

Put `NICHE_SERVER_URL=http://localhost:11434` in `frontend/.env.local` and run
`npm run dev`. The dev server serves `/api/niche` the same way Vercel does.

## Good to know

- The tunnel address is only stored in Vercel, never sent to visitors. Anyone
  who learned it could still use the model, so don't post it anywhere.
- All visitors share that one computer, so answers slow down if many people ask
  at once. The function limits each visitor to 30 questions per 10 minutes.
