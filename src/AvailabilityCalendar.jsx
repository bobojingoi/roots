import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   Calendar de disponibilitate — alimentat din API-ul Smoobu
   prin proxy-ul serverless /api/availability (cheia stă pe server).
   ============================================================ */

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];
const DOW_RO = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/* fetch disponibilitate pentru fereastra vizibilă */
function useAvailability(apartmentId, startDate, endDate) {
  const [data, setData] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | ok | mock | error

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    setStatus("loading");
    const url = `/api/availability?apartmentId=${encodeURIComponent(apartmentId || "")}&startDate=${startDate}&endDate=${endDate}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((json) => {
        if (cancelled) return;
        setData(json.availability || {});
        setStatus(json.mock ? "mock" : "ok");
      })
      .catch(() => {
        if (cancelled) return;
        setData({});
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [apartmentId, startDate, endDate]);

  return { data, status };
}

function Month({ year, month, availability, today }) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Luni = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(<span className="cal-day empty" key={"e" + i} />);
  for (let d = 1; d <= days; d++) {
    const key = iso(year, month, d);
    const date = new Date(year, month, d);
    const isPast = date < today;
    const busy = availability[key] === 0;
    const cls = [
      "cal-day",
      isPast ? "past" : busy ? "busy" : "free",
      date.getTime() === today.getTime() ? "today" : "",
    ].filter(Boolean).join(" ");
    cells.push(
      <span className={cls} key={key} title={isPast ? "" : busy ? "Ocupat" : "Liber"}>
        {d}
      </span>
    );
  }
  return (
    <div className="cal-month">
      <div className="cal-mhead">
        <span className="cal-myear">{year}</span>
        <b className="cal-mname">{MONTHS_RO[month]}</b>
      </div>
      <div className="cal-dow">{DOW_RO.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">{cells}</div>
    </div>
  );
}

export default function AvailabilityCalendar({ apartmentId, title = "Vezi disponibilitatea" }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const m2 = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  const startDate = iso(cursor.getFullYear(), cursor.getMonth(), 1);
  const lastDay = new Date(m2.getFullYear(), m2.getMonth() + 1, 0).getDate();
  const endDate = iso(m2.getFullYear(), m2.getMonth(), lastDay);

  const { data, status } = useAvailability(apartmentId, startDate, endDate);

  const atStart =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
  const shift = useCallback(
    (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1)),
    []
  );

  return (
    <div className="cal-card">
      <div className="cal-head">
        <h3>{title}</h3>
        <div className="cal-nav">
          <button onClick={() => shift(-1)} disabled={atStart} aria-label="Luna anterioară">‹</button>
          <button onClick={() => shift(1)} aria-label="Luna următoare">›</button>
        </div>
      </div>
      <div className="cal-months">
        <Month year={cursor.getFullYear()} month={cursor.getMonth()} availability={data} today={today} />
        <Month year={m2.getFullYear()} month={m2.getMonth()} availability={data} today={today} />
      </div>
      <div className="cal-foot">
        <div className="cal-legend">
          <span><i className="lg free" /> Liber</span>
          <span><i className="lg busy" /> Ocupat</span>
        </div>
        {status === "loading" && <span className="cal-note">Se încarcă disponibilitatea…</span>}
        {status === "mock" && (
          <span className="cal-note">Date demonstrative — conectează cheia Smoobu pentru disponibilitatea reală.</span>
        )}
        {status === "error" && (
          <span className="cal-note err">Momentan nu putem afișa disponibilitatea. Scrie-ne pe WhatsApp.</span>
        )}
      </div>
    </div>
  );
}
