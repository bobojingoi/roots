/* Captarea leadurilor (Faza 2) — „anunță-mă când se eliberează" + newsletter.
   Trimite la hub cu atribuirea first-party atașată; hub-ul face double opt-in. */
import { HUB_URL } from "./HubEditor.jsx";
import { getAttribution } from "./attribution.js";
import { LANG } from "./i18n.js";

export async function submitLead(data) {
  try {
    const r = await fetch(HUB_URL + "/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, lang: LANG, attribution: getAttribution() }),
    });
    return await r.json().catch(() => ({ ok: false }));
  } catch {
    return { ok: false, error: "network" };
  }
}
