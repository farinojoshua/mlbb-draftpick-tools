#!/usr/bin/env python3
"""Perbarui data meta dari mlbbhub.com -> meta-data.js

Jalankan dari folder project:   python tools/update_data.py

Yang diperbarui otomatis: tier, win/pick/ban rate, matchup ranked, sinergi, ikon hero, info patch.
Yang TIDAK diubah: role/lane/tag kemampuan di data.js (dikurasi manual). Hero baru yang belum ada
di data.js tetap muncul di aplikasi dengan tag kosong, dan skrip ini mencetak peringatannya.

Memakai curl (bukan urllib) supaya verifikasi sertifikat SSL memakai penyimpanan sistem.
Satu request per hero dengan jeda, jadi sekitar 1-2 menit.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://mlbbhub.com"
DELAY = 0.6
DEC = json.JSONDecoder()


def fetch(url):
    r = subprocess.run(["curl", "-sL", "-m", "40", "-A", "Mozilla/5.0", url], capture_output=True)
    if r.returncode != 0 or not r.stdout:
        raise RuntimeError(f"gagal fetch {url} (curl exit {r.returncode})")
    return r.stdout.decode("utf8").replace('\\"', '"')


def after(html, key):
    i = html.find(key)
    if i < 0:
        raise RuntimeError(f"tidak menemukan {key}")
    return DEC.raw_decode(html[i + len(key):])[0]


def slim_build(b):
    """Ringkas satu build: hanya nama, tanpa statistik dan ikon."""
    nm = lambda x: (x or {}).get("name")
    emblem = b.get("emblem") or {}
    return {
        "name": b.get("name"), "role": b.get("roleContext"),
        "items": [nm(i) for i in b.get("items", [])],
        "core": [nm(i) for i in b.get("coreItems", [])],
        "emblem": nm(emblem), "talents": [nm(t) for t in emblem.get("talents", [])],
        "spell": nm(b.get("spell")), "blessing": nm(b.get("blessing")),
        "flex": [{"item": nm(f.get("item")), "replace": nm(f.get("replace")), "why": f.get("trigger", "")}
                 for f in b.get("flexItems", []) if f.get("item")],
        "notes": b.get("notes", ""),
    }


def main():
    tier_html = fetch(BASE + "/tier-list")
    tiers = after(tier_html, '"initialTierList":')
    patch = (re.search(r"Patch ([\d.]+)", tier_html) or [None, "?"])[1]
    season = (re.search(r"Season (\d+)", tier_html) or [None, "?"])[1]

    stats, slugs = {}, {}
    for tier, heroes in tiers.items():
        for h in heroes:
            n = h["heroName"]
            stats[n] = {
                "tier": h["tier"], "wr": round(h["winRate"], 2), "pick": round(h["pickRate"], 2),
                "ban": round(h["banRate"], 2), "role": h["role"], "lane": h["lane"],
            }
            slugs[n] = h["heroSlug"]
    img = {h["heroName"]: h["portrait"] for hs in tiers.values() for h in hs}
    print(f"{len(stats)} hero, patch {patch}, season {season}")

    matchups, synergy, builds, fail = {}, {}, {}, []
    for i, (name, slug) in enumerate(slugs.items(), 1):
        try:
            html = fetch(f"{BASE}/heroes/{slug}")
            d = after(html, '"counterData":')
            matchups[name] = {
                "by": [[x["heroName"], round(x["advantagePp"], 1)] for x in d.get("countersThisHero", [])],
                "vs": [[x["heroName"], round(x["advantagePp"], 1)] for x in d.get("thisHeroCounters", [])],
            }
            cb = after(html, '"curatedBuilds":')
            builds[name] = {
                "patch": cb.get("patch"), "reviewed": cb.get("lastReviewed"), "stale": bool(cb.get("stalePatch")),
                "builds": [slim_build(b) for b in cb.get("builds", [])],
            }
            j = html.find('"synergies":[')
            synergy[name] = [[x["heroName"], x["synergyScore"]] for x in DEC.raw_decode(html[j + 12:])[0]] if j >= 0 else []
        except Exception as e:  # satu hero gagal tidak boleh membatalkan semuanya
            fail.append((name, str(e)[:80]))
        if i % 20 == 0:
            print(f"  {i}/{len(slugs)}", flush=True)
        time.sleep(DELAY)

    if fail:
        print("GAGAL:", fail)
    if len(matchups) < len(stats) * 0.9:
        sys.exit("Terlalu banyak hero gagal, file TIDAK ditimpa.")

    out = [
        "// DIGENERATE oleh tools/update_data.py - jangan edit manual.",
        f"const META_INFO = {json.dumps({'patch': f'{patch} (Season {season})', 'date': time.strftime('%d %b %Y'), 'source': 'mlbbhub.com'}, ensure_ascii=False)};",
        "// tier, win/pick/ban rate (%), role & lane versi mlbbhub",
        f"const META_STATS = {json.dumps(stats, ensure_ascii=False, separators=(',', ':'))};",
        "// MATCHUPS[X].by = hero yang menang lawan X; .vs = hero yang X menangkan. Angka = selisih win rate (poin persen).",
        f"const MATCHUPS = {json.dumps(matchups, ensure_ascii=False, separators=(',', ':'))};",
        "// Partner resmi dari Moonton (bukan hasil pengukuran ranked), skor 1-10.",
        f"const SYNERGY = {json.dumps(synergy, ensure_ascii=False, separators=(',', ':'))};",
        "// Build, spell, emblem, dan item situasional per hero (curated mlbbhub; 'stale' = belum direview untuk patch sekarang).",
        f"const BUILDS = {json.dumps(builds, ensure_ascii=False, separators=(',', ':'))};",
        "// Ikon hero: hotlink ke CDN resmi game (aset Moonton), fallback ke inisial kalau gagal dimuat.",
        "const IMG_BASE = '';",
        f"const HERO_IMG = {json.dumps(img, ensure_ascii=False, separators=(',', ':'))};",
    ]
    target = ROOT / "meta-data.js"
    tmp = target.with_suffix(".js.tmp")
    tmp.write_text("\n".join(out) + "\n", encoding="utf8")
    tmp.replace(target)  # atomik: file lama tetap utuh kalau proses mati di tengah

    known = set(re.findall(r"^([^|\n/][^|\n]*)\|[A-Z,]+\|[A-Z,]+\|", (ROOT / "data.js").read_text(encoding="utf8"), re.M))
    new = sorted(set(stats) - known)
    gone = sorted(known - set(stats))
    if new:
        print("HERO BARU (belum ada di data.js, tag kemampuan kosong):", ", ".join(new))
    if gone:
        print("Hero ada di data.js tapi tidak ada di sumber:", ", ".join(gone))
    print("Selesai ->", ROOT / "meta-data.js")


if __name__ == "__main__":
    main()
