import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cloudConfigured, supabase } from "./store";

/** Current Supabase session (null when signed out or not configured). */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);

  useEffect(() => {
    if (!cloudConfigured) return;
    let unsub = () => {};
    supabase()
      .then(async (sb) => {
        // The magic link returns here with the session in the URL; supabase-js reads it.
        const { data } = await sb.auth.getSession();
        setSession(data.session);
        unsub = sb.auth.onAuthStateChange((_e, s) => setSession(s)).data.subscription.unsubscribe;
      })
      .catch(() => {})
      .finally(() => setReady(true));
    return () => unsub();
  }, []);

  const signIn = async (email: string) => {
    const sb = await supabase();
    // Come back to the same view after clicking the link in the email.
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    if (error) throw new Error(error.message);
  };
  const signOut = async () => {
    await (await supabase()).auth.signOut();
  };
  return { session, ready, signIn, signOut };
}
