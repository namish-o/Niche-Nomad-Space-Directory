// "My saved views": save the current position (RA/Dec, field, band, note) and
// come back to it later. Signed in, saves live in your account; otherwise in this browser.
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDec, formatFov, formatRa } from "../lib/sky";
import { toQuery, type ViewState } from "../state/urlState";
import { clearLocal, cloudConfigured, cloudStore, localStore, type SavedView, type Store } from "./store";
import { useAuth } from "./useAuth";
import "./saved.css";

interface Props {
  state: ViewState;
  suggestedName: string;
  description: string | null;
  onOpen: (query: string) => void;
}

export default function SavedPanel({ state, suggestedName, description, onOpen }: Props) {
  const auth = useAuth();
  const store: Store = useMemo(() => (auth.session ? cloudStore(auth.session) : localStore), [auth.session]);
  const [rows, setRows] = useState<SavedView[] | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await store.list());
      if (auth.session) setLocalCount((await localStore.list()).length);
      setError(null);
    } catch (e) {
      setError(msg(e));
      setRows([]);
    }
  }, [store, auth.session]);
  useEffect(() => {
    if (auth.ready) refresh();
  }, [auth.ready, refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await store.add({
        name: name.trim() || suggestedName,
        note: note.trim(),
        ra: state.ra,
        dec: state.dec,
        fov: state.fov,
        band: state.band,
        query: toQuery({ ...state, embed: false, play: false }),
        description,
      });
      setName("");
      setNote("");
    });
  };

  const moveLocal = () =>
    run(async () => {
      const local = await localStore.list();
      for (const r of local.reverse()) {
        const { id: _id, created_at: _c, ...rest } = r;
        await store.add(rest);
      }
      clearLocal();
    });

  return (
    <section className="saved" aria-label="My saved views">
      <h2>My saved views</h2>
      {cloudConfigured ? <Account auth={auth} /> : <p className="hint">Saves are kept in this browser.</p>}

      <form className="saved-form" onSubmit={save}>
        <input aria-label="Name for this view" placeholder={suggestedName} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        <textarea aria-label="Note" placeholder="Note (optional): what did you spot?" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="primary" disabled={busy || !auth.ready}>Save this view</button>
      </form>

      {auth.session && localCount > 0 && (
        <p className="hint">
          {localCount} save{localCount > 1 ? "s" : ""} from before you signed in {localCount > 1 ? "are" : "is"} still in this browser.{" "}
          <button type="button" className="link" onClick={moveLocal} disabled={busy}>Move into my account</button>
        </p>
      )}
      {error && <p className="saved-error" role="alert">{error}</p>}
      {rows && rows.length === 0 && !error && <p className="muted">Nothing saved yet.</p>}
      {rows && rows.length > 0 && (
        <ul className="saved-list">
          {rows.map((r) => (
            <SavedItem key={r.id} row={r} busy={busy} onOpen={() => onOpen(r.query)} onUpdate={(p) => run(() => store.update(r.id, p))} onDelete={() => run(() => store.remove(r.id))} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Account({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!auth.ready) return <p className="muted">Checking sign-in…</p>;
  if (auth.session)
    return (
      <p className="saved-account">
        Signed in as <strong>{auth.session.user.email}</strong>{" "}
        <button type="button" className="link" onClick={() => auth.signOut()}>Sign out</button>
      </p>
    );
  if (sent) return <p className="hint">Check {email} for a sign-in link. Until then, saves stay in this browser.</p>;
  return (
    <form
      className="saved-login"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await auth.signIn(email.trim());
          setSent(true);
        } catch (err) {
          setError(msg(err));
        }
      }}
    >
      <p className="hint">Sign in to keep your saves on any device. No password: we email you a link.</p>
      <div className="saved-row">
        <input type="email" required aria-label="Email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Email me a link</button>
      </div>
      {error && <p className="saved-error" role="alert">{error}</p>}
    </form>
  );
}

function SavedItem({ row, busy, onOpen, onUpdate, onDelete }: { row: SavedView; busy: boolean; onOpen: () => void; onUpdate: (p: { name: string; note: string }) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(row.name);
  const [note, setNote] = useState(row.note);
  const when = new Date(row.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <li>
      {editing ? (
        <form
          className="saved-form"
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate({ name: name.trim() || row.name, note: note.trim() });
            setEditing(false);
          }}
        >
          <input aria-label="Name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <textarea aria-label="Note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="saved-row">
            <button type="submit" disabled={busy}>Save</button>
            <button type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <button type="button" className="saved-open" onClick={onOpen} title="Open this view">{row.name}</button>
          <p className="saved-meta">
            {formatRa(row.ra)} {formatDec(row.dec)} · {formatFov(row.fov)} · band {row.band} · {when}
          </p>
          {row.description && <p className="saved-desc">{row.description}</p>}
          {row.note && <p className="saved-note">{row.note}</p>}
          <div className="saved-actions">
            <button type="button" className="link" onClick={() => setEditing(true)}>Rename / edit note</button>
            {confirm ? (
              <>
                <button type="button" className="link danger" onClick={onDelete} disabled={busy}>Yes, delete</button>
                <button type="button" className="link" onClick={() => setConfirm(false)}>Keep</button>
              </>
            ) : (
              <button type="button" className="link" onClick={() => setConfirm(true)}>Delete</button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
