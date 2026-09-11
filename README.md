# SI-PELAPORAN — Pemkab Trenggalek
### Sistem Informasi Pelaporan Kinerja & Aktivitas ASN

Aplikasi web modern berbasis **Google Apps Script (GAS)**, **Vue 3**, dan **Tailwind CSS** untuk pelaporan kinerja berkala, monitoring target tugas, verifikasi laporan staf, dan analisis capaian unit kerja di lingkungan Pemerintah Kabupaten Trenggalek.

---

## 🏛️ Identitas Aplikasi

| Properti | Nilai | Keterangan |
|---|---|---|
| **App Code** | `SIPELAPORAN` | Kode identitas aplikasi |
| **Integrasi SSO** | `SI-PLATFORM` | Tiket SSO otomatis & validasi token terpusat |
| **Frontend Framework** | `Vue 3 + Tailwind CSS` | Single Page Application (SPA) responsif |
| **Shared CDN** | `frontend-cdn@main` | Komponen Navigasi, Sidebar, & UI Terpadu |
| **Runtime** | `V8 (GAS)` | Modern JavaScript ES6+ Engine |
| **TimeZone** | `Asia/Jakarta` | WIB (Waktu Indonesia Barat) |

---

## 📦 Struktur File Sumber (`src/`)

```text
si-pelaporan/
├── 🤖 .github/workflows/deploy-gas.yml  # Auto deploy ke GAS via Clasp & Actions
├── 📁 src/
│   ├── appsscript.json                 # Manifest GAS & OAuth Scopes
│   ├── 01_ConfigAndBridge.gs           # Konfigurasi konstanta, bridge CoreLib & skema sheet
│   ├── 02_AppLogic.gs                  # Backend routing, CRUD pelaporan, verifikasi & dashboard
│   ├── 03_SeedData.gs                  # Seeder data pelaporan dummy
│   ├── 99_TestSuite.gs                 # Unit & integration test suite
│   ├── A4_Dashboard.html               # Visualisasi KPI, grafik realisasi kerja & ringkasan
│   ├── A5_Pelaporan.html               # Input & riwayat pelaporan kinerja pegawai
│   ├── A6_Analisa.html                 # Analisis capaian target kerja tahunan/bulanan
│   ├── A8_MasterData.html              # Master kategori laporan & referensi SIMPEG
│   └── Index.html                      # Layout SPA Vue 3 dengan SSO Handshake
├── .clasp.json                         # Clasp config
└── README.md                           # Dokumentasi teknis
```

---

## 📋 Fitur Utama

1. **Single Sign-On (SSO) Terpadu**:
   - Login instan via SI-PLATFORM tanpa perlu memasukkan username/password ulang.
2. **Manajemen Laporan Kinerja**:
   - Input aktivitas harian/bulanan, upload dokumen bukti dukung, dan status target.
3. **Verifikasi Atasan Langsung**:
   - Alur persetujuan laporan oleh pimpinan/atasan unit kerja dengan catatan evaluasi.
4. **Dashboard & Analitik Capaian**:
   - Grafik agregasi capaian per unit kerja dan ekspor rekapitulasi data.

---

## 🚀 Setup & Deployment

1. Buka Apps Script Editor untuk project `SI-PELAPORAN`.
2. Jalankan fungsi `seedData()` di `03_SeedData.gs` untuk menginisialisasi sheet data awal.
3. Jalankan `runTestSuite()` di `99_TestSuite.gs` untuk memastikan seluruh fungsi valid.
4. Deploy sebagai **Web App** (*Execute as: Me, Access: Anyone*).
5. Daftarkan URL Web App ke dalam tabel `applications` di database **SI-PLATFORM**.

---

## 📝 Lisensi
Dikelola oleh Pemerintah Kabupaten Trenggalek.  
Lisensi: MIT.
