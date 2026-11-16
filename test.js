// Test the slots/book flow over real HTTP against server.js.
// Run:  node test.js
// Exits 0 if every check passes, 1 otherwise. No dependencies.
import { createServer } from "./server.js";

let passed = 0, failed = 0;
function check(name, ok, extra = "") {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
}

const server = createServer();
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const get = (p) => fetch(base + p).then((r) => r.json());
const post = (p, body) => fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

console.log("Config flag:");
const cfg = await get("/api/config");
check("SHOW_GIRLS is false by default", cfg.show_girls === false, JSON.stringify(cfg));

console.log("Slots API:");
const boys = await get("/api/slots?group=boys");
check("boys returns 1 sale", boys.sales.length === 1, JSON.stringify(boys.sales.map((s) => s.slug)));
check("boys sale is the sample sale", boys.sales[0]?.slug === "boys-sale-sample");
check("boys day 1 has 4 slots", boys.sales[0]?.days[0]?.slots.length === 4);
check("9 AM starts with 10 spots left", boys.sales[0]?.days[0]?.slots[0]?.left === 10);
check("11 AM (capacity 3) is low but not full", boys.sales[0]?.days[0]?.slots[2]?.left === 3 && !boys.sales[0]?.days[0]?.slots[2]?.full);
const girls = await get("/api/slots?group=girls");
check("girls returns NO sales while hidden", girls.sales.length === 0, JSON.stringify(girls));
const all = await get("/api/slots");
check("unfiltered /api/slots also hides girls", all.sales.length === 1 && all.sales[0].group === "boys");

console.log("Homepage:");
const home = await fetch(base + "/").then((r) => r.text());
check("homepage mentions Boys", home.includes("Register for Boys"));
check("homepage HTML contains the girls block (hidden by default, JS-gated)", home.includes('id="girls-side" hidden'));
check("homepage does not link to the live Tab site", !home.includes("tab.bot"));

console.log("Booking:");
const b1 = await post("/api/book", { sale: "boys-sale-sample", slot: "sample-day1-0900", first_name: "Test", last_name: "Parent", phone: "(845) 555-0100", website: "" });
check("first booking succeeds", b1.ok === true && b1.moved === false, JSON.stringify(b1));
const after1 = await get("/api/slots?group=boys");
check("9 AM drops to 9 left after 1 booking", after1.sales[0].days[0].slots[0].left === 9);
const b2 = await post("/api/book", { sale: "boys-sale-sample", slot: "sample-day1-1000", first_name: "Test", last_name: "Parent", phone: "8455550100", website: "" });
check("same phone re-booking MOVES the spot", b2.ok === true && b2.moved === true, JSON.stringify(b2));
const after2 = await get("/api/slots?group=boys");
check("9 AM is back to 10 left after the move", after2.sales[0].days[0].slots[0].left === 10);
check("10 AM is down to 9 left after the move", after2.sales[0].days[0].slots[1].left === 9);

console.log("Rejections:");
const badPhone = await post("/api/book", { sale: "boys-sale-sample", slot: "sample-day1-0900", first_name: "Test", last_name: "Parent", phone: "123", website: "" });
check("short phone is rejected", badPhone.ok === false);
const bot = await post("/api/book", { sale: "boys-sale-sample", slot: "sample-day1-0900", first_name: "Bot", last_name: "Bot", phone: "(845) 555-0199", website: "http://spam.example" });
check("honeypot-filled booking is refused", bot.ok === false);
const girlsBook = await post("/api/book", { sale: "girls-sale-sample", slot: "girls-sample-day1-0900", first_name: "Test", last_name: "Parent", phone: "(845) 555-0101", website: "" });
check("booking a hidden girls sale is rejected", girlsBook.ok === false, JSON.stringify(girlsBook));

console.log("Full slot:");
const oneSeat = "sample-day1-1200"; // capacity 1
const f1 = await post("/api/book", { sale: "boys-sale-sample", slot: oneSeat, first_name: "First", last_name: "Person", phone: "(845) 555-0200", website: "" });
check("1-seat slot books once", f1.ok === true);
const f2 = await post("/api/book", { sale: "boys-sale-sample", slot: oneSeat, first_name: "Second", last_name: "Person", phone: "(845) 555-0201", website: "" });
check("1-seat slot rejects a second person", f2.ok === false, JSON.stringify(f2));
const afterFull = await get("/api/slots?group=boys");
check("1-seat slot now shows full / 0 left", afterFull.sales[0].days[0].slots[3].full === true && afterFull.sales[0].days[0].slots[3].left === 0);

server.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
