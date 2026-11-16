// Local dev / test server — plain Node, no dependencies.
// Serves public/ and the same /api/* as worker.js, with in-memory bookings.
// Run:  node server.js [port]     (default 8787)
// Then open http://localhost:8787/  — girls are hidden by default.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { showGirls, slotsResponse, book } from "./src/slots.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const bookings = [];
const env = { SHOW_GIRLS: process.env.SHOW_GIRLS };

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/config") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ show_girls: showGirls(config, env) }));
    }
    if (url.pathname === "/api/slots") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(slotsResponse(config, env, url.searchParams.get("group") || "", bookings)));
    }
    if (url.pathname === "/api/book" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch { payload = {}; }
        const result = book(config, env, bookings, payload);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
      });
      return;
    }
    // Static files from public/
    const file = path.join(__dirname, "public", url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
    if (!file.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end("Forbidden"); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || 8787);
  createServer().listen(port, () => console.log(`Monsey Clothing Sales (local) at http://localhost:${port}/ — girls ${showGirls(config, env) ? "SHOWN" : "hidden"}`));
}
