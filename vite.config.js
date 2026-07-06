import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Plugin de dev: servește /api/availability local (în `npm run dev`),
 * folosind exact aceeași funcție ca pe Vercel (api/availability.js).
 * Astfel calendarul merge și local, fără `vercel dev`.
 * Cheia se citește din .env (SMOOBU_API_KEY).
 */
function smoobuApiDev(env) {
  return {
    name: "smoobu-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/availability", async (req, res) => {
        try {
          if (env.SMOOBU_API_KEY) process.env.SMOOBU_API_KEY = env.SMOOBU_API_KEY;
          const mod = await server.ssrLoadModule("/api/availability.js");
          const handler = mod.default;
          const parsed = new URL(req.url, "http://localhost");
          const query = Object.fromEntries(parsed.searchParams.entries());
          const resShim = {
            statusCode: 200,
            setHeader: (k, v) => res.setHeader(k, v),
            status(code) {
              this.statusCode = code;
              return this;
            },
            json(obj) {
              res.statusCode = this.statusCode;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(obj));
            },
          };
          await handler({ query, method: req.method }, resShim);
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
