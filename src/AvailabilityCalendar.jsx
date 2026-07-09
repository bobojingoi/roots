import React, { useState, useEffect, useMemo, useCallback } from "react";
import { t } from "./i18n.js";
import { track } from "./tracking.js";

/* ============================================================
   Widget de rezervare — calendar cu selecție de interval,
   preț live din Smoobu, avans, formular oaspete și creare
   rezervare reală prin /api/book (când BOOKING_LIVE=true).
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
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return fmt(d); };
const eachNight = (ci, co) => { const out = []; let d = ci; while (d < co) { out.push(d); d = addDays(d, 1); } return out; };
const lei = (n) => new Intl.NumberFormat("ro-RO").format(Math.round(n));

/* aptKey = unul sau mai multe ID-uri Smoobu, separate prin virgulă (string stabil —
   evită refetch-ul pe referințe noi de array). Pentru mai multe apartamente,
   calendarele se SUPRAPUN: o zi e liberă doar dacă e liberă la toate,
   iar prețul nopții devine suma prețurilor. */
function useAvailability(aptKey, startDate, endDate) {
  const [data, setData] = useState({ availability: {}, prices: {} });
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    setStatus("loading");
    const ids = String(aptKey || "").split(",").filter(Boolean);
    const one = (id) =>
      fetch(`/api/availability?apartmentId=${encodeURIComponent(id)}&startDate=${startDate}&endDate=${endDate}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))));
    Promise.all((ids.length ? ids : [""]).map(one))
      .then((results) => {
        if (cancelled) return;
        const availability = {};
        const prices = {};
        const dates = new Set();
        results.forEach((j) => Object.keys((j && j.availability) || {}).forEach((d) => dates.add(d)));
        for (const d of dates) {
          availability[d] = results.every((j) => ((j && j.availability) || {})[d] !== 0) ? 1 : 0;
          const ps = results.map((j) => ((j && j.prices) || {})[d]);
          if (ps.every((p) => p != null)) prices[d] = ps.reduce((s, p) => s + Number(p), 0);
        }
        setData({ availability, prices });
        setStatus(results.some((j) => j && j.mock) ? "mock" : "ok");
      })
      .catch(() => { if (!cancelled) { setData({ availability: {}, prices: {} }); setStatus("error"); } });
    return () => { cancelled = true; };
  }, [aptKey, startDate, endDate]);
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
    const prev = new Date(year, month, d - 1); // și peste granița de lună
    const aPrev = availability[iso(prev.getFullYear(), prev.getMonth(), prev.getDate())];
    const a = availability[key];
    // noapte ocupată + noapte precedentă liberă = ziua de check-in (sosire) -> half, după-amiaza ocupată
    // noapte liberă + noapte precedentă ocupată = ziua de check-out (plecare) -> half, dimineața ocupată
    let stateCls;
    if (isPast) stateCls = "past";
    else if (a === 0) stateCls = aPrev === 0 ? "busy" : "turn-in";
    else stateCls = aPrev === 0 ? "turn-out" : "free";
    const cls = [
      "cal-day", stateCls,
      date.getTime() === today.getTime() ? "today" : "",
      key === checkIn ? "sel-start" : "",
      key === checkOut ? "sel-end" : "",
      checkIn && checkOut && key > checkIn && key < checkOut ? "in-range" : "",
    ].filter(Boolean).join(" ");
    const title = isPast ? "" : a === 0 ? (aPrev === 0 ? "Ocupat" : "Check-out disponibil") : (aPrev === 0 ? "Check-in disponibil" : "Liber");
    cells.push(
      <span className={cls} key={key} onClick={() => !isPast && onPick(key)} title={title}><span className="dn">{d}</span></span>
    );
  }
  return (
    <div className="cal-month">
      <div className="cal-mhead"><span className="cal-myear">{year}</span><b className="cal-mname">{MONTHS_RO[month]}</b></div>
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

/* Politica de oaspeți per vilă: 8 adulți + 4 copii incluși în preț;
   extra max 2 adulți (150 lei/noapte) + 4 copii (75 lei/noapte).
   Constantele sunt dublate automat la rezervarea combinată (ambele vile)
   și trebuie ținute în sinc cu api/book.js (serverul recalculează). */
export const GUEST_POLICY = { includedAdults: 8, includedChildren: 4, maxExtraAdults: 2, maxExtraChildren: 4, extraAdultFee: 150, extraChildFee: 75 };

export default function AvailabilityCalendar({
  apartmentId, apartmentIds, villaName = "vila", contact = {}, depositPct = 30, currency = "lei",
  title,
}) {
  // apartmentIds (array) = rezervare combinată pe mai multe vile; altfel apartmentId simplu
  const aptKey = useMemo(
    () => (apartmentIds && apartmentIds.length ? apartmentIds : [apartmentId]).filter((x) => x != null && x !== "").join(","),
    [apartmentIds, apartmentId]
  );
  const multi = aptKey.includes(",");
  const nApts = Math.max(1, aptKey.split(",").filter(Boolean).length);
  const P = GUEST_POLICY;
  const inclAdults = P.includedAdults * nApts;
  const inclChildren = P.includedChildren * nApts;
  const maxAdults = inclAdults + P.maxExtraAdults * nApts;
  const maxChildren = inclChildren + P.maxExtraChildren * nApts;
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [extraBed, setExtraBed] = useState("pat"); // pat suplimentar | canapea (pentru oaspeții extra)
  const [childAges, setChildAges] = useState("");
  const [needCot, setNeedCot] = useState(false);
  const [step, setStep] = useState("select"); // select | form | sending | done
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [result, setResult] = useState(null);

  const m2 = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  const startDate = iso(cursor.getFullYear(), cursor.getMonth(), 1);
  const lastDay = new Date(m2.getFullYear(), m2.getMonth() + 1, 0).getDate();
  const endDate = iso(m2.getFullYear(), m2.getMonth(), lastDay);
  const { availability, prices, status } = useAvailability(aptKey, startDate, endDate);

  const atStart = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
  const shift = useCallback((n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1)), []);
  const nightsAllFree = useCallback((ci, co) => eachNight(ci, co).every((n) => availability[n] !== 0), [availability]);

  const pick = useCallback((dateStr) => {
    if (step !== "select") setStep("select");
    const restart = !checkIn || (checkIn && checkOut) || dateStr <= checkIn;
    if (restart) {
      if (availability[dateStr] === 0) return;
      setCheckIn(dateStr); setCheckOut(null); return;
    }
    if (nightsAllFree(checkIn, dateStr)) setCheckOut(dateStr);
    else if (availability[dateStr] !== 0) { setCheckIn(dateStr); setCheckOut(null); }
  }, [step, checkIn, checkOut, availability, nightsAllFree]);

  const clearSel = () => { setCheckIn(null); setCheckOut(null); setStep("select"); setResult(null); };

  const nights = checkIn && checkOut ? eachNight(checkIn, checkOut) : [];
  const priceKnown = nights.length > 0 && nights.every((n) => prices[n] != null);
  const baseTotal = nights.reduce((s, n) => s + (Number(prices[n]) || 0), 0);
  // oaspeți peste cei incluși în preț → taxă per noapte (serverul recalculează identic)
  const extraAdults = Math.max(0, adults - inclAdults);
  const extraChildren = Math.max(0, children - inclChildren);
  const extraFee = (extraAdults * P.extraAdultFee + extraChildren * P.extraChildFee) * nights.length;
  const total = baseTotal + extraFee;
  const deposit = Math.round(total * depositPct / 100);
  const rest = total - deposit;
  const hasRange = nights.length > 0;
  const hasExtra = extraAdults + extraChildren > 0;

  const wa = (contact.whatsapp || "").replace(/[^0-9]/g, "");
  const waMsg = encodeURIComponent(
    `Bună! Aș dori să rezerv ${villaName}.\n` +
    `Check-in: ${checkIn}\nCheck-out: ${checkOut}\nNopți: ${nights.length}\n` +
    `Oaspeți: ${adults} adulți${children ? ` + ${children} copii` : ""}\n` +
    (hasExtra ? `Oaspeți extra: ${extraAdults} adulți + ${extraChildren} copii (${extraBed === "pat" ? "pat suplimentar" : "canapea extensibilă"})\n` : "") +
    (children && childAges.trim() ? `Vârste copii: ${childAges.trim()}\n` : "") +
    (needCot ? "Avem nevoie de pătuț pentru bebeluș (gratuit)\n" : "") +
    (priceKnown ? `Total: ${lei(total)} ${currency}\nAvans (${depositPct}%): ${lei(deposit)} ${currency}` : "Preț: la cerere")
  );
  const waHref = `https://wa.me/${wa}?text=${waMsg}`;

  const emailOk = /.+@.+\..+/.test(form.email);
  const formValid = form.firstName.trim() && form.lastName.trim() && emailOk && form.phone.trim().length >= 6;
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setStep("sending");
    try {
      const r = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartmentId: aptKey.split(",")[0],
          apartmentIds: multi ? aptKey.split(",") : undefined,
          villaName, depositPct,
          arrivalDate: checkIn, departureDate: checkOut, adults, children,
          extraBed: hasExtra ? extraBed : undefined,
          childAges: children > 0 ? childAges.trim() : undefined,
          needCot,
          firstName: form.firstName.trim(), lastName: form.lastName.trim(),
          email: form.email.trim(), phone: form.phone.trim(),
        }),
      });
      const json = await r.json();
      if (json && json.detail) console.warn("[rezervare] detaliu server:", json.detail);
      if (json && json.ok) {
        // conversii pentru Ads: rezervare reală = purchase, dry-run = lead
        track(json.dryRun ? "generate_lead" : "purchase", { label: villaName, value: json.price || total });
      }
      setResult(json);
    } catch (e) {
      setResult({ ok: false, error: "Eroare de rețea. Încearcă din nou sau scrie-ne pe WhatsApp." });
    }
    setStep("done");
  };

  const Recap = () => (
    <div className="bk-summary">
      <div className="bk-row"><span>{checkIn} → {checkOut}</span><span>{nights.length} {nights.length === 1 ? "noapte" : "nopți"} · {adults + children} oaspeți</span></div>
      {priceKnown ? (
        <>
          {hasExtra && (
            <div className="bk-row muted"><span>{t("extra_guests_row", { a: extraAdults, c: extraChildren })}</span><span>+{lei(extraFee)} {currency}</span></div>
          )}
          <div className="bk-row"><span>{t("total_stay")}</span><b>{lei(total)} {currency}</b></div>
          <div className="bk-row hi"><span>{t("deposit_now")} ({depositPct}%)</span><b>{lei(deposit)} {currency}</b></div>
          <div className="bk-row muted"><span>{t("rest_checkin")}</span><span>{lei(rest)} {currency}</span></div>
        </>
      ) : <div className="bk-row muted"><span>Preț</span><span>la cerere</span></div>}
    </div>
  );

  return (
    <div className="cal-card">
      <div className="cal-head">
        <h3>{title || t("cal_title")}</h3>
        <div className="cal-nav">
          <button onClick={() => shift(-1)} disabled={atStart} aria-label="Luna anterioară">‹</button>
          <button onClick={() => shift(1)} aria-label="Luna următoare">›</button>
        </div>
      </div>

      <div className="cal-hint">
        {!checkIn ? t("pick_checkin") : !checkOut ? t("pick_checkout") : `${nights.length} ${t("nights_sel")}`}
        {(checkIn || checkOut) && <button className="cal-clear" onClick={clearSel}>{t("clear_sel")}</button>}
      </div>

      <div className="cal-months">
        <Month year={cursor.getFullYear()} month={cursor.getMonth()} availability={availability} today={today} checkIn={checkIn} checkOut={checkOut} onPick={pick} />
        <Month year={m2.getFullYear()} month={m2.getMonth()} availability={availability} today={today} checkIn={checkIn} checkOut={checkOut} onPick={pick} />
      </div>

      <div className="cal-foot">
        <div className="cal-legend">
          <span><i className="lg free" /> {t("cal_free")}</span>
          <span><i className="lg busy" /> {t("cal_busy")}</span>
          <span><i className="lg sel" /> {t("cal_sel")}</span>
        </div>
        {status === "loading" && <span className="cal-note">Se încarcă…</span>}
        {status === "mock" && <span className="cal-note">Date demonstrative.</span>}
        {status === "error" && <span className="cal-note err">Momentan nu putem afișa disponibilitatea.</span>}
      </div>

      {/* --- panou rezervare --- */}
      <div className="bk-panel">
        {step === "select" && (
          <>
            <div className="bk-guests">
              <Stepper label={t("adults")} value={adults} set={setAdults} min={1} max={maxAdults} />
              <Stepper label={t("children")} value={children} set={setChildren} min={0} max={maxChildren} />
              <div className="bk-cap">
                {t("guests_included", { a: inclAdults, c: inclChildren })} · {t("extra_prices", { pa: P.extraAdultFee, pc: P.extraChildFee })}
              </div>
            </div>
            {hasExtra && (
              <div className="bk-extra">
                <div className="bk-extra-q">{t("extra_bed_q")}</div>
                <div className="bk-extra-opts">
                  <label className={extraBed === "pat" ? "on" : ""}>
                    <input type="radio" name="extrabed" checked={extraBed === "pat"} onChange={() => setExtraBed("pat")} />
                    {t("extra_bed_bed")}
                  </label>
                  <label className={extraBed === "canapea" ? "on" : ""}>
                    <input type="radio" name="extrabed" checked={extraBed === "canapea"} onChange={() => setExtraBed("canapea")} />
                    {t("extra_bed_sofa")}
                  </label>
                </div>
                <p className="bk-extra-note">{t("extra_note")}</p>
              </div>
            )}
            {children > 0 && (
              <div className="bk-kids">
                <label className="bk-kids-lbl" htmlFor="bk-ages">{t("child_ages")}</label>
                <input id="bk-ages" className="bk-input" placeholder={t("child_ages_ph")} value={childAges} onChange={(e) => setChildAges(e.target.value)} />
                <label className="bk-cot">
                  <input type="checkbox" checked={needCot} onChange={(e) => setNeedCot(e.target.checked)} />
                  {t("need_cot")}
                </label>
              </div>
            )}
            {hasRange && <Recap />}
            <button className="bk-cta" disabled={!hasRange} onClick={() => { setStep("form"); track("begin_checkout", { label: villaName, value: priceKnown ? total : undefined }); }}>
              {hasRange ? t("continue_book") : t("choose_period")}
            </button>
            {hasRange && <p className="bk-soon">Sau <a href={waHref} target="_blank" rel="noreferrer" onClick={() => track("contact", { label: villaName })}>scrie-ne pe WhatsApp</a>.</p>}
          </>
        )}

        {step === "form" && (
          <div className="bk-form">
            <Recap />
            <div className="bk-fields">
              <input className="bk-input" placeholder={t("first_name")} value={form.firstName} onChange={setF("firstName")} />
              <input className="bk-input" placeholder={t("last_name")} value={form.lastName} onChange={setF("lastName")} />
              <input className="bk-input" type="email" placeholder={t("email")} value={form.email} onChange={setF("email")} />
              <input className="bk-input" type="tel" placeholder={t("phone")} value={form.phone} onChange={setF("phone")} />
            </div>
            <div className="bk-actions">
              <button className="bk-back" onClick={() => setStep("select")}>{t("back")}</button>
              <button className="bk-cta grow" disabled={!formValid} onClick={submit}>{t("send_booking")}</button>
            </div>
            <p className="bk-soon">{t("bk_nopay")}</p>
          </div>
        )}

        {step === "sending" && <div className="bk-done"><p>{t("bk_sending")}</p></div>}

        {step === "done" && (
          result && result.ok && !result.dryRun ? (
            <div className="bk-done ok">
              <div className="bk-badge">✓</div>
              <h4>{t("bk_booked")}</h4>
              <div className="bk-conf">
                <div className="bk-crow"><span>{t("bk_villa")}</span><b>{villaName}</b></div>
                <div className="bk-crow"><span>{t("bk_guest")}</span><b>{form.firstName} {form.lastName}</b></div>
                <div className="bk-crow"><span>Check-in</span><b>{checkIn}</b></div>
                <div className="bk-crow"><span>Check-out</span><b>{checkOut}</b></div>
                <div className="bk-crow"><span>{t("bk_nights_g")}</span><b>{nights.length} · {adults + children}</b></div>
                {priceKnown && <div className="bk-crow"><span>{t("bk_total")}</span><b>{lei(total)} {currency}</b></div>}
                {priceKnown && <div className="bk-crow"><span>{t("bk_deposit", { p: depositPct })}</span><b>{lei(deposit)} {currency}</b></div>}
                {result.reservationId && <div className="bk-crow"><span>{t("bk_ref")}</span><b>#{result.reservationId}</b></div>}
              </div>
              <p className="bk-soon">
                {result.emailed ? t("bk_emailed", { e: form.email }) : ""}
                {t("bk_soon")}
              </p>
            </div>
          ) : result && result.dryRun ? (
            <div className="bk-done">
              <h4>{t("bk_almost")}</h4>
              <p>{t("bk_dry")}</p>
              <a className="bk-cta" href={waHref} target="_blank" rel="noreferrer" onClick={() => track("contact", { label: villaName })}>{t("bk_send_wa")}</a>
            </div>
          ) : (
            <div className="bk-done err">
              <h4>{t("bk_fail")}</h4>
              <p>{(result && result.error) || ""} {t("bk_fail_p")}</p>
              <div className="bk-actions">
                <button className="bk-back" onClick={clearSel}>{t("bk_other_dates")}</button>
                <a className="bk-cta grow" href={waHref} target="_blank" rel="noreferrer" onClick={() => track("contact", { label: villaName })}>{t("write_wa")}</a>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
