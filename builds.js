// Saran build (item, spell, emblem) per hero, disesuaikan dengan komposisi lawan.
// Build dasar + item situasional dari mlbbhub (BUILDS). Memilih item situasional dan alternatif spell
// dilakukan di sini lewat aturan terhadap ciri tim lawan (threats() di engine.js).

// Kondisi dari teks pemicu item situasional (bahasa Inggris dari sumber) -> ciri tim lawan.
// neg = tes untuk pemicu berbunyi "enemy has LOW/NO <hal ini>".
const FLEX_CONDS = [
  { re: /sustain|heal|regen|lifesteal|shield support|attack-speed/i, label: "lawan banyak sustain/heal", test: (t) => t.sus >= 2, neg: (t) => t.sus === 0 },
  { re: /crowd control|\bCC\b|stun|chain|lockdown|\block\b|hook|root/i, label: "lawan banyak CC", test: (t) => t.cc >= 3 || t.lock >= 2, neg: (t) => t.cc <= 1 },
  { re: /magic (burst|damage|heavy)|mage|spell burst/i, label: "lawan banyak magic damage", test: (t) => t.magic >= 3, neg: (t) => t.magic <= 1 },
  { re: /physical|marksman|basic attack|crit|attack speed/i, label: "lawan banyak physical damage", test: (t) => t.phys >= 3, neg: (t) => t.phys <= 1 },
  { re: /dive|assassin|burst|pick-?off|ambush|flank/i, label: "lawan banyak assassin/dive", test: (t) => t.mobAssassin >= 2, neg: () => false },
  { re: /tank|armor|durable|front-?line|bruiser/i, label: "lawan banyak tank", test: (t) => t.tank >= 2, neg: () => false },
  { re: /poke|ranged|siege|zone/i, label: "lawan banyak poke", test: (t) => t.poke >= 2, neg: () => false },
  { re: /push|wave|tower|split/i, label: "lawan banyak push", test: (t) => t.push >= 2, neg: () => false },
];
const NEG_WORDS = /\b(low|little|few|no|lacks?|without|minimal|not)\b[^.]{0,30}$/i;

function matchFlex(why, th) {
  const hits = [];
  for (const c of FLEX_CONDS) {
    const m = c.re.exec(why);
    if (!m) continue;
    const negated = NEG_WORDS.test(why.slice(0, m.index + m[0].length));
    if (negated ? c.neg(th) : c.test(th)) hits.push(c.label);
  }
  return hits;
}

// Alternatif spell berdasarkan lawan. Spell utama tetap dari build sumber.
function spellAlt(hero, spell, th) {
  if (spell === "Retribution") return null;
  const has = (...r) => r.some((x) => hero.roles.includes(x));
  if (th.cc >= 3 && has("K", "M", "F", "A") && spell !== "Purify") return { name: "Purify", why: "Lawan banyak CC: buang stun/slow supaya tidak mati diam di tempat." };
  if (th.mobAssassin >= 2 && has("K", "M", "S") && spell !== "Petrify" && spell !== "Flicker") return { name: "Petrify", why: "Banyak assassin yang menempel: Petrify memberi jeda untuk kabur atau membalas." };
  if (th.phys >= 3 && has("T", "F") && spell !== "Vengeance") return { name: "Vengeance", why: "Lawan dominan physical: pantulkan sebagian damage saat kamu di depan." };
  return null;
}

// hero: objek dari HEROES, laneKey: lane yang ditugaskan untuk hero ini (R/J/G/E/D atau null)
function buildAdvice(hero, laneKey, enemy) {
  const data = BUILDS[hero.name];
  if (!data || !data.builds.length) return null;
  const laneName = laneKey ? LANE_NAME[laneKey] : null;
  const build = data.builds.find((b) => b.role === laneName) || data.builds[0];
  const th = enemy.length >= 2 ? threats(enemy) : null;

  const swaps = [];
  if (th) {
    for (const f of build.flex) {
      const hits = matchFlex(f.why, th);
      if (hits.length) swaps.push({ item: f.item, replace: f.replace, reasons: hits, source: f.why });
    }
    swaps.sort((a, b) => b.reasons.length - a.reasons.length);
  }
  return {
    build, laneMatch: !!laneName && build.role === laneName, stale: data.stale, patch: data.patch,
    swaps: swaps.slice(0, 3), alt: th ? spellAlt(hero, build.spell, th) : null, hasEnemyInfo: !!th,
  };
}
