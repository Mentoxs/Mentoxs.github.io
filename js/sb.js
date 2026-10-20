// Supabase REST helper for the game pages (same project as the guestbook on index.html).
// The publishable key is meant to be public: row level security only allows reading and adding rows.
export const SB_URL = "https://xhejewlzexaivwjlbgku.supabase.co";
export const SB_KEY = "sb_publishable_i86b-GgydbEtlzV6lBuDXg_DC-9HQyi";

export async function sb(path, opts = {}) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: { apikey: SB_KEY, "Content-Type": "application/json", ...(opts.headers || {}) }
  });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 200));
  return r.status === 201 || r.status === 204 ? null : r.json();
}
