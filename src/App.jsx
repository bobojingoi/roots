import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import RootsVillas, { loadHubRaw } from "./RootsVillas.jsx";
import VillaPage from "./VillaPage.jsx";
import WelcomePage from "./WelcomePage.jsx";
import { BlogList, BlogPost } from "./BlogPage.jsx";
import ReservePage from "./ReservePage.jsx";
import TextPage from "./TextPage.jsx";
import AccountPage from "./AccountPage.jsx";
import SmartPage from "./SmartPage.jsx";
import CookieBar from "./CookieBar.jsx";
import { initTracking, trackPageView } from "./tracking.js";
import { captureAttribution, recordStep } from "./attribution.js";
import { HUB_URL, EDIT_MODE, HM_MODE } from "./HubEditor.jsx";
import { initHmMode } from "./hmMode.js";

// în iframe-ul Heatmap (?hm=1): unitățile vh devin px + raportăm înălțimea
initHmMode();

/* Scroll sus la fiecare schimbare de rută */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* Heatmap: click-uri anonime (pagină + poziție), fără date personale. */
function ClickTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (EDIT_MODE || HM_MODE) return; // în iframe-ul Heatmap nu ne auto-numărăm click-urile
    let last = 0;
    const onClick = (e) => {
      const now = Date.now();
      if (now - last < 400) return; // max ~2 evenimente/secundă
      last = now;
      const body = JSON.stringify({
        path: pathname,
        device: window.innerWidth < 760 ? "mobile" : "desktop",
        x: e.clientX / window.innerWidth,
        y: Math.round(e.pageY),
        dh: document.documentElement.scrollHeight,
      });
      fetch(HUB_URL + "/api/v1/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);
  return null;
}

/* Roots Leads: sursa vizitei (UTM/fbclid/referrer) + parcursul paginilor,
   first-party în localStorage — se atașează doar cererii de rezervare.
   Detalii și considerente GDPR în src/attribution.js. */
function JourneyTracker() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (EDIT_MODE || HM_MODE) return;
    if (first.current) { first.current = false; captureAttribution(); return; } // aterizarea o notează captura
    recordStep(pathname);
  }, [pathname]);
  return null;
}

/* Marketing: GA4 + Meta Pixel + TikTok Pixel — ID-urile din Hub (secțiunea
   `tracking`), încărcate doar după consimțământ. Page view la fiecare rută. */
function MarketingTracking() {
  const { pathname } = useLocation();
  const [cfg, setCfg] = useState(null);
  const first = useRef(true);
  useEffect(() => {
    if (EDIT_MODE || HM_MODE) return; // în editor / iframe-ul Heatmap nu urmărim nimic
    loadHubRaw()
      .then((raw) => {
        const c = (raw && raw.tracking) || null;
        setCfg(c);
        initTracking(c); // pornește imediat dacă acordul e deja salvat
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; } // prima afișare o trimite init-ul
    trackPageView(pathname);
  }, [pathname]);
  // pe pagina magic-link (/smart) nu urmărim nimic — nici bannerul nu are sens acolo
  if (EDIT_MODE || HM_MODE || !cfg || pathname.startsWith("/smart")) return null;
  return <CookieBar cfg={cfg} />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ClickTracker />
      <JourneyTracker />
      <MarketingTracking />
      <Routes>
        <Route path="/" element={<RootsVillas />} />
        <Route path="/vila-redwood" element={<VillaPage villaId="redwood" />} />
        <Route path="/vila-sequoia" element={<VillaPage villaId="sequoia" />} />
        <Route path="/welcome-redwood" element={<WelcomePage villaId="redwood" />} />
        <Route path="/welcome-sequoia" element={<WelcomePage villaId="sequoia" />} />
        <Route path="/rezervare" element={<ReservePage />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/despre-noi" element={<TextPage sectionKey="about_page" />} />
        <Route path="/politica-de-confidentialitate" element={<TextPage sectionKey="legal_privacy" />} />
        <Route path="/politica-cookies" element={<TextPage sectionKey="legal_cookies" />} />
        <Route path="/termeni-si-conditii" element={<TextPage sectionKey="legal_terms" />} />
        <Route path="/cont" element={<AccountPage />} />
        <Route path="/smart" element={<SmartPage />} />
        <Route path="*" element={<RootsVillas />} />
      </Routes>
    </>
  );
}
