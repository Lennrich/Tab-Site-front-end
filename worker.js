// Monsey Clothing Sales — Cloudflare Worker.
// Serves the static site (public/) and the small slots API.
// Bookings live in D1 when bound (env.DB); otherwise in memory
// (fine for a preview — bookings are lost on restart, so use D1 live).
// No text sending here — that is out of scope.
import config from "./config.json";
import { showGirls, slotsResponse, book } from "./src/slots.js";

let memoryBookings = [];

async function loadBookings(env) {
  if (env.DB) {
    const r = await env.DB.prepare("SELECT sale, slot, phone FROM bookings").all();
    return (r.results || []).map((b) => ({ sale: b.sale, slot: b.slot, phone: b.phone }));
  }
  return memoryBookings;
}

async function saveBooking(env, bookings, payload, result) {
  if (!result.ok) return;
  // Upsert by sale + phone: delete the old spot, insert the new one.
  // (Re-booking the same slot just re-inserts the same row.)
  if (env.DB) {
    await env.DB.prepare("DELETE FROM bookings WHERE sale = ? AND phone = ?")
      .bind(payload.sale, payload.phone.replace(/\D/g, "")).run();
    await env.DB.prepare(
      "INSERT INTO bookings (sale, slot, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)"
    ).bind(payload.sale, payload.slot, String(payload.first_name || "").trim(),
      String(payload.last_name || "").trim(), payload.phone.replace(/\D/g, "")).run();
  }
  // memoryBookings was already mutated by book() — nothing more to do.
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config") {
      return Response.json({ show_girls: showGirls(config, env) });
    }

    if (url.pathname === "/api/slots") {
      const bookings = await loadBookings(env);
      const group = url.searchParams.get("group") || "";
      return Response.json(slotsResponse(config, env, group, bookings));
    }

    if (url.pathname === "/api/book" && request.method === "POST") {
      let payload = {};
      try { payload = await request.json(); } catch { payload = {}; }
      const bookings = await loadBookings(env);
      const result = book(config, env, bookings, payload);
      if (result.ok) await saveBooking(env, bookings, payload, result);
      return Response.json(result);
    }

    // Everything else: the static site (public/ via the assets binding).
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Static assets not bound (ASSETS).", { status: 500 });
  },
};
