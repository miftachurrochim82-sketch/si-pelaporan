# SI-PELAPORAN — Pemkab Trenggalek
### Sistem Informasi Pelaporan Kinerja Lapangan & Trantibum

Aplikasi web modern berbasis **Google Apps Script (GAS)**, **Vue 3**, dan **Tailwind CSS** untuk pelaporan kinerja operasional berkala, monitoring target penegakan peraturan daerah, dokumentasi evakuasi & pemadam kebakaran, serta verifikasi laporan berjenjang di lingkungan Pemerintah Kabupaten Trenggalek.

---

## 🏛️ Identitas Aplikasi

| Properti | Nilai | Keterangan |
|---|---|---|
| **App Code** | `SIPELAPORAN` | Kode identitas aplikasi |
| **Arsitektur Tampilan** | `2-File HTML System (Single Include)` | `Index.html` (Shell & Bootloader) + `V_Layout.html` (Seluruh Modul Tampilan) |
| **Integrasi SSO** | `SI-PLATFORM` | Tiket SSO otomatis & validasi token terpusat |
| **Frontend Framework** | `Vue 3 + Tailwind CSS` | Single Page Application (SPA) responsif |
| **Shared CDN** | `frontend-cdn@main` | Komponen Navigasi, Sidebar, Pustaka Profil & Settings |
| **Runtime** | `V8 (GAS)` | Modern JavaScript ES6+ Engine |
| **TimeZone** | `Asia/Jakarta` | WIB (Waktu Indonesia Barat) |

---

## 📦 Struktur Berkas Sumber (`src/`)

```text
si-pelaporan/
│
├── 🤖 .github/
│   └── workflows/
│       └── deploy-gas.yml          # Skrip CI/CD otomatis deploy ke GAS via Clasp
│
├── 📄 .clasp.json                  # Konfigurasi target Google Apps Script (rootDir: "src")
├── 📄 .claspignore                 # Daftar berkas yang diabaikan saat push
├── 📄 package.json & README.md     # Metadata proyek & dokumentasi teknis
├── 📁 scripts/
│   └── set-script-id.js            # Script helper konfigurasi Script ID
│
└── 📁 src/                         # SELURUH SUMBER KODE RESMI (BACKEND & FRONTEND)
    ├── appsscript.json             # Manifest GAS & OAuth Scopes
    ├── 01_ConfigAndBridge.gs       # Konfigurasi konstanta, bridge CoreLib & skema sheet
    ├── 02_AppLogic.gs              # Backend routing, CRUD pelaporan, verifikasi & dashboard
    ├── 03_SeedData.gs              # Seeder data pelaporan dummy Trantibum & Damkar
    ├── 99_TestSuite.gs             # Unit & integration test suite
    │
    ├── Index.html                  # [HTML 1] Entry point SPA Vue 3, SSO splash & single include
    └── V_Layout.html               # [HTML 2] Seluruh Modul UI (Dashboard KPI, Daftar Laporan, Analisa & Referensi)
```

---

## 📋 Fitur Utama

1. **Single Sign-On (SSO) Terpadu**:
   - Login instan via SI-PLATFORM tanpa perlu memasukkan username/password ulang.
2. **Dashboard Kinerja & Statistik Operasional**:
   - Visualisasi ringkasan laporan disetujui, menunggu verifikasi, dan distribusi jenis kegiatan operasional.
3. **Manajemen Laporan Kinerja Lapangan**:
   - Input laporan patroli trantibum, penindakan perda, operasi pemadaman kebakaran, dan kegiatan non-kebakaran.
4. **Verifikasi Atasan Berjenjang**:
   - Alur persetujuan laporan oleh pimpinan unit kerja dengan catatan tindak lanjut.
5. **Analisis Capaian Kinerja**:
   - Analisis tren pelaporan bulanan, response time penanganan kebakaran, dan temuan evaluasi kinerja.
6. **Ekspor Laporan Cepat**:
   - Pembuatan dokumen cetak dalam format **PDF (.pdf)** dan rekap spreadsheet **Excel (.xlsx)**.

---

## 📱 Panduan Deployment di Tablet / Mobile Browser

### Opsi A: Deployment Otomatis via GitHub Actions (CI/CD)
1. Buka repositori di GitHub pada peramban tablet.
2. Masuk ke menu **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Tambahkan 2 Secret:
   * `CLASPRC_JSON`: Isi konfigurasi autentikasi Clasp.
   * `CLASP_SCRIPT_ID`: ID Script Google Apps Script SI-PELAPORAN Anda.
4. Setiap ada pembaruan di branch `main`, GitHub Actions akan otomatis melakukan `clasp push --force`.

### Opsi B: Salin Manual ke Editor Google Apps Script
1. Buka proyek di [Google Apps Script Editor](https://script.google.com).
2. Buat berkas-berkas sesuai dengan struktur di folder `src/`:
   * 4 Berkas Script (`.gs`): `01_ConfigAndBridge.gs`, `02_AppLogic.gs`, `03_SeedData.gs`, `99_TestSuite.gs`.
   * 2 Berkas HTML (`.html`): `Index.html` dan `V_Layout.html`.
3. Salin kode dari repositori GitHub ke editor Apps Script.
4. Klik **Deploy** ➔ **New deployment** ➔ Pilih tipe **Web app** ➔ Akses: **Anyone**.
