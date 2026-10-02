// Atribut hero yang dikurasi manual (role, lane, damage, tag kemampuan, counter manual).
// Tier, win/ban rate, matchup, sinergi, ikon ada di meta-data.js (digenerate: python tools/update_data.py).
// tier & wr di baris di bawah hanya cadangan kalau hero belum ada di meta-data.js.
//
// Format: Nama|role|lane|tier|winrate|damage|tag
//   role : T=Tank F=Fighter A=Assassin M=Mage K=Marksman S=Support
//   lane : R=Roam J=Jungle G=Gold E=EXP D=Mid
//   damage: P=physical M=magic X=campuran
//   tag  : cc eng(engage) poke bur(burst) sus(sustain) shl(shield/peel) push mob late early

const RAW_HEROES = `
Rafaela|S|R|S|59.4|M|cc,sus,shl
Aulus|F|E,J|S|59.0|P|sus,mob,early
Masha|T,F|E,J|S|58.8|P|sus,mob,early
Marcel|S|R|S|58.4|M|cc,eng,shl
Argus|F|E|S|55.4|P|sus,mob,late
Minotaur|T,S|R|S|55.1|P|cc,eng
Khufra|T|R|S|54.7|P|cc,eng,mob
Floryn|S|R|S|54.5|M|sus,shl,late
Hirara|A|J|S|54.0|P|bur,mob,early
Gloo|T|R|S|54.0|M|cc,eng,shl
Obsidia|K|G|S|53.7|P|late,sus
Carmilla|T|R|S|53.7|M|cc,eng,shl
Lukas|F|E|S|53.5|P|sus,mob
Estes|S|R|S|53.3|M|sus,shl,late
Lolita|T|R|A|54.1|M|cc,shl,eng
Popol and Kupa|S,K|G,R|A|53.8|P|cc,poke
Diggie|S|R|A|53.8|M|cc,shl
Bruno|K|G|A|53.5|P|bur,early
Valir|M|D|A|53.0|M|cc,poke,push
Gord|M|D|A|52.9|M|cc,poke,bur
Ling|A|J|A|52.9|P|mob,bur,late
Benedetta|F|E|A|52.7|P|mob,bur
Edith|T|R,E|A|52.7|X|cc,eng,shl
Yve|M|D|A|52.7|M|cc,poke,push
Belerick|T|R,E|A|52.4|M|cc,eng
Irithel|K|G|A|52.4|P|late,push
Kagura|M|D|A|52.4|M|bur,mob,cc
Sun|F|E,J|A|52.3|P|push,sus
Zhask|M|D|A|52.1|M|push,poke
Atlas|T|R|A|52.0|M|cc,eng
Barats|F|E|A|51.8|P|cc,sus,early
Hanabi|K|G|A|51.8|P|late,sus,push
Beatrix|K|G|A|51.7|P|poke,late
Kadita|M|D|A|51.5|M|cc,bur,mob
Guinevere|F|E,J|A|51.4|M|cc,bur,mob
Eudora|M|D|A|51.3|M|bur,poke
Zetian|M|D|A|51.0|M|poke,cc,push
Faramis|S|R|B|51.7|M|sus,late
Fredrinn|F|E,J|B|51.4|P|sus,eng,cc
Clint|K|G|B|51.3|P|poke,early
Natan|K|G|B|51.2|M|late,poke
Cyclops|M|D|B|51.0|M|cc,bur
Minsitthar|F|E,R|B|50.9|P|cc,eng
Khaleed|F|E|B|50.9|P|cc,mob
Bane|F|E|B|50.9|P|push,poke
Cecilion|M|D|B|50.9|M|late,poke
Natalia|A|J|B|50.9|P|bur,mob
Aldous|F|E|B|50.8|P|late,mob
Alice|F,M|D,E|B|50.6|M|sus,cc
Moskov|K|G|B|50.6|P|push,late
Terizla|F|E|B|50.6|P|cc,eng
Silvanna|F|E,J|B|50.5|M|cc,bur
Brody|K|G|B|50.5|P|bur,poke
Leomord|F|J,E|B|50.5|P|mob,bur
Paquito|F|E|B|50.4|P|bur,mob
Yi Sun-shin|K,A|J|B|50.2|P|mob,bur
Hilda|F|E|B|50.2|P|sus,push
Badang|F|E|B|50.1|P|cc,bur
Novaria|M|D|B|50.1|M|poke,mob
Zhuxin|M|D|B|50.1|M|poke,cc
Xavier|M|D|B|50.0|M|poke,late
Akai|T|R|B|49.9|P|cc,eng
Julian|A|E,J|B|49.9|X|bur,mob
Kaja|S|R,J|B|49.9|P|cc,eng
Suyou|A|J|B|49.8|P|bur,mob
Ixia|K|G|B|49.8|P|late,push
X.Borg|F|E|B|49.7|M|sus,push
Hanzo|A|J|B|49.7|P|bur,mob
Vale|M|D|B|49.7|M|cc,bur
Aamon|A|J|B|49.6|M|bur,mob
Lylia|M|D|B|49.6|M|bur,mob
Sora|M|D|B|49.6|M|poke,push
Ruby|S|R,E|B|49.5|P|cc,sus
Odette|M|D|B|49.5|M|cc,bur
Angela|S|R|B|49.4|M|shl,sus
Selena|A|J,R|B|49.4|M|cc,bur,mob
Yu Zhong|F|E|B|49.3|P|cc,eng
Miya|K|G|B|49.2|P|late,push
Vexana|M|D|B|49.1|M|cc,bur
Nolan|K|G|B|49.1|P|bur,mob
Saber|A|J|B|48.9|P|cc,bur
Lesley|K|G|B|48.2|P|bur,poke
Uranus|T|E,R|C|49.5|M|sus,shl
Roger|F|J,E|C|49.3|P|mob,bur
Lunox|M|D|C|49.2|M|bur,sus
Joy|S|R,J|C|49.2|M|mob,cc
Cici|F|E|C|49.1|P|sus,mob
Claude|K|G,J|C|49.0|P|mob,late
Lapu-Lapu|F|E|C|48.8|P|cc,sus
Wanwan|K|G|C|48.6|P|late,mob
Kimmy|K|G|C|48.6|M|poke,mob
Layla|K|G|C|48.6|P|poke,late
Karrie|K|G|C|48.5|X|late,push
Melissa|K|G|C|48.5|P|late
Hayabusa|A|J|C|48.3|P|bur,mob
Yin|F,A|J,E|C|48.3|P|cc,bur
Aurora|M|D|C|48.3|M|cc,bur
Thamuz|F|E|C|48.3|P|sus,mob
Gusion|A|J|C|48.2|P|bur,mob
Hylos|T|R|C|48.2|M|cc,eng
Alucard|F|E,J|C|48.2|P|sus,mob
Arlott|F|E|C|48.0|P|cc,eng
Chang'e|M|D|C|47.9|M|push,poke
Luo Yi|M|D|C|47.9|M|cc,poke
Harley|M,A|D,J|C|47.8|M|bur,mob
Phoveus|F|E|C|47.8|P|cc,mob
Johnson|S,T|R|C|47.6|M|cc,eng
Esmeralda|T|E|C|47.6|M|sus,shl
Freya|F|E|C|47.6|P|sus,eng
Karina|A|J|C|47.5|M|bur,mob
Alpha|F|E,J|C|47.4|P|sus,early
Dyrroth|F|E|C|47.3|P|bur,sus
Pharsa|M|D|C|47.2|M|poke,cc
Grock|T|R,E|C|47.1|M|cc,eng
Helcurt|A|J|C|47.0|P|bur,early
Nana|S|R,D|C|46.8|M|cc,mob
Martis|F|E,J|C|46.8|P|cc,eng
Chip|S,K|R|D|47.3|P|cc,mob
Baxia|T|R|D|47.1|M|cc,eng
Harith|M|D,E|D|46.9|M|mob,bur
Jawhead|T|R|D|46.8|P|cc,eng
Mathilda|S|R|D|45.8|M|cc,eng,mob
Balmond|F|E,J|D|45.7|P|sus
Valentina|M|D|D|45.5|M|bur
Chou|F|R,E|D|45.2|P|cc,mob
Zilong|F|E|D|45.0|P|push,mob
Kalea|S|R|D|44.7|M|cc,sus
Gatotkaca|T|R,E|D|44.2|P|cc,eng
Tigreal|T|R|D|44.0|P|cc,eng
Granger|K|G|D|43.6|P|bur,mob
Lancelot|A|J|D|43.2|P|bur,mob
Fanny|A|J|D|42.9|P|bur,mob
Franco|S,T|R|D|41.5|P|cc,eng
`;


// COUNTERS[X] = hero yang bagus untuk melawan X (X kalah / sulit melawan mereka)
const TANK_SHRED = ["Aulus", "Masha", "Argus"];
const COUNTERS = {
  Gusion: ["Khufra", "Gloo", "Atlas", "Tigreal", "Kaja"],
  Lancelot: ["Khufra", "Gloo", "Kaja", "Tigreal"],
  Fanny: ["Khufra", "Tigreal", "Gloo", "Vexana"],
  Hayabusa: ["Khufra", "Atlas", "Kaja", "Lolita"],
  Ling: ["Khufra", "Gloo", "Atlas", "Lolita"],
  Hirara: ["Khufra", "Gloo", "Carmilla", "Atlas"],
  Karina: ["Khufra", "Gloo", "Lolita"],
  Selena: ["Khufra", "Atlas", "Vexana", "Lolita"],
  Aamon: ["Khufra", "Gloo"],
  Natalia: ["Khufra", "Gloo", "Atlas", "Vexana", "Lolita"],
  Hanzo: ["Khufra", "Atlas", "Lolita"],
  Joy: ["Khufra", "Gloo", "Atlas"],
  Helcurt: ["Gloo", "Atlas"],
  Saber: ["Khufra", "Gloo", "Atlas"],
  Suyou: ["Khufra", "Gloo", "Atlas"],
  "Yi Sun-shin": ["Khufra", "Gloo"],
  Layla: ["Hirara", "Ling", "Fanny", "Gusion"],
  Granger: ["Hirara", "Karina", "Fanny", "Gusion"],
  Kimmy: ["Hirara", "Ling", "Natalia"],
  Karrie: ["Chou", "Martis", "Atlas", "Lolita"],
  Wanwan: ["Gusion", "Karina", "Hirara", "Natalia"],
  Hanabi: ["Hirara", "Fanny", "Ling", "Natalia", "Lancelot"],
  Beatrix: ["Ling", "Hirara", "Natalia"],
  Claude: ["Ling", "Khufra", "Karina"],
  Moskov: ["Ling", "Hirara", "Karina"],
  Miya: ["Hirara", "Ling", "Lancelot"],
  Irithel: ["Hirara", "Ling", "Khufra"],
  Melissa: ["Ling", "Hirara", "Natalia"],
  Bruno: ["Khufra", "Ling", "Gloo", "Lolita"],
  Obsidia: ["Hirara", "Ling", "Natalia"],
  Brody: ["Hirara", "Ling"],
  Clint: ["Hirara", "Ling", "Khufra"],
  Lesley: ["Hirara", "Fanny"],
  Natan: ["Hirara", "Ling", "Karina"],
  Ixia: ["Hirara", "Ling"],
  Nolan: ["Khufra", "Gloo"],
  "Popol and Kupa": ["Hirara", "Ling", "Natalia"],
  Lunox: ["Vexana", "Cyclops", "Eudora", "Natalia"],
  Eudora: ["Khufra", "Gloo", "Lolita", "Kagura", "Natalia"],
  Kagura: ["Khufra", "Gloo", "Natalia", "Lolita", "Eudora"],
  Pharsa: ["Hirara", "Ling", "Lancelot"],
  Cecilion: ["Hirara", "Ling", "Fanny"],
  Gord: ["Lancelot", "Hirara", "Ling", "Natalia", "Khufra"],
  Valir: ["Ling", "Hirara"],
  Yve: ["Hirara", "Ling", "Natalia"],
  Zhask: ["Ling", "Hirara", "Khufra"],
  Xavier: ["Hirara", "Ling"],
  Vexana: ["Hirara", "Ling", "Khufra"],
  Odette: ["Hirara", "Khufra"],
  Aurora: ["Hirara", "Khufra"],
  Zetian: ["Hirara", "Ling", "Khufra"],
  Kadita: ["Khufra", "Gloo", "Vexana"],
  Valentina: ["Natalia", "Karina", "Hirara"],
  Faramis: ["Hirara", "Ling"],
  Estes: ["Hirara", "Ling", "Natalia"],
  Angela: ["Hirara", "Ling", "Natalia"],
  Rafaela: ["Hirara", "Ling", "Natalia"],
  Floryn: ["Hirara", "Ling"],
  Ruby: ["Hirara", "Ling", "Natalia"],
  Marcel: ["Hirara", "Ling", "Natalia"],
  Diggie: ["Hirara", "Ling"],
  Alucard: ["Atlas", "Tigreal", "Khufra"],
  Zilong: ["Khufra", "Atlas", "Gloo"],
  Aldous: ["Khufra", "Gloo", "Kaja"],
  Chou: ["Khufra", "Gloo", "Tigreal"],
  "Lapu-Lapu": ["Gloo", "Atlas", "Kaja"],
  Paquito: ["Gloo", "Khufra", "Atlas", "Kaja"],
  Benedetta: ["Gloo", "Khufra", "Atlas"],
  Lukas: ["Gloo", "Atlas", "Khufra"],
  Fredrinn: ["Gloo", "Khufra", "Atlas"],
  Phoveus: ["Gloo", "Khufra", "Atlas"],
  Argus: ["Khufra", "Gloo", "Atlas", "Lolita"],
  Aulus: ["Khufra", "Gloo", "Atlas", "Lolita"],
  Masha: ["Gloo", "Khufra", "Kaja", "Tigreal"],
  Sun: ["Khufra", "Gloo", "Atlas"],
  Yin: ["Khufra", "Gloo"],
  Thamuz: ["Khufra", "Gloo"],
  Julian: ["Khufra", "Gloo"],
  Roger: ["Gloo", "Khufra", "Atlas"],
  Arlott: ["Khufra", "Gloo"],
  Martis: ["Gloo", "Atlas"],
  Leomord: ["Khufra", "Gloo", "Atlas"],
  Khufra: ["Gloo", "Minotaur", "Floryn", "Atlas", "Lolita"],
  Gloo: ["Masha", "Aulus", "Argus", "Fredrinn"],
  Minotaur: TANK_SHRED,
  Carmilla: TANK_SHRED,
  Lolita: TANK_SHRED,
  Atlas: TANK_SHRED,
  Edith: ["Aulus", "Masha", "Gloo"],
  Belerick: TANK_SHRED,
  Uranus: TANK_SHRED,
  Grock: TANK_SHRED,
  Gatotkaca: TANK_SHRED,
  Tigreal: TANK_SHRED,
  Franco: TANK_SHRED,
};

// Tag kemampuan tambahan (dikurasi manual dari kit hero):
//   lock  = CC keras yang pasti kena / pick-off (stun, hook, airborne, root) -> counter assassin & hero mobile
//   shred = damage % HP / true damage yang efektif memecah tank
const EXTRA_TAGS = {
  lock: ["Khufra", "Tigreal", "Atlas", "Kaja", "Franco", "Minotaur", "Johnson", "Akai", "Belerick", "Grock", "Hylos", "Edith",
    "Terizla", "Chou", "Martis", "Saber", "Selena", "Cyclops", "Vexana", "Eudora", "Odette", "Aurora", "Kadita", "Gord",
    "Gatotkaca", "Mathilda", "Marcel", "Carmilla", "Gloo", "Lolita", "Popol and Kupa", "Jawhead", "Kalea"],
  shred: ["Karrie", "Aulus", "Argus", "Masha", "Lapu-Lapu", "Bane"],
};
