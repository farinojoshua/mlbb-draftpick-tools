// Mesin suggestion draft pick. Murni logika, tidak menyentuh DOM.
const LANES = ["R", "J", "G", "E", "D"];
const LANE_NAME = { R: "Roam", J: "Jungle", G: "Gold", E: "EXP", D: "Mid" };
const ROLE_NAME = { T: "Tank", F: "Fighter", A: "Assassin", M: "Mage", K: "Marksman", S: "Support" };

const ROLE_KEY = { Tank: "T", Fighter: "F", Assassin: "A", Mage: "M", Marksman: "K", Support: "S" };
const LANE_KEY = { Roam: "R", Jungle: "J", Gold: "G", EXP: "E", Mid: "D" };
const withExtra = (name, tags) => [...tags, ...Object.keys(EXTRA_TAGS).filter((t) => EXTRA_TAGS[t].includes(name))];

const MANUAL = Object.fromEntries(RAW_HEROES.trim().split("\n").map((line) => {
  const [name, roles, lanes, tier, wr, dmg, tags] = line.split("|");
  return [name, { roles: roles.split(","), lanes: lanes.split(","), tier, wr: parseFloat(wr), dmg, tags: tags.split(",") }];
}));
// Hero yang ada di meta-data.js tapi belum dikurasi manual tetap dipakai (tag kosong, role/lane dari sumber).
const HEROES = Object.keys({ ...META_STATS, ...MANUAL }).map((name) => {
  const m = MANUAL[name], st = META_STATS[name];
  const base = m || {
    roles: st.role.map((r) => ROLE_KEY[r]).filter(Boolean), lanes: st.lane.map((l) => LANE_KEY[l]).filter(Boolean),
    dmg: "X", tags: [],
  };
  return {
    name, roles: base.roles, lanes: base.lanes.length ? base.lanes : ["R"], dmg: base.dmg,
    tier: st ? st.tier : base.tier, wr: st ? st.wr : base.wr, pick: st ? st.pick : 0, ban: st ? st.ban : 0,
    tags: withExtra(name, base.tags), curated: !!m,
  };
});
const HERO = Object.fromEntries(HEROES.map((h) => [h.name, h]));
const TIER_BONUS = { S: 14, A: 7, B: 0, C: -7, D: -14 };

// Skor lane terbaik untuk satu tim: tiap lane hanya boleh diisi 1 hero.
// Lane utama hero (urutan pertama) bernilai 2, lane alternatif bernilai 1.
function bestLanes(names) {
  const heroes = names.map((n) => HERO[n]);
  let best = { score: -1, assign: [] };
  (function go(i, used, score, assign) {
    if (i === heroes.length) {
      if (score > best.score) best = { score, assign: assign.slice() };
      return;
    }
    const h = heroes[i];
    h.lanes.forEach((l, idx) => {
      if (used.has(l)) return;
      used.add(l); assign.push(l);
      go(i + 1, used, score + (idx === 0 ? 2 : 1), assign);
      used.delete(l); assign.pop();
    });
    // hero boleh tidak dapat lane (lane bentrok)
    assign.push(null); go(i + 1, used, score, assign); assign.pop();
  })(0, new Set(), 0, []);
  return best;
}

function teamProfile(names) {
  const hs = names.map((n) => HERO[n]);
  const count = (f) => hs.filter(f).length;
  const { assign } = bestLanes(names);
  const covered = new Set(assign.filter(Boolean));
  return {
    n: hs.length,
    tank: count((h) => h.roles.includes("T") || h.tags.includes("eng")),
    cc: count((h) => h.tags.includes("cc")),
    phys: count((h) => h.dmg === "P" && !h.roles.every((r) => r === "T" || r === "S")),
    magic: count((h) => h.dmg === "M" && !h.roles.every((r) => r === "T" || r === "S")),
    late: count((h) => h.tags.includes("late")),
    lock: count((h) => h.tags.includes("lock")),
    burst: count((h) => h.tags.includes("bur")),
    shield: count((h) => h.tags.includes("shl") || h.tags.includes("sus")),
    mob: count((h) => h.tags.includes("mob")),
    covered, missing: LANES.filter((l) => !covered.has(l)), assign,
  };
}

// Keunggulan h atas e dalam poin win rate (positif = h menang lawan e), dari data ranked terukur.
// Null kalau pasangan ini tidak ada di data (mlbbhub hanya memuat matchup yang paling ekstrem).
const MU = (n) => MATCHUPS[n] || { by: [], vs: [] };
function edge(h, e) {
  const find = (list, n) => (list.find((x) => x[0] === n) || [0, 0])[1];
  const plus = Math.max(find(MU(e).by, h), find(MU(h).vs, e));
  const minus = Math.max(find(MU(h).by, e), find(MU(e).vs, h));
  return plus || minus ? plus - minus : null;
}
const synergy = (a, b) => Math.max((SYNERGY[a] || []).find((x) => x[0] === b)?.[1] || 0, (SYNERGY[b] || []).find((x) => x[0] === a)?.[1] || 0);

// Seberapa mudah hero di-counter: jumlah 3 keunggulan lawan terbesar (poin win rate).
const vulnerability = (name) => MU(name).by.slice(0, 3).reduce((a, x) => a + x[1], 0);
const VULN = HEROES.map((h) => vulnerability(h.name)).sort((a, b) => a - b);
const VULN_MEDIAN = VULN[Math.floor(VULN.length / 2)] || 0;

// Catatan sesuai posisi pick: pick awal harus aman, pick akhir boleh agresif counter.
function positionTip(mineN, enemyN) {
  if (mineN === 0 && enemyN === 0) return "FIRST PICK: lawan belum terlihat. Pilih hero fleksibel dan sulit di-counter, jangan buka hero yang punya banyak counter.";
  if (enemyN <= 1) return "Pick awal: lawan baru sedikit terbuka. Utamakan hero kuat dan aman; counter spesifik belum bisa diandalkan.";
  if (enemyN >= 4) return "LAST PICK: hampir semua musuh sudah terbuka. Manfaatkan counter paling tajam dan isi lane yang masih kosong.";
  return "";
}

// Ciri tim lawan yang relevan untuk counter berbasis kemampuan.
function threats(names) {
  const hs = names.map((n) => HERO[n]);
  const c = (f) => hs.filter(f).length;
  const tag = (t) => (h) => h.tags.includes(t);
  return {
    mobAssassin: c((h) => h.roles.includes("A") || (h.tags.includes("mob") && h.tags.includes("bur"))),
    marksman: c((h) => h.roles.includes("K")),
    tank: c((h) => h.roles.includes("T")),
    sus: c(tag("sus")), poke: c(tag("poke")), push: c(tag("push")),
    late: c(tag("late")), early: c(tag("early")), mob: c(tag("mob")), cc: c(tag("cc")), lock: c(tag("lock")),
    phys: c((h) => h.dmg === "P" && !h.roles.every((r) => r === "T" || r === "S")),
    magic: c((h) => h.dmg === "M" && !h.roles.every((r) => r === "T" || r === "S")),
  };
}

// Aturan: kalau lawan punya ciri tertentu, hero dengan kemampuan tertentu mendapat bonus.
const ABILITY_RULES = [
  { when: (t) => t.mobAssassin >= 1, per: (t) => Math.min(2, t.mobAssassin), has: (h) => h.tags.includes("lock"), pts: 5, why: "Lock/CC lawan assassin" },
  { when: (t) => t.marksman >= 1, per: () => 1, has: (h) => h.roles.includes("A") || (h.tags.includes("mob") && h.tags.includes("bur")), pts: 4, why: "Bisa dive marksman" },
  { when: (t) => t.tank >= 2, per: () => 1, has: (h) => h.tags.includes("shred"), pts: 6, why: "Shred tank lawan" },
  { when: (t) => t.sus >= 2, per: () => 1, has: (h) => h.tags.includes("bur"), pts: 3, why: "Burst tembus sustain" },
  { when: (t) => t.poke >= 2, per: () => 1, has: (h) => h.tags.includes("eng") || h.tags.includes("mob") || h.tags.includes("sus"), pts: 3, why: "Tahan poke lawan" },
  { when: (t) => t.push >= 2, per: () => 1, has: (h) => h.tags.includes("push"), pts: 3, why: "Tahan push lawan" },
  { when: (t) => t.late >= 3, per: () => 1, has: (h) => h.tags.includes("early") || h.tags.includes("bur"), pts: 4, why: "Tekan sebelum lawan late" },
  { when: (t) => t.early >= 3, per: () => 1, has: (h) => h.tags.includes("late") || h.tags.includes("shl"), pts: 4, why: "Aman dari early lawan" },
];

// Catatan strategi/item melawan komposisi `enemy` (tidak mengubah skor hero).
function strategyTips(enemy) {
  if (!enemy.length) return [];
  const t = threats(enemy), tips = [];
  if (t.sus >= 2) tips.push("Lawan banyak sustain/heal: beli item anti-heal lebih awal (Dominance Ice, Sea Halberd, atau Necklace of Durance).");
  if (t.phys >= 3) tips.push("Lawan dominan physical: pertimbangkan armor (Antique Cuirass/Blade Armor) dan tank dengan physical defense.");
  if (t.magic >= 3) tips.push("Lawan dominan magic: pertimbangkan Radiant Armor atau Athena's Shield.");
  if (t.mobAssassin >= 2) tips.push("Banyak assassin: jaga carry dengan peel/lock, jangan lepas dari tim.");
  if (t.late >= 3) tips.push("Lawan kuat late game: tekan early-mid, ambil objektif sebelum mereka scaling.");
  if (t.early >= 3) tips.push("Lawan kuat early game: main aman, jangan fight sebelum item inti jadi.");
  if (t.poke >= 2) tips.push("Lawan banyak poke: jangan bertahan di jarak jauh, cari engage atau mundur ke sustain.");
  if (t.tank >= 2) tips.push("Lawan banyak tank: butuh damage % HP/true damage, hindari terlalu banyak burst murni.");
  return tips;
}

// opts: { mine:[], enemy:[], unavailable:Set, slotsLeft:number (sisa pick tim ini termasuk yang sedang dipilih) }
function suggestPicks(opts) {
  const { mine, enemy, unavailable, slotsLeft, counterBias = 0.5 } = opts;
  // counterBias 0 = ikut meta, 1 = utamakan counter
  const metaMult = 1.25 - counterBias * 0.9, counterMult = 6 * (0.5 + counterBias * 1.5);
  const base = bestLanes(mine).score;
  const prof = teamProfile(mine);
  const eProf = teamProfile(enemy);
  const out = [];
  for (const h of HEROES) {
    if (unavailable.has(h.name)) continue;
    let score = ((h.wr - 50) * 4 + TIER_BONUS[h.tier]) * metaMult;
    let edgeSum = 0;
    const why = [];
    const bad = [];
    if (h.tier === "S") why.push("Meta S-tier");
    else if (h.wr >= 52.5) why.push(`WR tinggi ${h.wr}%`);
    if (h.tier === "D") bad.push("Lemah di meta");

    // Lane fit: makin jauh draft berjalan, makin penting menutup lane (di awal masih boleh fleksibel)
    const progress = (mine.length + enemy.length) / 9;
    const gain = bestLanes([...mine, h.name]).score - base;
    const forced = slotsLeft <= prof.missing.length; // sisa slot = sisa lane, tidak boleh buang pick
    if (gain >= 2) { score += 8 + 18 * progress; why.push(`Isi lane ${LANE_NAME[h.lanes[0]]}`); }
    else if (gain === 1) { score += 5 + 9 * progress; why.push(`Bisa isi lane ${LANE_NAME[h.lanes.find((l) => prof.missing.includes(l)) || h.lanes[0]]}`); }
    else if (mine.length) { score -= 10 + 14 * progress; bad.push("Lane sudah penuh"); }
    if (forced && gain === 0) score -= 30;

    // Counter terhadap musuh yang sudah pick
    for (const e of enemy) {
      const d = edge(h.name, e);
      if (d !== null) {
        score += d * counterMult;
        edgeSum += d;
        if (d >= 1) why.push(`Counter ${e} (+${d.toFixed(1)})`);
        else if (d <= -1) bad.push(`Lemah vs ${e} (${d.toFixed(1)})`);
      } else {
        // fallback ke daftar manual kalau tidak ada data terukur
        if ((COUNTERS[e] || []).includes(h.name)) { score += 5; why.push(`Counter ${e}`); }
        if ((COUNTERS[h.name] || []).includes(e)) { score -= 4; bad.push(`Lemah vs ${e}`); }
      }
    }
    // Counter berbasis kemampuan hero
    if (enemy.length) {
      const th = threats(enemy), scale = 0.6 + counterBias * 0.8;
      for (const r of ABILITY_RULES) {
        if (r.when(th) && r.has(h)) { score += r.pts * r.per(th) * scale; why.push(r.why); }
      }
    }
    if (prof.n >= 1 && prof.lock === 0 && slotsLeft <= 3 && h.tags.includes("lock")) { score += 4; why.push("Butuh lock/pick-off"); }
    for (const m of mine) {
      const s = synergy(h.name, m);
      if (s) { score += s * 0.8; why.push(`Sinergi ${m}`); }
    }

    // Kebutuhan komposisi
    const dmgHero = !h.roles.every((r) => r === "T" || r === "S");
    if (prof.n >= 1) {
      if (prof.magic === 0 && h.dmg === "M" && dmgHero) { score += 9; why.push("Butuh magic damage"); }
      if (prof.phys === 0 && h.dmg === "P" && dmgHero) { score += 9; why.push("Butuh physical damage"); }
      if (prof.phys >= 3 && h.dmg === "P" && dmgHero) { score -= 8; bad.push("Terlalu banyak physical"); }
      if (prof.magic >= 3 && h.dmg === "M" && dmgHero) { score -= 8; bad.push("Terlalu banyak magic"); }
    }
    if (prof.tank === 0 && slotsLeft <= 3 && (h.roles.includes("T") || h.tags.includes("eng"))) { score += 12; why.push("Butuh frontline/engage"); }
    if (prof.cc < 2 && h.tags.includes("cc")) { score += 5; why.push("Tambah CC"); }
    if (prof.late === 0 && h.tags.includes("late") && slotsLeft <= 2) { score += 5; why.push("Scaling late game"); }
    // Sinergi
    if (prof.tank > 0 && h.tags.includes("bur") && dmgHero) { score += 3; }
    if (prof.shield > 0 && h.tags.includes("late")) { score += 3; why.push("Ada yang jaga carry"); }
    if (eProf.burst >= 2 && (h.tags.includes("shl") || h.tags.includes("cc"))) { score += 5; why.push("Lawan banyak burst"); }
    if (eProf.mob >= 3 && h.tags.includes("cc")) { score += 4; why.push("Lawan banyak mobile, butuh CC"); }
    // Posisi pick: makin banyak musuh yang belum terbuka, makin berisiko memilih hero yang gampang di-counter
    const unrevealed = 5 - enemy.length;
    if (unrevealed >= 2) {
      const v = vulnerability(h.name), risk = v * 0.9 * (unrevealed / 5);
      score -= risk;
      if (unrevealed >= 3 && v >= VULN_MEDIAN * 1.4) bad.push("Rawan di-counter (blind pick)");
      else if (unrevealed >= 3 && v <= VULN_MEDIAN * 0.7) { score += 3; why.push("Aman di-pick awal"); }
    }
    if (mine.length + enemy.length <= 2 && h.lanes.length > 1) { score += 4; why.push("Fleksibel (aman first pick)"); }

    // Konvensi draft: MM (dan mid) sangat sensitif terhadap counter, jadi enak dipick belakangan.
    // Dilewati kalau hero ini counter nyata untuk musuh, atau lane-nya memang sudah terpaksa diisi.
    if (!forced && edgeSum < 2 && mine.length + enemy.length < 6) {
      if (h.lanes[0] === "G" && h.roles.includes("K")) { score -= 6; bad.push("MM biasanya pick belakangan"); }
      else if (h.lanes[0] === "D" && h.roles.includes("M")) { score -= 3; }
    }
    out.push({ hero: h, score, edgeSum, laneOk: gain > 0, why: [...new Set(why)].slice(0, 5), bad: [...new Set(bad)].slice(0, 2) });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Counter non-meta: hero tier B ke bawah dengan keunggulan terukur terbesar atas pick musuh.
function nonMetaCounters(results, n = 2) {
  return results
    .filter((r) => ["B", "C", "D"].includes(r.hero.tier) && r.edgeSum >= 1.5 && r.laneOk)
    .sort((a, b) => b.edgeSum - a.edgeSum)
    .slice(0, n);
}

// Saran ban untuk tim `mine` melawan `enemy`.
function suggestBans(opts) {
  const { mine, enemy, unavailable } = opts;
  const out = [];
  for (const h of HEROES) {
    if (unavailable.has(h.name)) continue;
    let score = (h.wr - 50) * 4 + TIER_BONUS[h.tier] + h.ban * 0.35;
    const why = [];
    if (h.ban >= 30) why.push(`Ban rate ${h.ban}%`);
    if (h.tier === "S") why.push("Meta S-tier");
    if (h.wr >= 54) why.push(`WR ${h.wr}%`);
    // hero yang menang lawan pick timmu = kandidat ban
    for (const m of mine) {
      const d = edge(h.name, m);
      if (d !== null) {
        score += d * 5;
        if (d >= 1) why.push(`Counter ${m} (+${d.toFixed(1)})`);
      }
    }
    // jangan buang ban untuk hero yang justru membantu kita melawan musuh
    for (const e of enemy) {
      const d = edge(h.name, e);
      if (d !== null) score -= d * 2;
    }
    out.push({ hero: h, score, why: [...new Set(why)].slice(0, 3), bad: [] });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ---- Skor draft (heuristik, bukan prediksi pasti) ----
function teamParts(names, enemy) {
  const n = names.length;
  if (!n) return { meta: 0, comp: 0, syn: 0 };
  const hs = names.map((x) => HERO[x]), p = teamProfile(names);
  // meta: rata-rata (WR-50), diskalakan seolah tim sudah 5 hero
  const meta = (hs.reduce((a, h) => a + (h.wr - 50), 0) / n) * 2.5;
  let comp = 0;
  if (n >= 3) {
    if (p.tank === 0) comp -= 3;
    if (p.magic === 0) comp -= 3;
    if (p.phys === 0) comp -= 3;
    if (p.cc < 2) comp -= 2;
  }
  comp -= (n - p.covered.size) * 3; // hero yang bentrok lane
  if (n >= 4 && p.lock === 0) comp -= 1.5;
  if (n === 5 && p.late === 0) comp -= 1;
  let syn = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) syn += synergy(names[i], names[j]) * 0.3;
  return { meta, comp, syn };
}

function draftEval(blue, red) {
  const B = teamParts(blue, red), R = teamParts(red, blue);
  let matchup = 0; // keunggulan Blue atas Red (antisimetris)
  for (const b of blue) for (const r of red) matchup += edge(b, r) || 0;
  matchup *= 0.6;
  B.matchup = matchup; R.matchup = -matchup;
  const tot = (t) => t.meta + t.comp + t.syn + t.matchup;
  const diff = tot(B) - tot(R);
  return { pB: 1 / (1 + Math.exp(-diff / 25)), B, R, ready: blue.length >= 2 && red.length >= 2 };
}
