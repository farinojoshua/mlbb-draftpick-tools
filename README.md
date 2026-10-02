# MLBB Draft Assistant

Simulasi draft pick Mobile Legends (ban + pick snake 1-2-2-2-2-1) dengan saran pick/ban, counter,
skor draft, dan saran build & spell berdasarkan komposisi lawan. Web statis, tanpa build step.

## Menjalankan

```bash
python -m http.server 5173
```

Buka http://localhost:5173

## Memperbarui data meta

```bash
python tools/update_data.py
```

Mengambil tier, win/pick/ban rate, matchup, sinergi, build, dan ikon dari mlbbhub.com ke `meta-data.js`
(file digenerate, jangan edit manual). Atribut hero yang dikurasi manual (role, lane, tag kemampuan)
ada di `data.js`.

## Catatan
- Saran bersifat heuristik, bukan prediksi pasti. Counter berbasis kemampuan (`lock`, `shred`) dan alternatif spell dikurasi manual.
- Ikon hero di-hotlink dari CDN resmi game (aset milik Moonton); data statistik berasal dari mlbbhub.com.
