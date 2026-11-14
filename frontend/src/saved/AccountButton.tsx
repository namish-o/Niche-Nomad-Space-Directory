// Top-right "Sign in" / account button. Shares the session with the saved views panel.
import { useEffect, useRef, useState } from "react";
import { cloudConfigured } from "./store";
import { useAuth } from "./useAuth";
import "./saved.css";

export default function AccountButton({ savedPanelId }: { savedPanelId?: string }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!cloudConfigured) return null;
  const user = auth.session?.user;
  const label = !auth.ready ? "…" : user ? (user.email ?? "Account").split("@")[0] : "Sign in";

  return (
    <div className="account" ref={wrap}>
      <button type="button" className="account-btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)} disabled={!auth.ready}>
        {user && <span className="account-dot" aria-hidden="true">{label[0]?.toUpperCase()}</span>}
        <span className="account-label">{label}</span>
      </button>
      {open && (
        <div className="account-menu" role="dialog" aria-label={user ? "Your account" : "Sign in"}>
          {user ? (
            <>
              <p className="account-email">Signed in as <strong>{user.email}</strong></p>
              {savedPanelId && (
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    document.getElementById(savedPanelId)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setOpen(false);
                  }}
                >
                  My saved views
                </button>
              )}
              <button type="button" onClick={() => auth.signOut().then(() => setOpen(false))}>Sign out</button>
            </>
          ) : sent ? (
            <p className="hint">Check <strong>{email}</strong> for a sign-in link. You can close this.</p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                try {
                  await auth.signIn(email.trim());
                  setSent(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              <p className="hint">Sign in to save views to your account and open them on any device. No password: we email you a link.</p>
              <input type="email" required autoFocus aria-label="Email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="primary">Email me a link</button>
              {error && <p className="saved-error" role="alert">{error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
