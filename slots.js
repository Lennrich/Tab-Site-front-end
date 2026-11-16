// Shared slots / booking logic — used by worker.js and by server.js (local test).
// No dependencies, no secrets, no text sending.
// A booking is one slot per phone number per sale: booking again with the
// same phone moves the spot (the old slot is freed), as in the original site.

export function showGirls(config, env = {}) {
  // One flag, two ways to flip it:
  //  1. env SHOW_GIRLS=true  (Cloudflare dashboard — no redeploy needed)
  //  2. config.json SHOW_GIRLS (edit the file and redeploy)
  if (env.SHOW_GIRLS === "true" || env.SHOW_GIRLS === true) return true;
  if (env.SHOW_GIRLS === "false" || env.SHOW_GIRLS === false) return false;
  return config.SHOW_GIRLS === true;
}

export function visibleSales(config, env = {}) {
  const girls = showGirls(config, env);
  return (config.SALES || []).filter((s) => s.group !== "girls" || girls);
}

export function findSale(config, env, slug) {
  return visibleSales(config, env).find((s) => s.slug === slug) || null;
}

export function findSlot(sale, slotId) {
  if (!sale) return null;
  for (const day of sale.days || []) {
    for (const slot of day.slots || []) {
      if (slot.slot === slotId) return { day, slot };
    }
  }
  return null;
}

export function digits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

// Build the exact JSON shape slots.html expects: left / full per slot.
export function slotsResponse(config, env, group, bookings) {
  // bookings: array of {sale, slot} — however many are booked in that slot.
  const sales = visibleSales(config, env).filter(
    (s) => !group || s.group === group
  );
  return {
    sales: sales.map((s) => ({
      slug: s.slug,
      title: s.title,
      when: s.when,
      group: s.group,
      open: s.open,
      closed_reason: s.closed_reason || "",
      days: (s.days || []).map((d) => ({
        label: d.label,
        short: d.short,
        slots: (d.slots || []).map((x) => {
          const taken = bookings.filter(
            (b) => b.sale === s.slug && b.slot === x.slot
          ).length;
          const left = Math.max(0, x.capacity - taken);
          return { slot: x.slot, label: x.label, left, full: left <= 0 };
        }),
      })),
    })),
  };
}

// Book (or move) a slot. bookings is a mutable array; the caller persists it.
// Returns { ok, message?, sale?, moved?, from?, error?, refresh? }
export function book(config, env, bookings, payload) {
  const { sale: saleSlug, slot: slotId } = payload || {};
  // Honeypot field from slots.html ("website"): bots fill it, people don't.
  // Silently refuse — never book, never say why.
  if (payload && payload.website) return { ok: false, error: "Something went wrong. Please try again." };

  const first = String(payload?.first_name || "").trim();
  const last = String(payload?.last_name || "").trim();
  const phone = digits(payload?.phone);
  if (!first || !last) return { ok: false, error: "Please add your first and last name." };
  if (phone.length < 10) return { ok: false, error: "Please add a valid phone number." };

  const sale = findSale(config, env, saleSlug);
  if (!sale || !sale.open) return { ok: false, error: "This sale isn't open for booking right now.", refresh: true };
  const found = findSlot(sale, slotId);
  if (!found) return { ok: false, error: "That time is no longer available. Please pick another.", refresh: true };

  // Same phone + same sale = move, not a second booking.
  const existingIdx = bookings.findIndex((b) => b.sale === saleSlug && b.phone === phone);
  const existing = existingIdx >= 0 ? bookings[existingIdx] : null;
  if (existing && existing.slot === slotId) {
    return { ok: true, message: "You're booked!", sale: sale.title, moved: false };
  }
  const taken = bookings.filter((b) => b.sale === saleSlug && b.slot === slotId).length;
  if (taken >= found.slot.capacity) {
    return { ok: false, error: "Sorry — that time just filled up. Please pick another.", refresh: true };
  }
  const from = existing ? slotLabel(sale, existing.slot) : null;
  const record = { sale: saleSlug, slot: slotId, first_name: first, last_name: last, phone, created_at: new Date().toISOString() };
  if (existingIdx >= 0) bookings[existingIdx] = record;
  else bookings.push(record);
  return { ok: true, message: "You're booked!", sale: sale.title, moved: !!existing, from };
}

function slotLabel(sale, slotId) {
  const f = findSlot(sale, slotId);
  return f ? `${f.slot.label} · ${f.day.short}` : slotId;
}
