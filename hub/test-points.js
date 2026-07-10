// test-points.js — testele regulilor de calcul membership (rulare: npm run test:points)
const assert = require('assert');
const { pointsForSpend, tierFor, tierProgress, DEFAULT_MEMBERSHIP, genReferralCode } = require('./points');

let passed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('  ✓', name); }
  catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
}

console.log('Reguli de calcul — membership & puncte');

/* Criteriul 1: rezervare de 10.000 lei la rata implicită → 1000 puncte */
t('10.000 lei la 10 lei/punct → 1000 puncte', () => {
  assert.strictEqual(pointsForSpend(10000, DEFAULT_MEMBERSHIP.lei_per_point), 1000);
});
t('rotunjire în jos: 1999 lei → 199 puncte', () => {
  assert.strictEqual(pointsForSpend(1999, 10), 199);
});
t('sume invalide/negative → 0 puncte', () => {
  assert.strictEqual(pointsForSpend(-500, 10), 0);
  assert.strictEqual(pointsForSpend('abc', 10), 0);
  assert.strictEqual(pointsForSpend(0, 10), 0);
});

/* Criteriul 3: grup — 1000 (cheltuială) + 7×20 (invitator) = 1140 pentru titular */
t('scenariul de grup: 1000 + 7×20 = 1140 puncte pentru titular', () => {
  const spend = pointsForSpend(10000, DEFAULT_MEMBERSHIP.lei_per_point);
  const inviter = 7 * DEFAULT_MEMBERSHIP.referral_points_inviter;
  assert.strictEqual(spend + inviter, 1140);
  // fiecare invitat primește bonusul de cont nou
  assert.strictEqual(DEFAULT_MEMBERSHIP.referral_points_new, 50);
});

/* Criteriul 4: schimbarea ratei afectează calculele următoare (nu retroactiv —
   tranzacțiile vechi sunt imutabile prin design; aici verificăm doar noua rată) */
t('schimbarea lei_per_point afectează calculul următor', () => {
  assert.strictEqual(pointsForSpend(10000, 10), 1000);
  assert.strictEqual(pointsForSpend(10000, 20), 500);
  assert.strictEqual(pointsForSpend(10000, 5), 2000);
});
t('rată invalidă (0/NaN) → cade pe rata implicită, nu umflă punctele', () => {
  assert.strictEqual(pointsForSpend(100, 0), 10);   // implicit 10 lei/punct
  assert.strictEqual(pointsForSpend(100, NaN), 10);
});

/* Criteriul 6: trecerea pragurilor mută tier-ul */
t('praguri tiere: silver → gold → platinum', () => {
  const s = { ...DEFAULT_MEMBERSHIP, tier_gold: 1000, tier_platinum: 5000 };
  assert.strictEqual(tierFor(0, s), 'silver');
  assert.strictEqual(tierFor(999, s), 'silver');
  assert.strictEqual(tierFor(1000, s), 'gold');
  assert.strictEqual(tierFor(4999, s), 'gold');
  assert.strictEqual(tierFor(5000, s), 'platinum');
  assert.strictEqual(tierFor(999999, s), 'platinum');
});
t('bara de progres: procente și puncte până la următorul tier', () => {
  const s = { ...DEFAULT_MEMBERSHIP, tier_gold: 1000, tier_platinum: 5000 };
  const p1 = tierProgress(500, s);
  assert.strictEqual(p1.tier, 'silver');
  assert.strictEqual(p1.next, 'gold');
  assert.strictEqual(p1.toNext, 500);
  assert.strictEqual(p1.pct, 50);
  const p2 = tierProgress(3000, s);
  assert.strictEqual(p2.tier, 'gold');
  assert.strictEqual(p2.next, 'platinum');
  assert.strictEqual(p2.toNext, 2000);
  const p3 = tierProgress(9000, s);
  assert.strictEqual(p3.tier, 'platinum');
  assert.strictEqual(p3.next, null);
  assert.strictEqual(p3.pct, 100);
});

/* codul de referral: format și unicitate statistică */
t('codul de referral are formatul RV-XXXXXX și variază', () => {
  const a = genReferralCode(), b = genReferralCode();
  assert.match(a, /^RV-[A-HJ-NP-Z2-9]{6}$/);
  assert.notStrictEqual(a, b);
});

console.log(passed + ' teste trecute' + (process.exitCode ? ' (CU EȘECURI)' : ''));
