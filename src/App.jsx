import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import RootsVillas from "./RootsVillas.jsx";
import VillaPage from "./VillaPage.jsx";

/* Scroll sus la fiecare schimbare de rută */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootsVillas />} />
        <Route path="/vila-redwood" element={<VillaPage villaId="redwood" />} />
        <Route path="/vila-sequoia" element={<VillaPage villaId="sequoia" />} />
        <Route path="*" element={<RootsVillas />} />
      </Routes>
    </>
  );
}
