# 📒 Kas Kelas SD

Aplikasi web **PWA mobile-first** untuk pencatatan uang kas kelas SD oleh satu bendahara / wali kelas.

**Demo data: Kelas 4B, SD Negeri 1 Harapan Bangsa — 29 siswa, 12 minggu, berbagai transaksi.**

---

## Fitur Utama

| Fitur | Keterangan |
|---|---|
| 🗂️ Setoran mingguan | 1-tap centang bayar, filter belum bayar, progress bar |
| 💰 Multi-minggu | Bayar N minggu sekaligus, otomatis alokasi tunggakan → lunas di muka |
| 🏖️ Minggu libur | Toggle libur/bebas kas; dilompati otomatis saat bayar di muka |
| 🏫 Siswa pindah masuk | Kewajiban dihitung sejak `joinedWeek`; tidak ada tunggakan masa lalu |
| 🚪 Siswa pindah keluar | Nonaktifkan; data lama tetap; tidak muncul di daftar minggu berjalan |
| ↩️ Reversal / Undo | Un-centang jika salah klik; toast "Urungkan" 6 detik |
| 🧾 Pengeluaran + foto nota | Upload kamera / galeri, thumbnail, pratinjau fullscreen |
| 📊 Rekap & Saldo | Saldo real-time, daftar tunggakan, riwayat opname |
| 🧮 Cash Opname | Hitung per denominasi uang, bandingkan dengan saldo sistem |
| 💬 Salin ke WhatsApp | 1-klik copy ringkasan rapi + emoji untuk WAG paguyuban ortu |
| 🔒 PIN 6 digit | Lock screen, aktifkan/nonaktifkan di Pengaturan |
| 📦 Export / Import JSON | Cadangan lengkap termasuk foto nota; pulihkan kapan saja |
| 📱 PWA | Add to Home Screen, offline-ready, service worker |

---

## Tech Stack

- **React 19 + TypeScript** — UI framework
- **Vite 8 + @vitejs/plugin-react** — bundler & HMR
- **Tailwind CSS 4 + @tailwindcss/vite** — utility-first styling
- **Zustand 5** — state management
- **vite-plugin-pwa 2** — service worker + manifest
- **Lucide React** — icon set
- **IndexedDB** (via native API) — penyimpanan foto nota lokal
- **localStorage** — penyimpanan data kas (JSON)

---

## Cara Pakai (Lokal)

```bash
# Clone & install
git clone https://github.com/favjiw/kas-kelas-sd.git
cd kas-kelas-sd
npm install

# Jalankan dev server
npm run dev
# Buka http://localhost:5173

# Build produksi
npm run build
npm run preview
```

Aplikasi akan memuat **data contoh realistis** (Kelas 4B, 29 siswa, 12 minggu) secara otomatis pada pertama kali dibuka. Reset ke data kosong lewat **Pengaturan → Cadangan & Reset**.

---

## Deploy ke GitHub Pages

```bash
BASE_PATH=/kas-kelas-sd/ npm run build
# Upload folder dist/ ke gh-pages branch
```

Atau deploy 1-klik ke **Vercel** / **Cloudflare Pages** — cukup hubungkan repo, build command `npm run build`, output dir `dist`.

---

## Supabase / Backend (Opsional)

File `supabase_schema.sql` di root repo berisi skema PostgreSQL lengkap bila ingin menghubungkan ke Supabase di kemudian hari:

- Tabel: `settings`, `students`, `weeks`, `payments`, `expenses`, `receipts`, `opnames`
- View: `week_summary`, `arrears`
- RLS siap diaktifkan

Data lokal (localStorage + IndexedDB) tetap berfungsi 100% tanpa backend.

---

## Struktur Folder

```
src/
├── lib/
│   ├── types.ts       # TypeScript interfaces & enums
│   ├── format.ts      # Formatter tanggal, rupiah, uid
│   ├── calc.ts        # Kalkulasi kas: tunggakan, opname, stats
│   ├── seed.ts        # Data contoh Kelas 4B
│   ├── receipts.ts    # IndexedDB helper foto nota
│   ├── store.ts       # Zustand state management
│   └── wa.ts          # Pembuat ringkasan WhatsApp
├── components/
│   ├── ui.tsx         # Sheet, Toaster, Button, Card, Header, dll.
│   └── Lock.tsx       # PinPad & LockScreen
├── tabs/
│   ├── SetoranTab.tsx
│   ├── PengeluaranTab.tsx
│   ├── RekapTab.tsx
│   └── PengaturanTab.tsx
├── App.tsx            # 4 bottom-tabs navigation
├── main.tsx           # Entry point + service worker register
└── index.css          # Tailwind + animasi sheet/toast
public/
├── favicon.svg
├── pwa-192x192.png
├── pwa-512x512.png
├── pwa-maskable-512x512.png
└── apple-touch-icon.png
supabase_schema.sql    # Skema PostgreSQL (opsional backend)
```

---

## Lisensi

MIT — bebas digunakan dan dimodifikasi untuk keperluan sekolah / pribadi.
