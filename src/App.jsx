import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import RootsVillas from "./RootsVillas.jsx";
import VillaPage from "./VillaPage.jsx";
import WelcomePage from "./WelcomePage.jsx";
import { BlogList, BlogPost } from "./BlogPage.jsx";
import ReservePage from "./ReservePage.jsx";
import TextPage from "./TextPage.jsx";
import AccountPage from "./AccountPage.jsx";
import { HUB_URL, EDIT_MODE } from "./HubEditor.jsx";

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
    if (EDIT_MODE) return;
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

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ClickTracker />
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
        <Route path="*" element={<RootsVillas />} />
      </Routes>
    </>
  );
}
