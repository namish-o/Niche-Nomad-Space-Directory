// Saved views ("points of history"). Two places to keep them:
//  - signed in with Supabase: the saved_views table (each user sees only their own rows)
//  - otherwise: this browser's localStorage
// Supabase is optional. Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the
// site works as before and saves stay on this device.
import type { Session, SupabaseClient } from "@supabase/supabase-js";

export interface SavedView {
  id: string;
  name: string;
  note: string;
  ra: number;
  dec: number;
  fov: number;
  band: number;
  query: string; // full URL query, so reopening restores everything
  description: string | null;
  created_at: string;
}
export type NewView = Omit<SavedView, "id" | "created_at">;
export type ViewPatch = Partial<Pick<SavedView, "name" | "note">>;

export interface Store {
  list(): Promise<SavedView[]>;
  add(v: NewView): Promise<SavedView>;
  update(id: string, patch: ViewPatch): Promise<void>;
  remove(id: string): Promise<void>;
}

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloudConfigured = Boolean(URL_ && KEY);

let client: Promise<SupabaseClient> | null = null;
/** The Supabase client, loaded only when the site is configured for it. */
export function supabase(): Promise<SupabaseClient> {
  if (!cloudConfigured) return Promise.reject(new Error("Supabase is not configured"));
  client ??= import("@supabase/supabase-js").then(({ createClient }) => createClient(URL_!, KEY!));
  return client;
}

// ---- this device -------------------------------------------------------------
const LS_KEY = "spherex-saved-views";
function readLocal(): SavedView[] {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeLocal(rows: SavedView[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    throw new Error("This browser won't let the site store saves (private mode?)");
  }
}
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const localStore: Store = {
  async list() {
    return readLocal().sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async add(v) {
    const row = { ...v, id: newId(), created_at: new Date().toISOString() };
    writeLocal([row, ...readLocal()]);
    return row;
  },
  async update(id, patch) {
    writeLocal(readLocal().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  },
  async remove(id) {
    writeLocal(readLocal().filter((r) => r.id !== id));
  },
};
export const clearLocal = () => writeLocal([]);

// ---- Supabase account ---------------------------------------------------------
const COLS = "id,name,note,ra,dec,fov,band,query,description,created_at";
export function cloudStore(_session: Session): Store {
  const table = async () => (await supabase()).from("saved_views");
  const check = <T,>({ data, error }: { data: T; error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    async list() {
      return check(await (await table()).select(COLS).order("created_at", { ascending: false })) as SavedView[];
    },
    async add(v) {
      return check(await (await table()).insert(v).select(COLS).single()) as SavedView;
    },
    async update(id, patch) {
      check(await (await table()).update(patch).eq("id", id));
    },
    async remove(id) {
      check(await (await table()).delete().eq("id", id));
    },
  };
}
