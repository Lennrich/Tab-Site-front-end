(function () {
  "use strict";
  var form = document.getElementById("form"), input = document.getElementById("num"), go = document.getElementById("go");
  var err = document.getElementById("err"), find = document.getElementById("find"), out = document.getElementById("result");
  var choose = document.getElementById("choose"), back = document.getElementById("back");
  var findme = document.getElementById("findme");
  function showFind() { choose.hidden = true; findme.hidden = true; find.hidden = false; back.hidden = false; }
  function showChoose() { out.hidden = true; out.innerHTML = ""; find.hidden = true; findme.hidden = true; back.hidden = true; err.hidden = true; choose.hidden = false; if (history.replaceState) history.replaceState(null, "", "/"); }
  document.getElementById("pay").addEventListener("click", function () { showFind(); input.focus(); });
  back.addEventListener("click", showChoose);
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function money(c) { return "$" + (c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function date(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? MONTHS[+m[2] - 1] + " " + (+m[3]) + ", " + m[1] : (s || ""); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function normalize(v) {
    var s = String(v || "").toUpperCase().replace(/[\s#]/g, "").replace(/[\u2013\u2014_]/g, "-");
    var m = /^([A-Z]{1,4})-?(\d{1,8})$/.exec(s); return m ? m[1] + "-" + m[2] : null;
  }
  function showErr(msg) { err.textContent = msg; err.hidden = false; }
  function reset() {
    out.hidden = true; out.innerHTML = ""; showFind(); err.hidden = true; input.value = "";
    if (history.replaceState) history.replaceState(null, "", "/");
    input.focus();
  }
  function render(d) {
    var inv = d.invoice, cur = inv.number;
    var h = '<div class="card"><p class="sub">Invoice ' + esc(inv.number) + (d.customer ? " · " + esc(d.customer) : "") + '</p>' +
      '<div class="amount">' + money(inv.due_cents != null ? inv.due_cents : inv.amount_cents) + '</div>' +
      '<span class="badge ' + (inv.status === "paid" ? "paid" : "open") + '">' + (inv.status === "paid" ? "Paid" : inv.partial ? "Partially paid" : "Unpaid") + '</span>' +
      (inv.partial ? '<p class="paidline partial">' + esc(inv.partial) + '</p>' : "") +
      (inv.status === "paid" && inv.paid_line ? '<p class="paidline">' + esc(inv.paid_line) + '</p>' : "") +
      '<div style="margin-top:12px">' +
      '<div class="row"><span class="k">Invoice #</span><span class="v">' + esc(inv.number) + '</span></div>' +
      '<div class="row"><span class="k">Date</span><span class="v">' + esc(date(inv.date)) + '</span></div>' +
      (d.provider ? '<div class="row"><span class="k">From</span><span class="v">' + esc(d.provider) + (d.provider_address ? '<span class="from-addr">' + esc(d.provider_address) + '</span>' : '') + '</span></div>' : "") +
      '<div class="row"><span class="k">Description</span><span class="v">' + esc(inv.description || "") + '</span></div>' +
      // partial payment / account credit (Nov 4 2026): "Credit applied $50.00", "Balance due $250.00"
      (inv.lines && inv.lines.length ? inv.lines.map(function (l) { return '<div class="row"><span class="k">' + esc(l.label) + '</span><span class="v">' + money(l.cents) + '</span></div>'; }).join("") +
        '<div class="row"><span class="k"><strong>Balance due</strong></span><span class="v"><strong>' + money(inv.due_cents) + '</strong></span></div>' : "") +
      (inv.status === "paid" && inv.paid_at ? '<div class="row"><span class="k">Paid on</span><span class="v">' + esc(date(inv.paid_at)) + '</span></div>' : "") +
      (inv.status === "paid" && inv.paid_ref ? '<div class="row"><span class="k">Payment</span><span class="v txn">' + esc(inv.paid_ref) + '</span></div>' : "") +
      '</div></div>';
    if (d.open && d.open.length) {
      h += '<div class="card"><h2>' + (d.open.length === 1 ? "Open invoice" : "All open invoices (" + d.open.length + ")") + '</h2><ul class="list">';
      d.open.forEach(function (o) {
        h += '<li class="' + (o.number === cur ? "cur" : "") + '"><div><div class="n">' + esc(o.number) + '</div><div class="d">' + esc(date(o.date)) + (o.description ? " · " + esc(o.description) : "") + (o.partial ? '<div class="d partial">' + esc(o.partial) + '</div>' : "") + '</div></div><div class="a">' + money(o.amount_cents) + '</div></li>';
      });
      h += '</ul><div class="total"><span>Total due</span><span>' + money(d.total_due_cents) + '</span></div></div>';
      var memo = d.open.map(function (o) { return '<span class="memo">' + esc(o.number) + '</span>'; }).join(" ");
      var hasZelle = !!(d.zelle && d.zelle.recipient);
      h += '<div class="card pay"><h2>How to pay</h2>';
      if (hasZelle) {   // the provider's own Zelle; no recipient on file = no Zelle block
        h += '<div class="zelle"><p><strong>Pay by Zelle</strong></p>' +
             '<p>Send <strong>' + money(d.total_due_cents) + '</strong> by Zelle to <strong>' + esc(d.zelle.recipient) + '</strong>.</p>' +
             '<p class="memo-red">Invoice # ' + memo + ' MUST be included in the memo!!</p></div>';   // the owner Nov 2 5:22 PM: Zelle first, red memo below; no "(name)" after the address
      }
      if (d.card_enabled && d.card) {   // Stripe Checkout on the provider's own Stripe account
        var pct = d.card.card_fee_pct, feeTxt = d.card.card_fee_cents ? " (" + esc(String(pct)) + "% fee)" : "";
        h += '<div class="cardpay"><p><strong>' + (hasZelle ? "Or pay" : "Pay") + ' with a credit card' + feeTxt + '</strong></p>';
        if (d.card.card_fee_cents) {   // NY surcharge disclosure: the fee as its own line and the new total, before they pay
          h += '<div class="feebox">' +
            '<div class="row"><span class="k">Invoice total</span><span class="v">' + money(d.card.subtotal_cents) + '</span></div>' +
            '<div class="row"><span class="k">Card fee (' + esc(String(pct)) + '%)</span><span class="v">' + money(d.card.card_fee_cents) + '</span></div>' +
            '<div class="row tot"><span class="k">Total by card</span><span class="v">' + money(d.card.total_cents) + '</span></div></div>';
        }
        h += '<button class="btn" type="button" id="card_go">Pay ' + money(d.card.total_cents) + ' by card</button>' +
          (d.card.card_fee_cents ? '<p class="soon">The ' + esc(String(pct)) + '% card fee is added only when you pay by card. No fee when paying by Zelle.</p>' : '<p class="soon">Secure card payment by Stripe.</p>') +
          '<p id="card_err" class="err" role="alert" hidden></p></div></div>';
      } else {
        h += '<button class="btn disabled" type="button" disabled aria-disabled="true">Pay by card</button><p class="soon">Card payment isn\'t available for this invoice yet.</p></div>';
      }
    } else {
      h += '<div class="card"><h2>Nothing due</h2><p class="sub">You have no open invoices. Thank you!</p></div>';
    }
    if (inv.status === "open" && d.zelle && d.zelle.recipient) {
      h += '<div class="card zn" id="zn"><h2>Already paid by Zelle?</h2><p class="sub">Tell us who it came from so we can match it.</p>' +
        '<button class="btn ghost" type="button" id="zn_open">I paid by Zelle</button>' +
        '<form id="zn_form" novalidate hidden>' +
        '<label for="zn_from" class="gap">Name or company the Zelle came from</label><input id="zn_from" class="plain" maxlength="80" autocomplete="off" placeholder="e.g. Birthday Cake LLC">' +
        '<label for="zn_date" class="gap">Date sent</label><input id="zn_date" class="plain" type="date">' +
        '<label for="zn_amt" class="gap">Amount ($)</label><input id="zn_amt" class="plain" inputmode="decimal" maxlength="12" value="' + ((inv.due_cents != null ? inv.due_cents : inv.amount_cents) / 100).toFixed(2) + '">' +
        '<button class="btn" type="submit" id="zn_go">Let us know</button><p id="zn_err" class="err" role="alert" hidden></p></form></div>';
    }
    if (cardNote === "cancelled" && inv.status === "open") h = '<div class="card"><p class="sub">Card payment was cancelled. Nothing was charged.</p></div>' + h;
    if (cardNote === "done") h = (inv.status === "paid" ? '<div class="card"><h2>Thank you!</h2><p class="ok">Your card payment went through. A receipt from Stripe is on its way to your email.</p></div>'
      : '<div class="card"><h2>Thank you!</h2><p class="sub">Your card payment is being confirmed. This page will show Paid in a moment.</p></div>') + h;
    h += '<button class="link" type="button" id="again">Look up another invoice</button>';
    out.innerHTML = h; out.hidden = false; find.hidden = true; findme.hidden = true; choose.hidden = true; back.hidden = true;
    wireNotice(inv); wireCard(inv); cardNote = null;
    document.getElementById("again").addEventListener("click", reset);
    window.scrollTo(0, 0);
  }
  function lookup(raw) {
    err.hidden = true;
    var n = normalize(raw);
    if (!n) { showErr("We couldn't find that invoice. Check the number on your text or email."); return; }
    go.disabled = true; go.textContent = "Looking it up…";
    fetch("/api/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number: n }), cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (d) {
        if (d && d.ok) { render(d); if (history.replaceState) history.replaceState(null, "", "/?invoice=" + encodeURIComponent(d.invoice.number)); }
        else showErr((d && d.message) || "Something went wrong. Please try again.");
      })
      .catch(function () { showErr("Couldn't connect. Please check your internet and try again."); })
      .then(function () { go.disabled = false; go.textContent = "Look up invoice"; });
  }
  var params = new URLSearchParams(location.search), cardNote = params.get("card"), cardSession = params.get("session_id"), confirmTries = 0;
  function wireCard(inv) {
    var b = document.getElementById("card_go"); if (!b) return;
    var e = document.getElementById("card_err");
    b.addEventListener("click", function () {
      e.hidden = true; b.disabled = true; b.textContent = "Opening secure checkout…";
      fetch("/api/pay/card", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number: inv.number }), cache: "no-store" })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (d && d.ok && d.url) { location.href = d.url; return; }
          e.textContent = (d && d.message) || "Card payment couldn't start. Please try again."; e.hidden = false; b.disabled = false; b.textContent = "Pay by card";
        })
        .catch(function () { e.textContent = "Couldn't connect. Please try again."; e.hidden = false; b.disabled = false; b.textContent = "Pay by card"; });
    });
  }
  // Back from Stripe Checkout: confirm the session (marks paid right away if the webhook hasn't yet), then show the invoice.
  function afterCard(n) {
    fetch("/api/pay/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number: n, session_id: cardSession }), cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }); }, function () { return {}; })
      .then(function (d) {
        if (d && d.ok && !d.paid && ++confirmTries < 4) { setTimeout(function () { afterCard(n); }, 2500); return; }
        lookup(n);
      });
  }
  function todayLocal() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function wireNotice(inv) {
    var open = document.getElementById("zn_open"); if (!open) return;
    var f = document.getElementById("zn_form"), e = document.getElementById("zn_err"), b = document.getElementById("zn_go");
    open.addEventListener("click", function () { open.hidden = true; f.hidden = false; document.getElementById("zn_date").value = todayLocal(); document.getElementById("zn_from").focus(); });
    f.addEventListener("submit", function (ev) {
      ev.preventDefault(); e.hidden = true;
      var from = document.getElementById("zn_from").value.trim(), dt = document.getElementById("zn_date").value, amt = document.getElementById("zn_amt").value.replace(/[$,\s]/g, "");
      if (from.length < 2) { e.textContent = "Please enter the name or company the Zelle came from."; e.hidden = false; return; }
      if (!dt) { e.textContent = "Please enter the date you sent it."; e.hidden = false; return; }
      b.disabled = true; b.textContent = "Sending…";
      fetch("/api/zelle-notice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number: inv.number, sender: from, date: dt, amount: amt }), cache: "no-store" })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (d && d.ok) { document.getElementById("zn").innerHTML = '<h2>Thank you</h2><p class="ok">' + esc(d.message) + '</p>'; return; }
          e.textContent = (d && d.message) || "Something went wrong. Please try again."; e.hidden = false; b.disabled = false; b.textContent = "Let us know";
        })
        .catch(function () { e.textContent = "Couldn't connect. Please try again."; e.hidden = false; b.disabled = false; b.textContent = "Let us know"; });
    });
  }
  // Find my invoice: last name + phone/email on file -> only that customer's open invoices (no provider list anywhere)
  var fform = document.getElementById("fform"), fres = document.getElementById("fres"), ferr = document.getElementById("ferr"), fgo = document.getElementById("fgo");
  document.getElementById("nonum").addEventListener("click", function () { find.hidden = true; findme.hidden = false; back.hidden = false; fres.innerHTML = ""; document.getElementById("f_last").focus(); });
  document.getElementById("hasnum").addEventListener("click", function () { showFind(); input.focus(); });
  fform.addEventListener("submit", function (ev) {
    ev.preventDefault(); ferr.hidden = true; fres.innerHTML = "";
    var last = document.getElementById("f_last").value.trim(), contact = document.getElementById("f_contact").value.trim();
    if (!last || !contact) { ferr.textContent = "Enter your last name and your phone number or email."; ferr.hidden = false; return; }
    fgo.disabled = true; fgo.textContent = "Searching…";
    fetch("/api/find", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ last_name: last, contact: contact }), cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (d) {
        if (!d || !d.ok) { ferr.textContent = (d && d.message) || "Something went wrong. Please try again."; ferr.hidden = false; return; }
        if (!d.invoices || !d.invoices.length) { fres.innerHTML = '<p class="none">' + esc(d.message || "No open invoices found for those details.") + '</p>'; return; }
        fres.innerHTML = '<ul class="found">' + d.invoices.map(function (o) {
          return '<li><div class="fh"><span>' + esc(o.number) + '</span><span>' + money(o.amount_cents) + '</span></div><div class="fd">' + esc(date(o.date)) + ' · ' + esc(o.provider) + (o.description ? ' · ' + esc(o.description) : "") + '</div>' +
            '<button class="btn" type="button" data-n="' + esc(o.number) + '">View and pay</button></li>';
        }).join("") + '</ul>';
      })
      .catch(function () { ferr.textContent = "Couldn't connect. Please check your internet and try again."; ferr.hidden = false; })
      .then(function () { fgo.disabled = false; fgo.textContent = "Find my invoices"; });
  });
  fres.addEventListener("click", function (ev) { var b = ev.target.closest("[data-n]"); if (!b) return; var n = b.getAttribute("data-n"); showFind(); input.value = n; lookup(n); });
  form.addEventListener("submit", function (e) { e.preventDefault(); lookup(input.value); });
  var q = params.get("invoice");
  if (q && cardNote === "done" && cardSession) { showFind(); input.value = q; afterCard(q); }
  else if (q) { showFind(); input.value = q; lookup(q); }
})();
