# SI-PELAPORAN — Pemkab Trenggalek
### Sistem Informasi Pelaporan Pegawai Terintegrasi SIMPEG

Aplikasi web modular berbasis **Google Apps Script (GAS)**, **Vue 3**, dan **Tailwind CSS** yang terintegrasi langsung dengan **Global Core Foundation v2.0** dan **Frontend Shared CDN** Pemerintah Kabupaten Trenggalek.

---

## 🏛️ Arsitektur Ekosistem

Aplikasi ini merupakan bagian dari jaringan aplikasi terintegrasi Pemkab Trenggalek:
1. **`frontend-cdn`**: Library backend global (`CoreLib`) dan asset bersama (CSS, Shell UI, AppCore).
2. **`si-platform`**: Portal SSO & Pusat Data Master SIMPEG (Pegawai, Jabatan, Unit Kerja).
3. **`si-pelaporan` (Aplikasi ini)**: Aplikasi operasional pencatatan & verifikasi pelaporan kerja pegawai.

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

## 🚀 Setup Awal

1. Buka Apps Script Editor di Google Workspace.
2. Hubungkan Library `CoreLib` (Script ID: `1GmeYflfMpRa1iTVgFHRD6K1DMoxc9OoKqpuucPJXgNZ9XBK06O7wgDkO`).
3. Jalankan fungsi `setupApp()` di file `02_AppLogic.gs` untuk inisialisasi sheet & konfigurasi awal.
4. Deploy sebagai **Web App** (Execute as: *User accessing the web app* / *Me*, Access: *Anyone*).

---

## 📁 Struktur Berkas

```text
si-pelaporan/
├── 01_ConfigAndBridge.gs   # Bridge helper, schema header, & app config
├── 02_AppLogic.gs          # Entrypoint doGet, doPost, pelaporan handlers, analytics
├── 03_SeedData.gs          # Seeder data pelaporan demo
├── 99_TestSuite.gs         # Comprehensive automated diagnostic suite
├── A4_Dashboard.html       # Partial View: Dashboard & KPI Analytics
├── A5_Pelaporan.html       # Partial View: Manajemen Pelaporan & Verifikasi
├── A6_Analisa.html         # Partial View: Analisa & Rekomendasi Pelaporan
├── A8_MasterData.html      # Partial View: Master Data Referensi SIMPEG
├── Index.html              # Template Utama AppCore Vue 3
├── appsscript.json         # Manifest GAS & OAuth Scopes
├── package.json            # NPM Scripts & Metadata
└── README.md               # Dokumentasi
```

---

## 📝 Lisensi
Dikelola oleh Pemerintah Kabupaten Trenggalek.
Lisensi: MIT.
