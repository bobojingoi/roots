import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Plugin de dev: servește orice /api/<name> local (în `npm run dev`),
 * folosind exact aceleași funcții ca pe Vercel (api/<name>.js).
 * Astfel calendarul + rezervarea merg și local, fără `vercel dev`.
 * Credențialele se citesc din .env (SMOOBU_API_KEY, SMOOBU_API_SECRET, BOOKING_LIVE).
 */
function smoobuApiDev(env) {
  return {
    name: "smoobu-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        try {
          for (const k of ["SMOOBU_API_KEY", "SMOOBU_API_SECRET", "BOOKING_LIVE"]) {
            if (env[k]) process.env[k] = env[k];
          }
          const parsed = new URL(req.url, "http://localhost");
          const name = parsed.pathname.replace(/^\/api\//, "").split("/")[0];
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          const handler = mod.default;
          if (!handler) return next();

          const query = Object.fromEntries(parsed.searchParams.entries());
          let body;
          if (req.method === "POST" || req.method === "PUT") {
            body = await new Promise((resolve) => {
              let data = "";
              req.on("data", (c) => (data += c));
              req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
            });
          }

          const resShim = {
            statusCode: 200,
            setHeader: (k, v) => res.setHeader(k, v),
            status(code) { this.statusCode = code; return this; },
            json(obj) {
              res.statusCode = this.statusCode;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(obj));
            },
          };
          await handler({ query, method: req.method, body }, resShim);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: String((e && e.message) || e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), smoobuApiDev(env)],
  };
});
