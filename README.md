# SI-PELAPORAN — Pemkab Trenggalek
### Sistem Informasi Pelaporan Pegawai Terintegrasi SIMPEG

Aplikasi web modular berbasis **Google Apps Script (GAS)**, **Vue 3**, dan **Tailwind CSS** yang terintegrasi langsung dengan **Global Core Foundation v2.0** dan **Frontend Shared CDN** Pemerintah Kabupaten Trenggalek.

---

## 🏛️ Identitas Aplikasi Google Apps Script

| Properti | Nilai | Keterangan |
|---|---|---|
| **App Code** | `SIPELAPORAN` | Kode identitas aplikasi di ekosistem Pemkab Trenggalek |
| **Backend Library** | `CoreLib` (`1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO`) | Global Core Foundation v2.0 |
| **Frontend CDN** | `frontend-cdn@v2.4.0` | Shared UI Components, Modules, High-Performance Core & SWR Cache |
| **Runtime** | `V8` | Modern JavaScript Engine |
| **TimeZone** | `Asia/Jakarta` | WIB (Waktu Indonesia Barat) |

### OAuth Scopes yang Digunakan:
- `https://www.googleapis.com/auth/spreadsheets` (Akses Google Sheets DB)
- `https://www.googleapis.com/auth/drive` (Folder Evidence & Backup)
- `https://www.googleapis.com/auth/script.storage` (Script Properties & Sesi)
- `https://www.googleapis.com/auth/script.external_request` (SSO SI-Platform HTTP)
- `https://www.googleapis.com/auth/userinfo.email` & `openid` (Identitas Google)

---

## 📦 Struktur Folder Repository

```text
si-pelaporan/
│
├── 🤖 .github/
│   └── workflows/
│       └── deploy-gas.yml          # Skrip CI/CD otomatis deploy ke GAS via Google Clasp
│
├── 📁 src/                          # KODE SUMBER APLIKASI WEB APPS SCRIPT
│   ├── appsscript.json             # Manifest GAS, V8 engine, scopes, & library CoreLib
│   ├── 01_ConfigAndBridge.gs       # Bridge helper, schema header, & app config
│   ├── 02_AppLogic.gs              # Entrypoint doGet, doPost, pelaporan handlers, analytics
│   ├── 03_SeedData.gs              # Seeder data pelaporan demo
│   ├── 99_TestSuite.gs             # Automated diagnostic & regression test suite
│   ├── A4_Dashboard.html           # Partial View: Dashboard & KPI Analytics
│   ├── A5_Pelaporan.html           # Partial View: Manajemen Pelaporan & Verifikasi
│   ├── A6_Analisa.html             # Partial View: Analisa & Rekomendasi Pelaporan
│   ├── A8_MasterData.html          # Partial View: Master Data Referensi SIMPEG
│   └── Index.html                  # Template View Utama AppCore Vue 3
│
├── .clasp.json                     # Konfigurasi Clasp (target rootDir: "src")
├── .gitignore                      # Mengabaikan node_modules & credential
├── package.json                    # NPM scripts (push, pull, deploy, status)
└── README.md                       # Dokumentasi lengkap & panduan penggunaan
```

---

## 📋 Fitur Utama

- **Single Sign-On (SSO)**: Autentikasi terpusat via SI-Platform Pemkab Trenggalek tanpa password terpisah.
- **Dashboard Eksekutif**: Metrik KPI, diagram Chart.js (Pegawai per Unit, Status Jabatan), dan 5 laporan terbaru.
- **Manajemen Pelaporan (CRUD)**: Pembuatan laporan kerja (rutin, insidental, khusus, pengawasan) dan proteksi kepemilikan data.
- **Verifikasi Berjenjang**: Fitur verifikasi khusus Admin/Verifikator (`Disetujui`, `Perlu Revisi`, `Ditolak`) dengan catatan evaluasi.
- **Analisa & Rekomendasi**: Ringkasan eksekutif otomatis, distribusi status & jenis, temuan sistem, serta ekspor PDF.
- **Master Data SIMPEG**: Viewer data referensi read-only (Pegawai, Jabatan, Unit Kerja) dengan ekspor Excel dan PDF.
- **Profil Mandiri & Pengaturan**: Modul edit kontak pegawai dan konfigurasi sistem (Admin Only).

---

## 🛠️ Konfigurasi Backend (`Script Properties`)

Tambahkan properti berikut pada Google Apps Script project:

| Key | Deskripsi | Contoh Nilai |
|---|---|---|
| `APP_CODE` | Kode unik aplikasi | `SIPELAPORAN` |
| `SPREADSHEET_ID` | ID Google Sheet database aplikasi | `1a2b3c...` |
| `MASTER_SPREADSHEET_ID` | ID Google Sheet SIMPEG pusat (read-only) | `1x2y3z...` |
| `PLATFORM_API_URL` | URL Web App SI-Platform SSO | `https://script.google.com/macros/s/.../exec` |

---

## 🚀 Setup & Deployment

1. Buka Apps Script Editor di Google Workspace.
2. Hubungkan Library `CoreLib` (Script ID: `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO`).
3. Jalankan fungsi `setupApp()` di file `02_AppLogic.gs` untuk inisialisasi sheet & konfigurasi awal.
4. Jalankan `runCoreTests()` di file `99_TestSuite.gs` untuk memverifikasi fungsionalitas database dan autentikasi.
5. Deploy sebagai **Web App** (Execute as: *User accessing the web app* / *Me*, Access: *Anyone*).

---

## 🔄 CI/CD Deployment Otomatis (GitHub Actions & Clasp)

Setiap perubahan di folder `src/` yang di-push ke branch `main` akan otomatis di-deploy ke project Google Apps Script via GitHub Actions (`.github/workflows/deploy-gas.yml`).

---

## 📝 Lisensi
Dikelola oleh Pemerintah Kabupaten Trenggalek.  
Lisensi: MIT.
