import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   Widget de rezervare — calendar cu selecție de interval,
   preț live din Smoobu (/api/availability întoarce availability + prices),
   calcul avans, selecție oaspeți și trimiterea cererii.
   ============================================================ */

const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];
const DOW_RO = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fmt = (date) => iso(date.getFullYear(), date.getMonth(), date.getDate());
const parseISO = (s) => new Date(s + "T00:00:00");
const addDays = (s, n) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
};
/* nopțile dintr-un sejur: check-in inclusiv, check-out exclusiv */
const eachNight = (ci, co) => {
  const out = [];
  let d = ci;
  while (d < co) { out.push(d); d = addDays(d, 1); }
  return out;
};
const lei = (n) => new Intl.NumberFormat("ro-RO").format(Math.round(n));

function useAvailability(apartmentId, startDate, endDate) {
  const [data, setData] = useState({ availability: {}, prices: {} });
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    setStatus("loading");
    const url = `/api/availability?apartmentId=${encodeURIComponent(apartmentId || "")}&startDate=${startDate}&endDate=${endDate}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((json) => {
        if (cancelled) return;
        setData({ availability: json.availability || {}, prices: json.prices || {} });
        setStatus(json.mock ? "mock" : "ok");
      })
      .catch(() => {
        if (cancelled) return;
        setData({ availability: {}, prices: {} });
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [apartmentId, startDate, endDate]);
  return { ...data, status };
}

function Month({ year, month, availability, today, checkIn, checkOut, onPick }) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(<span className="cal-day empty" key={"e" + i} />);
  for (let d = 1; d <= days; d++) {
    const key = iso(year, month, d);
    const date = new Date(year, month, d);
    const isPast = date < today;
    const busy = availability[key] === 0;
    const isStart = key === checkIn;
    const isEnd = key === checkOut;
    const inRange = checkIn && checkOut && key > checkIn && key < checkOut;
    const cls = [
      "cal-day",
      isPast ? "past" : busy ? "busy" : "free",
      date.getTime() === today.getTime() ? "today" : "",
      isStart ? "sel-start" : "",
      isEnd ? "sel-end" : "",
      inRange ? "in-range" : "",
    ].filter(Boolean).join(" ");
    cells.push(
      <span className={cls} key={key} onClick={() => !isPast && onPick(key)} title={isPast ? "" : busy ? "Ocupat" : "Liber"}>
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

function Stepper({ label, value, set, min, max }) {
  return (
    <div className="bk-guest">
      <span>{label}</span>
      <div className="bk-step">
        <button type="button" onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Scade ${label}`}>−</button>
        <b>{value}</b>
        <button type="button" onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Crește ${label}`}>+</button>
      </div>
    </div>
  );
}

export default function AvailabilityCalendar({
  apartmentId,
  villaName = "vila",
  contact = {},
  capacity = 10,
  depositPct = 30,
  currency = "lei",
  title = "Verifică disponibilitatea și rezervă",
}) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const m2 = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  const startDate = iso(cursor.getFullYear(), cursor.getMonth(), 1);
  const lastDay = new Date(m2.getFullYear(), m2.getMonth() + 1, 0).getDate();
  const endDate = iso(m2.getFullYear(), m2.getMonth(), lastDay);
  const { availability, prices, status } = useAvailability(apartmentId, startDate, endDate);

  const atStart = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
  const shift = useCallback((n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1)), []);

  const nightsAllFree = useCallback(
    (ci, co) => eachNight(ci, co).every((n) => availability[n] !== 0),
    [availability]
  );

  const pick = useCallback((dateStr) => {
    const restart = !checkIn || (checkIn && checkOut) || dateStr <= checkIn;
    if (restart) {
      if (availability[dateStr] === 0) return; // nu porni pe o zi ocupată
      setCheckIn(dateStr); setCheckOut(null);
      return;
    }
    // alegem check-out (dateStr > checkIn)
    if (nightsAllFree(checkIn, dateStr)) setCheckOut(dateStr);
    else if (availability[dateStr] !== 0) { setCheckIn(dateStr); setCheckOut(null); }
  }, [checkIn, checkOut, availability, nightsAllFree]);

  const nights = checkIn && checkOut ? eachNight(checkIn, checkOut) : [];
  const priceKnown = nights.length > 0 && nights.every((n) => prices[n] != null);
  const total = nights.reduce((s, n) => s + (Number(prices[n]) || 0), 0);
  const deposit = Math.round(total * depositPct / 100);
  const rest = total - deposit;
  const hasRange = nights.length > 0;

  const wa = (contact.whatsapp || "").replace(/[^0-9]/g, "");
  const waMsg = encodeURIComponent(
    `Bună! Aș dori să rezerv ${villaName}.\n` +
    `Check-in: ${checkIn}\nCheck-out: ${checkOut}\nNopți: ${nights.length}\n` +
    `Oaspeți: ${adults} adulți${children ? ` + ${children} copii` : ""}\n` +
    (priceKnown ? `Total: ${lei(total)} ${currency}\nAvans (${depositPct}%): ${lei(deposit)} ${currency}` : "Preț: la cerere")
  );
  const waHref = `https://wa.me/${wa}?text=${waMsg}`;

  return (
    <div className="cal-card">
      <div className="cal-head">
        <h3>{title}</h3>
        <div className="cal-nav">
          <button onClick={() => shift(-1)} disabled={atStart} aria-label="Luna anterioară">‹</button>
          <button onClick={() => shift(1)} aria-label="Luna următoare">›</button>
        </div>
      </div>

      <div className="cal-hint">
        {!checkIn ? "Alege data de check-in." : !checkOut ? "Alege data de check-out." : `${nights.length} ${nights.length === 1 ? "noapte" : "nopți"} selectate.`}
        {(checkIn || checkOut) && (
          <button className="cal-clear" onClick={() => { setCheckIn(null); setCheckOut(null); }}>Golește selecția</button>
        )}
      </div>

      <div className="cal-months">
        <Month year={cursor.getFullYear()} month={cursor.getMonth()} availability={availability} today={today} checkIn={checkIn} checkOut={checkOut} onPick={pick} />
        <Month year={m2.getFullYear()} month={m2.getMonth()} availability={availability} today={today} checkIn={checkIn} checkOut={checkOut} onPick={pick} />
      </div>

      <div className="cal-foot">
        <div className="cal-legend">
          <span><i className="lg free" /> Liber</span>
          <span><i className="lg busy" /> Ocupat</span>
          <span><i className="lg sel" /> Selectat</span>
        </div>
        {status === "loading" && <span className="cal-note">Se încarcă…</span>}
        {status === "mock" && <span className="cal-note">Date demonstrative.</span>}
        {status === "error" && <span className="cal-note err">Momentan nu putem afișa disponibilitatea.</span>}
      </div>

      {/* --- panou rezervare --- */}
      <div className="bk-panel">
        <div className="bk-guests">
          <Stepper label="Adulți" value={adults} set={setAdults} min={1} max={capacity} />
          <Stepper label="Copii" value={children} set={setChildren} min={0} max={Math.max(0, capacity - adults)} />
          <div className="bk-cap">Maxim {capacity} persoane</div>
        </div>

        {hasRange && (
          <div className="bk-summary">
            <div className="bk-row"><span>{checkIn} → {checkOut}</span><span>{nights.length} {nights.length === 1 ? "noapte" : "nopți"}</span></div>
            {priceKnown ? (
              <>
                <div className="bk-row"><span>Total sejur</span><b>{lei(total)} {currency}</b></div>
                <div className="bk-row hi"><span>Avans acum ({depositPct}%)</span><b>{lei(deposit)} {currency}</b></div>
                <div className="bk-row muted"><span>Rest la check-in</span><span>{lei(rest)} {currency}</span></div>
              </>
            ) : (
              <div className="bk-row muted"><span>Preț</span><span>la cerere</span></div>
            )}
          </div>
        )}

        <a className={`bk-cta ${hasRange ? "" : "disabled"}`} href={hasRange ? waHref : undefined} target="_blank" rel="noreferrer" aria-disabled={!hasRange}>
          {hasRange ? "Trimite cererea de rezervare" : "Alege perioada pentru a rezerva"}
        </a>
        <p className="bk-soon">Plata online a avansului se activează în curând. Momentan confirmăm rezervarea pe WhatsApp, rapid.</p>
      </div>
    </div>
  );
}
