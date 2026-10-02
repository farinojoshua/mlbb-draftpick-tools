const $ = (id) => document.getElementById(id);
const other = (t) => (t === "B" ? "R" : "B");
const TEAM_NAME = { B: "BLUE", R: "RED" };
const ROLE_COLOR = { T: "#4f8cff", F: "#f08a3c", A: "#c04bd6", M: "#2fc5c5", K: "#e5c13a", S: "#4cc46a" };
const TURN_SECONDS = 30;

let state = { steps: [], picks: [] }; // picks[i] = hero untuk steps[i]
let roleFilter = "ALL";
let sel = null;          // hero yang sedang di-preview (belum dikunci)
let ranked = new Map();  // nama hero -> peringkat saran (1-based), untuk badge di grid
let timeLeft = TURN_SECONDS;

const cur = () => state.steps[state.picks.length];
const taken = () => new Set(state.picks);
const entries = () => state.picks.map((h, i) => ({ h, s: state.steps[i] }));
const teamPicks = (t) => entries().filter((x) => x.s.type === "pick" && x.s.team === t).map((x) => x.h);
const teamBans = (t) => entries().filter((x) => x.s.type === "ban" && x.s.team === t).map((x) => x.h);
const bannedSet = () => new Set(entries().filter((x) => x.s.type === "ban").map((x) => x.h));

function buildSteps() {
  const nb = +$("banCount").value, first = $("firstPick").value, second = other(first);
  const steps = [];
  for (let i = 0; i < nb; i++) steps.push({ type: "ban", team: first }, { type: "ban", team: second });
  // urutan pick MLBB: 1-2-2-2-2-1
  [first, second, second, first, first, second, second, first, first, second].forEach((team) => steps.push({ type: "pick", team }));
  return steps;
}

// Gambar hero + fallback inisial (dipakai di grid, slot, ban, saran)
function art(name, cls = "") {
  const h = HERO[name];
  const initials = name.split(/[ .-]/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const src = HERO_IMG[name] ? IMG_BASE + HERO_IMG[name] : "";
  return `<span class="art ${cls}" style="--c:${ROLE_COLOR[h.roles[0]]}"><b>${initials}</b>${src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`;
}

function resetTimer() { timeLeft = TURN_SECONDS; renderTimer(); }
function renderTimer() {
  const t = $("timer");
  t.textContent = cur() ? timeLeft : "—";
  t.classList.toggle("low", !!cur() && timeLeft <= 5);
}
setInterval(() => { if (cur() && timeLeft > 0) { timeLeft--; renderTimer(); } }, 1000);

function renderBans(team) {
  const bans = teamBans(team), c = cur(), nb = +$("banCount").value;
  let html = "";
  for (let i = 0; i < nb; i++) {
    const active = c && c.type === "ban" && c.team === team && i === bans.length;
    const ghost = active && sel ? art(sel, "ghost") : "";
    html += `<div class="ban ${active ? "active" : ""}">${bans[i] ? art(bans[i]) + '<i class="x"></i>' : ghost}</div>`;
  }
  $("bans" + team).innerHTML = html;
}

function renderCol(team) {
  const picks = teamPicks(team), c = cur(), { assign } = bestLanes(picks);
  let html = "";
  for (let i = 0; i < 5; i++) {
    const p = picks[i];
    const active = c && c.type === "pick" && c.team === team && i === picks.length;
    const lane = p && assign[i] ? LANE_NAME[assign[i]] : "";
    const body = p
      ? `${art(p)}<span class="sname"><b>${p}</b><em>${lane}</em></span>`
      : active && sel
        ? `${art(sel, "ghost")}<span class="sname"><b>${sel}</b><em>Preview</em></span>`
        : `<span class="sname"><b class="pl">Player ${i + 1}</b>${active ? "<em>Memilih…</em>" : ""}</span>`;
    html += `<div class="slot ${p ? "filled" : ""} ${active ? "active" : ""}">${body}</div>`;
  }
  $("col" + team).innerHTML = html;
}

function renderPhase() {
  const c = cur(), me = $("mySide").value;
  const lab = $("phaseLabel");
  if (!c) { lab.className = "phase-label done"; lab.innerHTML = "DRAFT SELESAI"; return; }
  lab.className = "phase-label " + (c.team === "B" ? "blue" : "red");
  // Mythic+ ban dalam 2 gelombang: 3 ban per tim, lalu 2 ban per tim
  const wave = c.type === "ban" && +$("banCount").value === 5 ? ` · GELOMBANG ${state.picks.length < 6 ? 1 : 2}` : "";
  lab.innerHTML = `${c.type === "ban" ? "BAN PHASE" : "PICK PHASE"}<small>${wave ? wave.slice(3) + " · " : ""}${TEAM_NAME[c.team]}${c.team === me ? " (kamu)" : " (lawan)"} · ${state.picks.length + 1}/${state.steps.length}</small>`;
  $("nameB").textContent = "BLUE" + (me === "B" ? " · KAMU" : "");
  $("nameR").textContent = "RED" + (me === "R" ? " · KAMU" : "");
}

function renderGrid() {
  const q = $("search").value.trim().toLowerCase(), bn = bannedSet(), pk = taken(), c = cur();
  const teamOf = {};
  entries().forEach((x) => { if (x.s.type === "pick") teamOf[x.h] = x.s.team; });
  const list = HEROES.filter((h) => (roleFilter === "ALL" || h.roles.includes(roleFilter)) && h.name.toLowerCase().includes(q));
  $("grid").innerHTML = list.map((h) => {
    const n = h.name, banned = bn.has(n), picked = pk.has(n) && !banned;
    const rk = ranked.get(n);
    return `<button class="hero ${banned ? "banned" : ""} ${picked ? "picked p" + teamOf[n] : ""} ${sel === n ? "sel" : ""}" data-n="${n}" ${pk.has(n) || !c ? "disabled" : ""}>
      ${art(n)}${rk ? `<i class="star">★${rk}</i>` : ""}<span class="hn">${n}</span></button>`;
  }).join("");
}

function renderPreview() {
  const c = cur(), btn = $("confirm"), box = $("preview");
  if (!sel) {
    box.innerHTML = '<span class="hint">Pilih hero atau klik saran di bawah</span>';
  } else {
    const h = HERO[sel];
    const fmt = (l) => l.slice(0, 5).map(([n, d]) => `${n} +${d}`).join(", ") || "—";
    const strong = MU(sel).vs, weak = MU(sel).by;
    box.innerHTML = `${art(sel)}<div class="pi"><b>${sel}</b> <span class="tier t${h.tier}">${h.tier}</span>
      <small>${h.roles.map((r) => ROLE_NAME[r]).join("/")} · ${h.lanes.map((l) => LANE_NAME[l]).join("/")} · WR ${h.wr}%${h.ban ? ` · Ban ${h.ban}%` : ""}</small>
      <small class="cn">Kuat lawan: <span>${fmt(strong)}</span></small>
      <small class="cn">Lemah vs: <span class="r">${fmt(weak)}</span></small></div>`;
  }
  btn.disabled = !c || !sel;
  btn.className = "confirm " + (c ? (c.team === "B" ? "blue" : "red") : "");
  btn.textContent = !c ? "SELESAI" : c.type === "ban" ? "BAN" : "PICK";
}

function chip(text, cls) { return `<span class="chip ${cls}">${text}</span>`; }

function counterBias() {
  const enemyN = teamPicks(other(cur() ? cur().team : "B")).length;
  if ($("biasAuto").checked) {
    const b = Math.min(0.9, 0.4 + 0.12 * enemyN);
    $("bias").value = Math.round(b * 100);
    return b;
  }
  return $("bias").value / 100;
}

function sugCard(r, i, nm) {
  return `<button class="sug ${nm ? "nm" : ""} ${sel === r.hero.name ? "on" : ""}" data-n="${r.hero.name}">
    <span class="rk">${nm ? "★" : i + 1}</span>${art(r.hero.name)}
    <span class="si">${nm ? '<span class="badge">COUNTER NON-META</span>' : ""}<b>${r.hero.name}</b><small>${r.hero.lanes.map((l) => LANE_NAME[l]).join("/")} · ${r.hero.wr}% · tier ${r.hero.tier}</small>
    <span class="chips">${r.why.map((w) => chip(w, "good")).join("")}${r.bad.map((w) => chip(w, "bad")).join("")}</span></span>
  </button>`;
}

function renderDock() {
  const c = cur(), box = $("dockSug");
  ranked = new Map();
  if (!c) { box.innerHTML = '<p class="hint">Draft selesai. Lihat tab Analisa tim.</p>'; return; }
  const mine = teamPicks(c.team), enemy = teamPicks(other(c.team)), un = taken();
  const isBan = c.type === "ban";
  $("dockCtl").style.visibility = isBan ? "hidden" : "visible";
  const res = isBan
    ? suggestBans({ mine, enemy, unavailable: un })
    : suggestPicks({ mine, enemy, unavailable: un, slotsLeft: 5 - mine.length, counterBias: counterBias() });
  $("dtSug").textContent = `Suggestion ${isBan ? "BAN" : "PICK"} · ${TEAM_NAME[c.team]}`;
  res.slice(0, 5).forEach((r, i) => ranked.set(r.hero.name, i + 1));
  const top = res.slice(0, 5);
  const extra = isBan || !enemy.length ? [] : nonMetaCounters(res).filter((r) => !top.includes(r));
  const tips = isBan ? [] : [positionTip(mine.length, enemy.length), ...strategyTips(enemy)].filter(Boolean);
  $("dockTips").innerHTML = tips.map((t) => `<span>💡 ${t}</span>`).join("");
  box.innerHTML = extra.map((r) => sugCard(r, 0, true)).join("") + top.map((r, i) => sugCard(r, i, false)).join("");
}

function renderAnalysis() {
  $("dockAn").innerHTML = ["B", "R"].map((team) => {
    const names = teamPicks(team);
    if (!names.length) return `<div class="an ${team}"><b>${TEAM_NAME[team]}</b><p class="hint">Belum ada pick.</p></div>`;
    const p = teamProfile(names), warn = [];
    if (names.length >= 3 && p.tank === 0) warn.push("Tidak ada frontline/engage");
    if (names.length >= 3 && p.cc < 2) warn.push("CC kurang");
    if (names.length >= 3 && p.magic === 0) warn.push("Tidak ada magic damage");
    if (names.length >= 3 && p.phys === 0) warn.push("Tidak ada physical damage");
    if (names.length === 5 && p.late === 0) warn.push("Kurang scaling late game");
    return `<div class="an ${team}"><b>${TEAM_NAME[team]}</b>
      <div class="stats"><span>Physical <i>${p.phys}</i></span><span>Magic <i>${p.magic}</i></span><span>CC <i>${p.cc}</i></span><span>Frontline <i>${p.tank}</i></span><span>Burst <i>${p.burst}</i></span><span>Late <i>${p.late}</i></span></div>
      <div class="chips">${p.missing.length ? chip("Perlu lane: " + p.missing.map((l) => LANE_NAME[l]).join(", "), "warn") : chip("Semua lane terisi", "good")}${warn.map((w) => chip(w, "bad")).join("")}</div></div>`;
  }).join("");
}

function renderScore() {
  const ev = draftEval(teamPicks("B"), teamPicks("R"));
  const bar = $("scorebar");
  if (!ev.ready) { bar.innerHTML = '<span class="sc-note">Skor draft muncul setelah tiap tim punya minimal 2 pick</span>'; return; }
  const b = Math.round(ev.pB * 100), f = (x) => x.toFixed(1);
  const row = (t) => `Meta ${f(t.meta)} · Matchup ${f(t.matchup)} · Komposisi ${f(t.comp)} · Sinergi ${f(t.syn)}`;
  bar.title = `Blue: ${row(ev.B)}
Red: ${row(ev.R)}`;
  bar.innerHTML = `<b class="sc-b">${b}%</b><span class="sc-track"><i style="width:${b}%"></i></span><b class="sc-r">${100 - b}%</b>
    <span class="sc-note">Estimasi heuristik (meta + matchup + komposisi + sinergi), bukan prediksi pasti</span>`;
}

function renderBuilds() {
  const mine = $("bdTeam").value === "me" ? $("mySide").value : other($("mySide").value);
  const picks = teamPicks(mine), enemy = teamPicks(other(mine)), { assign } = bestLanes(picks);
  if (!picks.length) { $("dockBd").innerHTML = '<p class="hint">Belum ada pick di tim ini.</p>'; return; }
  $("dockBd").innerHTML = picks.map((name, i) => {
    const a = buildAdvice(HERO[name], assign[i], enemy);
    const head = `<div class="bh">${art(name)}<div><b>${name}</b><small>${assign[i] ? LANE_NAME[assign[i]] : "lane belum jelas"}</small></div></div>`;
    if (!a) return `<div class="bcard">${head}<p class="hint">Data build tidak tersedia.</p></div>`;
    const b = a.build, core = new Set(b.core);
    const items = b.items.map((it, k) => `<span class="it ${core.has(it) ? "core" : ""}"><i>${k + 1}</i>${it}</span>`).join("");
    const swaps = a.swaps.map((x) => `<li title="${x.source.replace(/"/g, "&quot;")}"><b>${x.replace}</b> → <b>${x.item}</b><small>${x.reasons.join(", ")}</small></li>`).join("");
    return `<div class="bcard">${head}
      <div class="bn">${b.name}${a.laneMatch ? "" : ' <em>(build lane lain)</em>'}</div>
      <div class="items">${items}</div>
      <div class="row"><span class="k">Spell</span><span class="sp">${b.spell}</span>${a.alt ? `<span class="alt" title="${a.alt.why}">atau ${a.alt.name}</span>` : ""}</div>
      ${a.alt ? `<small class="why">${a.alt.name}: ${a.alt.why}</small>` : ""}
      <div class="row"><span class="k">Emblem</span><span>${b.emblem || "—"}${b.talents.length ? " · " + b.talents.join(", ") : ""}</span></div>
      ${b.blessing ? `<div class="row"><span class="k">Blessing</span><span>${b.blessing}</span></div>` : ""}
      ${swaps ? `<div class="k">Ganti item vs lawan</div><ul class="swaps">${swaps}</ul>` : `<small class="why">${a.hasEnemyInfo ? "Tidak ada penyesuaian khusus vs lawan ini." : "Menunggu pick lawan untuk saran situasional."}</small>`}
      ${a.stale ? `<small class="stale">Build ditinjau untuk patch ${a.patch}, belum untuk patch sekarang.</small>` : ""}
    </div>`;
  }).join("");
}

function render() {
  renderBuilds();
  renderScore();
  renderPhase(); renderBans("B"); renderBans("R"); renderCol("B"); renderCol("R");
  renderDock(); renderGrid(); renderPreview(); renderAnalysis(); renderTimer();
}

function preview(name) {
  if (!cur() || taken().has(name)) return;
  sel = name;
  render();
}
function lock() {
  if (!cur() || !sel || taken().has(sel)) return;
  state.picks.push(sel);
  sel = null;
  resetTimer();
  render();
}
function reset() { state = { steps: buildSteps(), picks: [] }; sel = null; resetTimer(); render(); }

function init() {
  $("metaInfo").textContent = `Meta patch ${META_INFO.patch} · ${META_INFO.date} · ${META_INFO.source}`;
  $("roleFilters").innerHTML = ["ALL", ...Object.keys(ROLE_NAME)].map((r) =>
    `<button class="rf ${r === "ALL" ? "on" : ""}" data-r="${r}">${r === "ALL" ? "Semua" : ROLE_NAME[r]}</button>`).join("");
  $("roleFilters").onclick = (e) => {
    const r = e.target.dataset.r; if (!r) return;
    roleFilter = r;
    document.querySelectorAll(".rf").forEach((b) => b.classList.toggle("on", b.dataset.r === r));
    renderGrid();
  };
  $("grid").onclick = (e) => { const b = e.target.closest(".hero"); if (b) preview(b.dataset.n); };
  $("grid").ondblclick = (e) => { const b = e.target.closest(".hero"); if (b) { preview(b.dataset.n); lock(); } };
  $("dockSug").onclick = (e) => { const b = e.target.closest(".sug"); if (b) preview(b.dataset.n); };
  $("confirm").onclick = lock;
  $("search").oninput = renderGrid;
  $("bias").oninput = () => { $("biasAuto").checked = false; render(); };
  $("biasAuto").onchange = render;
  $("bdTeam").onchange = renderBuilds;
  $("undo").onclick = () => { state.picks.pop(); sel = null; resetTimer(); render(); };
  $("reset").onclick = reset;
  ["firstPick", "banCount"].forEach((id) => ($(id).onchange = reset));
  $("mySide").onchange = render;
  document.querySelectorAll(".dt").forEach((b) => (b.onclick = () => {
    document.querySelectorAll(".dt").forEach((x) => x.classList.toggle("on", x === b));
    $("dockSug").hidden = b.dataset.d !== "sug";
    $("dockCtl").hidden = b.dataset.d !== "sug";
    $("dockTips").hidden = b.dataset.d !== "sug";
    $("dockBd").hidden = $("dockBdCtl").hidden = b.dataset.d !== "bd";
    $("dockAn").hidden = b.dataset.d !== "an";
  }));
  reset();
}
init();
