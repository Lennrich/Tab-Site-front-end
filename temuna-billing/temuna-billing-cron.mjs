--8ae5c0caed8eba812c229eeec16b0ad59bca686eb26e9bbac38bdef4f903
Content-Disposition: form-data; name="worker.js"

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var BASES = ["https://temunabilling.com/admin-83941790314f55ae7df7/api/", "https://temuna-billing-ckg.pages.dev/admin-83941790314f55ae7df7/api/"];
var TICK = "* * * * *";
async function run(env, path) {
  let last = "";
  for (const b of BASES) {
    const u = b + path;
    try {
      const r = await fetch(u, { method: "POST", headers: { "x-cron-key": env.CRON_KEY, "user-agent": "temuna-billing-cron" } });
      const t = await r.text();
      if (r.ok)
        return t;
      last = u + " -> HTTP " + r.status + " " + t.slice(0, 300);
    } catch (e) {
      last = u + " -> " + e;
    }
  }
  throw new Error(last);
}
__name(run, "run");
var worker_default = {
  async scheduled(ev, env, ctx) {
    const path = ev.cron === TICK ? "cron-tick" : "cron";
    ctx.waitUntil(run(env, path).then((r) => console.log(path, r), (e) => console.error(path, String(e))));
  },
  async fetch() {
    return new Response("not found", { status: 404 });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map

--8ae5c0caed8eba812c229eeec16b0ad59bca686eb26e9bbac38bdef4f903--
